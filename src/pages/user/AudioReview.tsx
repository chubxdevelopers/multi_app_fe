import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiPost } from "../../shared/services/apiClient";

type AudioRecord = {
  id: number;
  title?: string;
  audio_url?: string;
  processed_audio?: string;
  new_tran?: string;
  transcription?: string;
  transcript?: string;
};

export default function AudioReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AudioRecord | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        // Fetch audio_recordings row
        const payload = {
          operation: "query",
          resource: "audio_recordings",
          filters: { id: Number(id) },
        } as any;
        const resp = await apiPost("/api/query/v1/base_resource", payload);
        if (!mounted) return;
        if (!resp || !resp.success) throw new Error(resp?.error || "Failed to load");
        const row = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        setRecord(row || null);

        // Fetch any transcription rows related to this audio id
        try {
          const tpayload = {
            operation: "query",
            resource: "audio_transcription",
            filters: { audio_id: Number(id) },
          } as any;
          const tresp = await apiPost("/api/query/v1/base_resource", tpayload);
          if (tresp && tresp.success && Array.isArray(tresp.data)) {
            setTranscriptions(tresp.data || []);
          }
        } catch (te) {
          // ignore transcription fetch errors but keep record
          console.warn("Failed to fetch transcriptions:", te);
        }

        setLoading(false);
      } catch (e: any) {
        console.error("Failed to load audio record:", e);
        setError(e?.message || String(e));
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>Error: {error}</div>;
  if (!record) return <div style={{ padding: 16 }}>No record found</div>;

  const transcriptionText =
    record.new_tran || record.transcription || record.transcript ||
    (transcriptions.length ? transcriptions[0].transcription || transcriptions[0].text || JSON.stringify(transcriptions[0]) : "");

  return (
    <div style={{ padding: 20 }}>
      <h2>Audio Review — ID {record.id}</h2>
      <div style={{ marginBottom: 12 }}>
        <strong>Title:</strong> {record.title || "(no title)"}
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <div>
          <div style={{ marginBottom: 8 }}><strong>Original Audio</strong></div>
          {record.audio_url ? (
            <audio controls src={record.audio_url} style={{ width: 360 }} />
          ) : (
            <div>No original audio URL available</div>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 8 }}><strong>Processed Audio</strong></div>
          {record.processed_audio ? (
            <audio controls src={record.processed_audio} style={{ width: 360 }} />
          ) : (
            <div>No processed audio URL available</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <h3>Transcription</h3>
        {transcriptionText ? (
          <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12 }}>{transcriptionText}</pre>
        ) : (
          <div>No transcription found for this audio.</div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
}
