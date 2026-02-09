import React, { useEffect, useState } from "react";
import "../../styles/pages/audio-review.css";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../../../shared/services/apiClient";
import { Box, CircularProgress } from "@mui/material";

type AudioRecord = {
  id: number;
  title?: string;
  audio_url?: string | null;
  processed_url?: string | null;
  processed_audio?: string | null;
  new_tran?: string | null;
  transcription?: string | null;
  transcript?: string | null;
};

export default function AudioReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<AudioRecord | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribeDebug, setTranscribeDebug] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!id) throw new Error("Missing id parameter");
        setLoading(true);
        // backend debug endpoint that returns the audio_recordings row
        const resp = await apiGet(`/api/query/v1/debug/audio/${id}`);
        if (!mounted) return;
        if (!resp || !resp.success) {
          setError((resp && resp.error) || "Failed to fetch record");
          setRecord(null);
        } else {
          setRecord(resp.record || null);
        }
      } catch (e: any) {
        setError(e && e.message ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const transcriptionText =
    (transcriptions && transcriptions.length && transcriptions[0].text) ||
    (record &&
      (record.transcript || record.transcription || record.new_tran)) ||
    null;

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  if (error)
    return <div style={{ padding: 16, color: "red" }}>Error: {error}</div>;
  if (!record) return <div style={{ padding: 16 }}>No record found</div>;

  const runTranscription = async () => {
    setTranscribing(true);
    setTranscribeError(null);
    setTranscribeDebug(null);
    try {
      const tres = await apiPost("/api/query/v1/transcribe", {
        audio_id: record.id,
      });
      if (tres && tres.success) {
        if (tres.originalAudioUrl)
          setRecord((r) =>
            r ? { ...r, audio_url: tres.originalAudioUrl } : r
          );
        if (tres.processedAudioUrl)
          setRecord((r) =>
            r
              ? {
                  ...r,
                  processed_audio: tres.processedAudioUrl,
                  processed_url: tres.processedAudioUrl,
                }
              : r
          );
        if (tres.transcript)
          setRecord((r) => (r ? { ...r, new_tran: tres.transcript } : r));
        if (tres.transcriptions && Array.isArray(tres.transcriptions))
          setTranscriptions(tres.transcriptions);
        if (tres.debug) setTranscribeDebug(tres.debug);
      } else {
        setTranscribeError(tres?.error || "Transcription failed");
        setTranscribeDebug(tres?.debug || null);
      }
    } catch (e: any) {
      console.warn("Transcription request failed:", e);
      setTranscribeError((e && e.message) || String(e));
    }
    setTranscribing(false);
  };

  return (
    <div className="card fade-in audio-card">
      <h2>Audio Review — ID {record.id}</h2>
      <div className="muted" style={{ marginBottom: 12 }}>
        <strong>Title:</strong> {record.title || "(no title)"}
      </div>

      <div
        style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Original Audio</strong>
          </div>
          {record.audio_url ? (
            <audio controls src={record.audio_url} className="audio-audio" />
          ) : (
            <div>No original audio URL available</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Processed Audio</strong>
          </div>
          {record.processed_url || record.processed_audio ? (
            <audio
              controls
              src={record.processed_url || record.processed_audio || undefined}
              className="audio-audio"
            />
          ) : (
            <div>No processed audio URL available</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <h3>Transcription</h3>
        {!transcriptionText && (
          <div style={{ marginBottom: 8 }}>
            <button
              className="transcribe-btn"
              onClick={runTranscription}
              disabled={transcribing}
            >
              {transcribing ? "Transcribing..." : "Run Transcription"}
            </button>
          </div>
        )}
        {transcriptionText ? (
          <pre className="transcript-pre" style={{ whiteSpace: "pre-wrap" }}>
            {transcriptionText}
          </pre>
        ) : (
          <div>No transcription found for this audio.</div>
        )}
        {transcribeError && (
          <div style={{ marginTop: 12, color: "crimson" }}>
            <strong>Transcription error:</strong> {transcribeError}
            {transcribeDebug && (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#111",
                  color: "#eee",
                  padding: 12,
                  marginTop: 8,
                }}
              >
                {JSON.stringify(transcribeDebug, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  );
}
