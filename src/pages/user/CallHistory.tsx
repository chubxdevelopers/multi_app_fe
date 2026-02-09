import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Container,
  Chip,
  Alert,
  IconButton,
  Button,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { query } from "../../api-builder";
import { useAuth } from "../../contexts/AuthContext";

interface CallHistoryItem {
  id: number;
  title: string;
  recorded_by: string;
  created_at: string;
}

interface HistoryInsights {
  trajectory: string;
  trajectory_reasoning: string;
  section_wise_trends: Record<string, any>;
  key_improvements: string[];
  key_regressions: string[];
  coaching_focus: string;
  calls_analyzed: number;
  generated_at: string;
}

export default function CallHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<CallHistoryItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [historyInsights, setHistoryInsights] =
    useState<HistoryInsights | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await query({
        resource: "audio_recordings",
        fields: ["id", "title", "recorded_by", "created_at"],
        filters: user?.name ? { "recorded_by.eq": user.name } : {},
        sort: { created_at: "desc" },
        limit: 100,
        timeoutMs: 10000,
      });

      const rows: any[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response)
          ? (response as any)
          : [];

      setRecordings(rows);
    } catch (err: any) {
      console.warn("Failed to load call history:", err);
      setError(err?.message || "Failed to load call history");
      // Fallback: set empty array to allow UI to render
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const runHistoryAnalysis = async () => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setAnalysisSuccess(false);
      setHistoryInsights(null);

      if (!user?.name) {
        setAnalysisError("User information not available");
        return;
      }

      // Call backend history analysis endpoint
      const apiUrl = "/api/history_analysis";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recorded_by: user.name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          errorData?.detail || `Server returned ${response.status}`;
        setAnalysisError(errorMsg);
        return;
      }

      const data = await response.json();
      if (data.ok && data.history_insights) {
        setHistoryInsights(data.history_insights);
        setAnalysisSuccess(true);
        setTimeout(() => setAnalysisSuccess(false), 3000);
      } else {
        setAnalysisError("Invalid response from server");
      }
    } catch (err: any) {
      console.error("History analysis error:", err);
      setAnalysisError(err?.message || "Failed to generate history insights");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const renderHistoryInsights = (insights: HistoryInsights) => {
    if (!insights) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No historical analysis available yet
        </Typography>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        {/* Trajectory Section */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1, color: "#0c4a6e" }}
          >
            📊 Performance Trajectory
          </Typography>
          <Typography variant="body2" sx={{ pl: 2, mb: 1 }}>
            <strong>Status:</strong>{" "}
            {insights.trajectory.charAt(0).toUpperCase() +
              insights.trajectory.slice(1)}
          </Typography>
          <Typography variant="body2" sx={{ pl: 2 }}>
            <strong>Reasoning:</strong> {insights.trajectory_reasoning}
          </Typography>
        </Box>

        {/* Section-wise Trends */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1, color: "#0c4a6e" }}
          >
            📈 Section-wise Trends
          </Typography>
          {Object.entries(insights.section_wise_trends).map(
            ([sectionName, trendData]: [string, any]) => (
              <Box key={sectionName} sx={{ pl: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {sectionName.replace(/_/g, " ")}:{" "}
                  <Chip
                    label={trendData.trend}
                    size="small"
                    color={
                      trendData.trend === "improving"
                        ? "success"
                        : trendData.trend === "declining"
                          ? "error"
                          : "default"
                    }
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ pl: 2, display: "block" }}
                >
                  {trendData.reasoning}
                </Typography>
              </Box>
            ),
          )}
        </Box>

        {/* Key Improvements */}
        {insights.key_improvements && insights.key_improvements.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1, color: "#059669" }}
            >
              ✅ Key Improvements
            </Typography>
            {insights.key_improvements.map((improvement, idx) => (
              <Typography key={idx} variant="body2" sx={{ pl: 2, mb: 0.5 }}>
                • {improvement}
              </Typography>
            ))}
          </Box>
        )}

        {/* Key Regressions */}
        {insights.key_regressions && insights.key_regressions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1, color: "#dc2626" }}
            >
              ⚠️ Key Regressions
            </Typography>
            {insights.key_regressions.map((regression, idx) => (
              <Typography key={idx} variant="body2" sx={{ pl: 2, mb: 0.5 }}>
                • {regression}
              </Typography>
            ))}
          </Box>
        )}

        {/* Coaching Focus */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "#f0f9ff",
            borderRadius: 1,
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1, color: "#0c4a6e" }}
          >
            🎯 Coaching Focus
          </Typography>
          <Typography variant="body2">{insights.coaching_focus}</Typography>
        </Box>

        {/* Metadata */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2 }}
        >
          Analyzed {insights.calls_analyzed} calls | Generated:{" "}
          {new Date(insights.generated_at).toLocaleString()}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: "#6b7280" }}>
          Loading call history...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <IconButton onClick={loadHistory} color="primary">
          <RefreshIcon /> Retry
        </IconButton>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f1724" }}>
          Call History
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            startIcon={
              analyzing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
            onClick={runHistoryAnalysis}
            disabled={analyzing || loading || !recordings.length}
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              fontWeight: 600,
              px: 3,
              py: 1,
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)",
              },
              "&:disabled": {
                background: "#94a3b8",
                color: "white",
              },
            }}
          >
            {analyzing ? "Analyzing..." : "Run History Analysis"}
          </Button>
          <IconButton onClick={loadHistory} color="primary" title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {analysisSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          History analysis completed successfully! Results are shown below.
        </Alert>
      )}

      {analysisError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setAnalysisError(null)}
        >
          {analysisError}
        </Alert>
      )}

      {historyInsights ? (
        <Card
          sx={{
            border: "3px solid #3b82f6",
            background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <StarIcon sx={{ color: "#3b82f6", mr: 1, fontSize: 28 }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#0c4a6e" }}
              >
                📊 History Analysis Results
              </Typography>
            </Box>
            {renderHistoryInsights(historyInsights)}
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No history analysis yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {recordings.length > 0
              ? "Click 'Run History Analysis' above to analyze your recent calls"
              : "Historical data will appear here once calls are analyzed"}
          </Typography>
        </Card>
      )}
    </Container>
  );
}
