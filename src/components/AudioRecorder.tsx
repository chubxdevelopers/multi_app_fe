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
import { useNavigate } from "react-router-dom";
import { uuidv4 } from "../api-builder/security";
import { useAuth } from "../contexts/AuthContext";

interface AudioRecorderProps {
  onRecordingComplete: (recording: any) => void;
}

export default function AudioRecorder({
  onRecordingComplete,
}: AudioRecorderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const origStreamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      setError("");
      setSuccess("");
      setTranscription("");
      // Ensure getUserMedia is available (must be served over HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Microphone access is not available. Open the app on https or localhost and ensure your browser supports getUserMedia."
        );
        console.error("navigator.mediaDevices.getUserMedia is not available");
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: false,
          channelCount: 1,
          sampleRate: 48000,
        } as any,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (getErr: any) {
        // Provide a clearer message for permission or insecure-context errors
        console.error("getUserMedia error:", getErr);
        if (getErr && getErr.name === "NotAllowedError") {
          setError("Microphone permission denied. Please allow microphone access in your browser.");
        } else if (getErr && getErr.name === "NotFoundError") {
          setError("No microphone found. Please attach a microphone and try again.");
        } else if (getErr && getErr.message && getErr.message.includes("Only secure origins are allowed")) {
          setError("Microphone access requires a secure context (https) or localhost. Open the app at http://localhost:5173 or use https.");
        } else {
          setError("Failed to access microphone. Please grant permission or check your browser settings.");
        }
        return;
      }
      origStreamRef.current = stream;

      // Create audio context and simple processing chain (gain + highpass)
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 48000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const gainNode = audioCtx.createGain();
      // Gentle boost; avoid aggressive gain to prevent clipping
      gainNode.gain.value = 1.5;

      const hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 120; // remove low rumble

      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;

      // Connect chain: source -> gain -> highpass -> dest
      source.connect(gainNode);
      gainNode.connect(hp);
      hp.connect(dest);

      // Use the processed stream for MediaRecorder
      const processedStream = dest.stream;
      const mediaRecorder = new MediaRecorder(processedStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

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
        // stop original tracks
        try {
          origStreamRef.current?.getTracks().forEach((track) => track.stop());
        } catch (e) {}
        // close audio context
        try {
          audioContextRef.current?.close();
        } catch (e) {}
        if (timerRef.current) {
          clearInterval(timerRef.current);
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

      setAudioBlob(null);
      setRecordingTime(0);

      if (onRecordingComplete) {
        onRecordingComplete(response);
      }

      // Navigate to review page if we can determine the new id
      try {
        const serverRow = Array.isArray(response?.data)
          ? response.data[0]
          : response?.data;
        const newId = serverRow?.id || serverRow?.insertId || serverRow?.ID;
        if (newId) {
          // compute company/app slugs from pathname if present
          const parts = window.location.pathname.split("/").filter(Boolean);
          const company = parts[0] || "";
          const app = parts[1] || "";
          const base = company && app ? `/${company}/${app}` : "";
          navigate(`${base}/audio/${newId}`);
        }
      } catch (navErr) {
        console.warn("Could not navigate to audio review page:", navErr);
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
      {/* Realtime transcription removed; server-side transcription will be used if available. */}
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

            {/* No realtime transcription (disabled) */}

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

            {/* Transcription disabled */}

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
