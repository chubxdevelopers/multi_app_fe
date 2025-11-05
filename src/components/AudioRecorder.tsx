import { useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Paper,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import SaveIcon from "@mui/icons-material/Save";
import { mutate } from "../api-builder";
import { uuidv4 } from "../api-builder/security";
import { useAuth } from "../contexts/AuthContext";

interface AudioRecorderProps {
  onRecordingComplete: (recording: any) => void;
}

export default function AudioRecorder({
  onRecordingComplete,
}: AudioRecorderProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      setError("");
      setSuccess("");
      setTranscription("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Initialize Speech Recognition API
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscription((prev) => prev + finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        console.warn("Speech Recognition API not supported in this browser");
        setSpeechSupported(false);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Stop speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError("Failed to access microphone. Please grant permission.");
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const saveRecording = async () => {
    if (!audioBlob || !title.trim()) {
      setError("Please provide a title for the recording");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const readFileAsDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read audio data"));
          }
        };
        reader.onerror = () =>
          reject(new Error("Failed to process audio file"));
        reader.readAsDataURL(blob);
      });

    try {
      const base64Audio = await readFileAsDataUrl(audioBlob);

      // Save to database via api-builder
      const idempotencyKey = uuidv4();

      const response = await mutate({
        resource: "audio_recordings",
        fields: ["id", "title", "audio_url", "recorded_by", "created_at"],
        data: {
          title: title.trim(),
          audio_data: base64Audio,
          recorded_by: user?.name || "Unknown",
          recorded_by_role: user?.role || "user",
          duration_seconds: recordingTime,
          status: "completed",
          transcription:
            transcription && transcription.trim() ? transcription.trim() : null,
        },
        // audio processing (ffmpeg) can be slow; allow more time before client times out
        timeoutMs: 120000,
        idempotencyKey,
      });

      setSuccess("Recording saved successfully!");
      setTitle("");
      setAudioBlob(null);
      setRecordingTime(0);

      if (onRecordingComplete) {
        onRecordingComplete(response);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save recording");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {speechSupported === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Live transcription is not supported in this browser. Transcription
          will be processed later (if available on the server).
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Recording Controls */}
      <Box sx={{ mb: 3 }}>
        {!isRecording && !audioBlob && (
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<MicIcon />}
            onClick={startRecording}
            fullWidth
          >
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <MicIcon
                color="error"
                sx={{ mr: 1, animation: "pulse 1.5s infinite" }}
              />
              <Typography variant="h6" color="error">
                Recording... {formatTime(recordingTime)}
              </Typography>
            </Box>
            <LinearProgress color="error" sx={{ mb: 2 }} />

            {/* Live Transcription */}
            {transcription && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  Live Transcription:
                </Typography>
                <Typography variant="body2">{transcription}</Typography>
              </Paper>
            )}

            <Button
              variant="contained"
              color="inherit"
              size="large"
              startIcon={<StopIcon />}
              onClick={stopRecording}
              fullWidth
            >
              Stop Recording
            </Button>
          </Box>
        )}

        {audioBlob && !isRecording && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Recording Complete ({formatTime(recordingTime)})
            </Typography>

            {/* Audio Preview */}
            <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                style={{ width: "100%" }}
              />
            </Box>

            {/* Transcription Preview */}
            {transcription && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: "info.light" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  Transcription:
                </Typography>
                <Typography variant="body2">{transcription}</Typography>
              </Paper>
            )}

            {/* Title Input */}
            <TextField
              fullWidth
              label="Recording Title"
              placeholder="e.g., Customer Call - John Doe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            {/* Save/Discard Buttons */}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={
                  saving ? <CircularProgress size={20} /> : <SaveIcon />
                }
                onClick={saveRecording}
                disabled={saving || !title.trim()}
                fullWidth
              >
                {saving ? "Saving..." : "Save Recording"}
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  setAudioBlob(null);
                  setTitle("");
                  setRecordingTime(0);
                }}
                disabled={saving}
              >
                Discard
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
}
