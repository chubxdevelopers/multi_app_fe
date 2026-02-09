import { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Card,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api, { API_HOST } from "../../utils/axiosConfig";

type RecordingRow = {
  id: number;
  title?: string;
  created_at?: string;
  processed_url?: string;
  audio_url?: string;
  status?: string;
  duration_seconds?: number;
};

export default function PastRecordings() {
  const navigate = useNavigate();
  const { company, app } = useParams<{ company: string; app: string }>();
  const [rows, setRows] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(
        `${API_HOST}/api/query/v1/base_resource`,
        {
          operation: "query",
          resource: "audio_recordings",
          fields: [
            "id",
            "title",
            "created_at",
            "processed_url",
            "audio_url",
            "status",
            "duration_seconds",
          ],
          orderBy: [{ field: "created_at", direction: "DESC" }],
          pagination: { limit: 20 },
        }
      );

      const d = response?.data;
      const dataRows: RecordingRow[] = Array.isArray(d)
        ? d
        : Array.isArray(d?.data)
        ? d.data
        : [];
      setRows(dataRows);
    } catch (err: any) {
      setError(err?.message || "Failed to load recordings");
      console.error("Load recordings error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: 700, color: "var(--color-text)" }}
        >
          Past Recordings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No recordings found.</Alert>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
          {rows.map((r) => (
            <Card key={r.id} sx={{ p: 2, border: "1px solid #e5e7eb" }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>
                {r.title || `Recording #${r.id}`}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "var(--color-text-secondary)", mb: 1 }}
              >
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </Typography>
              {(r.processed_url || r.audio_url) && (
                <audio
                  controls
                  src={r.processed_url || r.audio_url || undefined}
                  style={{ width: "100%" }}
                />
              )}
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate(`/${company}/${app}/practice-results/${r.id}`)
                  }
                >
                  View Analysis
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
