import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import AppsIcon from "@mui/icons-material/Apps";
import LogoutIcon from "@mui/icons-material/Logout";
import DetailsIcon from "@mui/icons-material/Details";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { query } from "../../api-builder";
import AudioRecorder from "../../components/AudioRecorder.tsx";

interface AudioRecording {
  id: number;
  title: string;
  recorded_by: string;
  recorded_by_role: string;
  audio_url: string;
  transcription: string;
  created_at: string;
  status: string;
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myRecordings, setMyRecordings] = useState<any[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [showMy, setShowMy] = useState(false);
  const [errorMy, setErrorMy] = useState("");
  const [audioSrcById, setAudioSrcById] = useState<Record<number, string>>({});
  const [audioLoadingById, setAudioLoadingById] = useState<
    Record<number, boolean>
  >({});

  console.log("User dashboard - full user object:", user);
  console.log("User uiPermissions:", user?.uiPermissions);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGetDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "recorded_by",
          "recorded_by_role",
          "transcription",
          "created_at",
        ],
        filters: {},
      });
      // Normalize response shape. api-builder send() returns parsed payload
      // The backend base_resource returns { success: true, data: rows }
      // but in some error cases send() may return a raw array or text.
      console.debug("GetDetails response:", response);
      const rows: any[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      if (!Array.isArray(rows)) {
        setError("Unexpected response shape from server");
        setRecordingsData([]);
        setShowDetails(false);
        return;
      }

      // Map the data to include user's name, email, role, team
      const mappedData = rows.map((recording: any) => ({
        id: recording.id,
        title: recording.title,
        name: recording.recorded_by,
        email: user?.email || "N/A",
        role: recording.recorded_by_role,
        team: user?.team || "N/A",
        recording_transcript:
          recording.transcription &&
          recording.transcription !== "No transcription available"
            ? recording.transcription
            : "Pending...",
        recording_timestamp: recording.created_at
          ? new Date(recording.created_at).toLocaleString()
          : "",
      }));

      setRecordingsData(mappedData);
      setShowDetails(true);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch recordings");
      console.error("Error fetching recordings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check user capabilities from JWT
  const canRecordAudio =
    user?.uiPermissions?.some((perm: any) => {
      console.log("Checking permission for audio_recording:", perm);
      return (
        perm.feature_tag === "audio_recording" ||
        perm.capability === "record_audio"
      );
    }) || false;

  const canViewTranscription =
    user?.uiPermissions?.some((perm: any) => {
      console.log("Checking permission for speech_to_text:", perm);
      return (
        perm.feature_tag === "speech_to_text" ||
        perm.capability === "view_transcription"
      );
    }) || false;

  const canSeeAppName =
    user?.uiPermissions?.some((perm: any) => {
      console.log("Checking permission for see_app_name:", perm);
      return perm.feature_tag === "see_app_name";
    }) || false;

  // Download is gated by speech_to_text feature only
  const canDownload = canViewTranscription;

  console.log("Permissions check results:", {
    canRecordAudio,
    canViewTranscription,
    canSeeAppName,
    role: user?.role,
    team: user?.team,
  });

  const handleRecordingComplete = (newRecording: AudioRecording) => {
    console.log("Recording saved:", newRecording);
    // Recording is saved, nothing else to do
  };

  const handleDownload = async (recordId: number) => {
    try {
      setError("");
      const resp = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "audio_url",
          "processed_audio",
          "audio_data",
          "created_at",
        ],
        filters: { "id.eq": recordId },
      });

      const rec = resp?.data?.[0];
      if (!rec) throw new Error("Recording not found");

      // Prefer original audio URL (audio_url). If it's not present, fall back to
      // processed_audio (new column) or legacy audio_data.
      if (rec.audio_url) {
        const link = document.createElement("a");
        link.href = rec.audio_url;
        const ts = rec.created_at
          ? new Date(rec.created_at).toISOString().replace(/[:.]/g, "-")
          : Date.now();
        const safeTitle = (rec.title || "recording").replace(
          /[^a-z0-9-_ ]/gi,
          "_"
        );
        link.download = `${safeTitle}_${ts}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (rec.processed_audio) {
        const link = document.createElement("a");
        link.href = rec.processed_audio;
        const ts = rec.created_at
          ? new Date(rec.created_at).toISOString().replace(/[:.]/g, "-")
          : Date.now();
        const safeTitle = (rec.title || "recording").replace(
          /[^a-z0-9-_ ]/gi,
          "_"
        );
        link.download = `${safeTitle}_processed_${ts}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (!rec.audio_data) {
        throw new Error("Audio not available for download");
      }

      // Legacy: audio_data is a data URL (WebM/wav). Convert and offer download.
      const dataUrl: string = rec.audio_data as string; // saved as data URL
      const response = await fetch(dataUrl);
      const webmBlob = await response.blob();
      const audioContext = new AudioContext();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      const renderedBuffer = await offlineContext.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(wavBlob);
      const ts = rec.created_at
        ? new Date(rec.created_at).toISOString().replace(/[:.]/g, "-")
        : Date.now();
      const safeTitle = (rec.title || "recording").replace(
        /[^a-z0-9-_ ]/gi,
        "_"
      );
      link.download = `${safeTitle}_${ts}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      console.error("Download failed:", err);
      setError(err?.message || "Failed to download recording");
    }
  };

  // Helper function to convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // FMT sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // chunk size
    setUint16(1); // audio format (1 = PCM)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
    setUint16(buffer.numberOfChannels * 2); // block align
    setUint16(16); // bits per sample

    // Data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // chunk size

    // Write interleaved audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleListen = async (recordId: number) => {
    try {
      if (audioSrcById[recordId]) return; // already loaded
      setAudioLoadingById((prev) => ({ ...prev, [recordId]: true }));
      // Prefer original audio URL (audio_url) which points to the original MP3
      const resp = await query({
        resource: "audio_recordings",
        fields: ["id", "audio_url", "processed_audio", "audio_data"],
        filters: { "id.eq": recordId },
      });
      const rec = resp?.data?.[0];
      if (!rec) throw new Error("Audio not available");
      const src = rec.audio_url || rec.processed_audio || rec.audio_data;
      if (!src) throw new Error("Audio not available");
      setAudioSrcById((prev) => ({ ...prev, [recordId]: src as string }));
    } catch (err: any) {
      console.error("Listen failed:", err);
      setError(err?.message || "Failed to load audio");
    } finally {
      setAudioLoadingById((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const handleLoadMyRecordings = async () => {
    setLoadingMy(true);
    setErrorMy("");
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: ["id", "title", "transcription", "status", "created_at"],
        filters: { "recorded_by.eq": user?.name || "" },
      });
      console.debug("LoadMyRecordings resp:", resp);
      const rows: any[] = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];

      if (!Array.isArray(rows)) {
        setErrorMy("Unexpected response shape from server");
        setMyRecordings([]);
        setShowMy(false);
        return;
      }

      const mapped = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        transcription:
          r.transcription && r.transcription !== "No transcription available"
            ? r.transcription
            : "Pending...",
        status: r.status || "-",
        timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : "",
      }));
      setMyRecordings(mapped);
      setShowMy(true);
    } catch (err: any) {
      console.error("Error loading my recordings:", err);
      setErrorMy(err?.message || "Failed to load recordings");
    } finally {
      setLoadingMy(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip label={`Role: ${user?.role}`} color="primary" size="small" />
            {user?.team && (
              <Chip
                label={`Team: ${user.team}`}
                color="secondary"
                size="small"
              />
            )}
            {canSeeAppName && user?.company && (
              <Chip
                icon={<AppsIcon />}
                label={`App: ${user.company}`}
                color="info"
                size="small"
              />
            )}
          </Box>
        </Box>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      {/* Feature Access Info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: "info.light" }}>
        <Typography variant="subtitle2" gutterBottom>
          Your Capabilities:
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {canRecordAudio && (
            <Chip
              icon={<MicIcon />}
              label="Record Audio"
              color="success"
              size="small"
            />
          )}
          {canViewTranscription && (
            <Chip label="View Transcriptions" color="secondary" size="small" />
          )}
          {canSeeAppName && (
            <Chip
              icon={<AppsIcon />}
              label="View App Name"
              color="info"
              size="small"
            />
          )}
          {!canRecordAudio && !canViewTranscription && !canSeeAppName && (
            <Typography variant="body2" color="text.secondary">
              No capabilities assigned to your role
            </Typography>
          )}
        </Box>
      </Paper>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Audio Recorder Section - Only for users with permission */}
        {canRecordAudio && (
          <Card>
            <CardHeader
              title="Record Audio"
              subheader="Create new audio recordings with automatic transcription"
              avatar={<MicIcon color="error" />}
            />
            <CardContent>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </CardContent>
          </Card>
        )}

        {canRecordAudio && user?.role?.toLowerCase() !== "salesman" && (
          <Card>
            <CardHeader
              title="My Recordings"
              subheader="View and download recordings you've created"
              avatar={<MicIcon color="error" />}
              action={
                <Button
                  variant="contained"
                  startIcon={
                    loadingMy ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <DetailsIcon />
                    )
                  }
                  onClick={handleLoadMyRecordings}
                  disabled={loadingMy}
                >
                  {loadingMy ? "Loading..." : "Load My Recordings"}
                </Button>
              }
            />
            <CardContent>
              {errorMy && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMy}
                </Alert>
              )}
              {showMy && myRecordings.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.100" }}>
                        <TableCell>
                          <strong>Title</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Status</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Transcription</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Timestamp</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Listen</strong>
                        </TableCell>
                        {canDownload && (
                          <TableCell align="center">
                            <strong>Download</strong>
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myRecordings.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.title || "-"}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.transcription}</TableCell>
                          <TableCell>{row.timestamp}</TableCell>
                          <TableCell align="center" style={{ minWidth: 220 }}>
                            {audioSrcById[row.id] ? (
                              <audio
                                controls
                                src={audioSrcById[row.id]}
                                style={{ width: 200 }}
                              />
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => handleListen(row.id)}
                                disabled={!!audioLoadingById[row.id]}
                              >
                                {audioLoadingById[row.id]
                                  ? "Loading..."
                                  : "Listen"}
                              </Button>
                            )}
                          </TableCell>
                          {canDownload && (
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownload(row.id)}
                              >
                                Download
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {showMy && myRecordings.length === 0 && !loadingMy && (
                <Alert severity="info">You have no recordings yet.</Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Get Details Section - Only for users with speech_to_text permission */}
        {canViewTranscription && (
          <Card>
            <CardHeader
              title="Recording Details"
              subheader="View all recordings with transcriptions"
              avatar={<DetailsIcon color="primary" />}
              action={
                <Button
                  variant="contained"
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <DetailsIcon />
                    )
                  }
                  onClick={handleGetDetails}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Get Details"}
                </Button>
              }
            />
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {showDetails && recordingsData.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.100" }}>
                        <TableCell>
                          <strong>Title</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Name</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Email</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Role</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Team</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Recording Transcript</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Recording Timestamp</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Listen</strong>
                        </TableCell>
                        {canDownload && (
                          <TableCell align="center">
                            <strong>Download</strong>
                          </TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recordingsData.map((row, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{row.title || "-"}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.role}</TableCell>
                          <TableCell>{row.team}</TableCell>
                          <TableCell>{row.recording_transcript}</TableCell>
                          <TableCell>{row.recording_timestamp}</TableCell>
                          <TableCell align="center" style={{ minWidth: 220 }}>
                            {audioSrcById[row.id] ? (
                              <audio
                                controls
                                src={audioSrcById[row.id]}
                                style={{ width: 200 }}
                              />
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => handleListen(row.id)}
                                disabled={!!audioLoadingById[row.id]}
                              >
                                {audioLoadingById[row.id]
                                  ? "Loading..."
                                  : "Listen"}
                              </Button>
                            )}
                          </TableCell>
                          {canDownload && (
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownload(row.id)}
                                disabled={!row.id}
                              >
                                Download
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {showDetails && recordingsData.length === 0 && !loading && (
                <Alert severity="info">No recordings found.</Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show message only if user has no capabilities at all */}
        {!canRecordAudio && !canViewTranscription && !canSeeAppName && (
          <Alert severity="info">
            Welcome! Your capabilities will appear here once assigned by your
            administrator.
          </Alert>
        )}
      </Box>
    </Container>
  );
}
