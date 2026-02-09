import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {} from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { query } from "../../api-builder";

interface PerformanceOverview {
  averageScore: number;
  latestScore: number;
  improvement: number;
  totalRecordings: number;
}

interface RecordingHistory {
  id: string;
  brand: string;
  recordingDate: string;
  score: number;
  metrics: {
    modelCommunication: { score: number; maxScore: number };
    languageQuality: { score: number; maxScore: number };
    medicalAccuracy: { score: number; maxScore: number };
    closingOrientation: { score: number; maxScore: number };
  };
}

interface MyProgressData {
  overview: PerformanceOverview;
  history: RecordingHistory[];
  feedback: string;
}

export default function MyProgress() {
  const [data, setData] = useState<MyProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recordings data from backend using the same query as Dashboard
      const response = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "created_at",
          "score",
          "analysis",
          "keywords_of_improvement",
        ],
        sorts: [{ field: "created_at", direction: "desc" }],
      });

      const recordings: any[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response as any)
        ? (response as any)
        : [];

      if (recordings.length > 0) {
        // Calculate overview statistics
        const totalScore = recordings.reduce(
          (sum, r) => sum + (r.score || 0),
          0
        );
        const avgScore = Math.round(totalScore / recordings.length);
        const latestScore = recordings[0]?.score || 0;
        const oldestScore = recordings[recordings.length - 1]?.score || 0;
        const improvement = latestScore - oldestScore;

        // Transform recordings to match the expected format
        const history: RecordingHistory[] = recordings.map((rec) => {
          let metrics = {
            modelCommunication: { score: 0, maxScore: 40 },
            languageQuality: { score: 0, maxScore: 25 },
            medicalAccuracy: { score: 0, maxScore: 15 },
            closingOrientation: { score: 0, maxScore: 20 },
          };

          if (rec.analysis) {
            try {
              const analysis =
                typeof rec.analysis === "string"
                  ? JSON.parse(rec.analysis)
                  : rec.analysis;
              const sections = analysis.sections || analysis;

              metrics = {
                modelCommunication: {
                  score:
                    sections.model_communication_compliance?.score ??
                    sections.modelCommunication?.score ??
                    0,
                  maxScore: 40,
                },
                languageQuality: {
                  score:
                    sections.language_quality_clarity?.score ??
                    sections.languageQuality?.score ??
                    0,
                  maxScore: 25,
                },
                medicalAccuracy: {
                  score:
                    sections.medical_scientific_accuracy?.score ??
                    sections.medicalAccuracy?.score ??
                    0,
                  maxScore: 15,
                },
                closingOrientation: {
                  score:
                    sections.closing_action_orientation?.score ??
                    sections.closingAction?.score ??
                    0,
                  maxScore: 20,
                },
              };
            } catch (e) {
              console.warn("Failed to parse analysis:", e);
            }
          }

          return {
            id: String(rec.id),
            brand: rec.title || "Brand",
            recordingDate: rec.created_at,
            score: rec.score || 0,
            metrics,
          };
        });

        setData({
          overview: {
            averageScore: avgScore,
            latestScore,
            improvement,
            totalRecordings: recordings.length,
          },
          history,
          feedback:
            "Excellent progress! Your scores have improved significantly over the past recordings.",
        });
      } else {
        setData({
          overview: {
            averageScore: 0,
            latestScore: 0,
            improvement: 0,
            totalRecordings: 0,
          },
          history: [],
          feedback: "No recordings yet. Start practicing to see your progress!",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load progress data");
      console.error("Error loading progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { status: "Excellent", color: "#10b981" };
    if (score >= 70) return { status: "Good", color: "#3b82f6" };
    if (score >= 60) return { status: "Needs Coaching", color: "#fbbf24" };
    return { status: "Needs Improvement", color: "#ef4444" };
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading your progress...</Typography>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "No progress data found"}
        </Alert>
      </Container>
    );
  }

  const { overview, history, feedback } = data;
  const scoreStatus = getScoreStatus(overview.latestScore);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: 700, color: "var(--color-text)" }}
        >
          My Progress
        </Typography>
      </Box>

      {/* Performance Overview Card */}
      <Card
        sx={{
          p: 3,
          backgroundColor: "#f0f4ff",
          border: "1px solid #e0e7ff",
          borderRadius: "12px",
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <TrendingUpIcon sx={{ color: "#10b981", fontSize: 24 }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "var(--color-text)" }}
          >
            Performance Overview
          </Typography>
        </Box>

        <Box
          sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "var(--color-text-secondary)",
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Average Score
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "var(--color-text)" }}
            >
              {overview.averageScore}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "var(--color-text-secondary)",
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Latest Score
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: scoreStatus.color }}
              >
                {overview.latestScore}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "var(--color-text-secondary)",
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Improvement
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <TrendingUpIcon sx={{ color: "#10b981", fontSize: 20 }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "#10b981",
                }}
              >
                +{overview.improvement}
              </Typography>
            </Box>
          </Box>
        </Box>

        {feedback && (
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e0e7ff" }}>
            <Typography
              variant="body2"
              sx={{
                color: "var(--color-text)",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              {feedback}
            </Typography>
          </Box>
        )}
      </Card>

      {/* Recording History */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: "var(--color-text)",
          mb: 2,
        }}
      >
        Recording History
      </Typography>

      <Box sx={{ mb: 4 }}>
        {history.length === 0 ? (
          <Alert>No recordings found. Start your first practice session!</Alert>
        ) : (
          history.map((record, idx) => {
            const recordStatus = getScoreStatus(record.score);
            return (
              <Accordion key={idx}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      pr: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {new Date(record.recordingDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}{" "}
                        •{" "}
                        <span style={{ color: "var(--color-primary)" }}>
                          {record.brand}
                        </span>
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: recordStatus.color,
                      }}
                    >
                      {record.score}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            mb: 0.5,
                          }}
                        >
                          Model Communication
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {record.metrics.modelCommunication.score} /{" "}
                            {record.metrics.modelCommunication.maxScore}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            (record.metrics.modelCommunication.score /
                              record.metrics.modelCommunication.maxScore) *
                            100
                          }
                          sx={{
                            height: 4,
                            borderRadius: "2px",
                            backgroundColor: "#e5e7eb",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "#3b82f6",
                              borderRadius: "2px",
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            mb: 0.5,
                          }}
                        >
                          Language Quality
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {record.metrics.languageQuality.score} /{" "}
                            {record.metrics.languageQuality.maxScore}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            (record.metrics.languageQuality.score /
                              record.metrics.languageQuality.maxScore) *
                            100
                          }
                          sx={{
                            height: 4,
                            borderRadius: "2px",
                            backgroundColor: "#e5e7eb",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "#3b82f6",
                              borderRadius: "2px",
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            mb: 0.5,
                          }}
                        >
                          Medical Accuracy
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {record.metrics.medicalAccuracy.score} /{" "}
                            {record.metrics.medicalAccuracy.maxScore}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            (record.metrics.medicalAccuracy.score /
                              record.metrics.medicalAccuracy.maxScore) *
                            100
                          }
                          sx={{
                            height: 4,
                            borderRadius: "2px",
                            backgroundColor: "#e5e7eb",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "#3b82f6",
                              borderRadius: "2px",
                            },
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            mb: 0.5,
                          }}
                        >
                          Closing & Action
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {record.metrics.closingOrientation.score} /{" "}
                            {record.metrics.closingOrientation.maxScore}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            (record.metrics.closingOrientation.score /
                              record.metrics.closingOrientation.maxScore) *
                            100
                          }
                          sx={{
                            height: 4,
                            borderRadius: "2px",
                            backgroundColor: "#e5e7eb",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: "#3b82f6",
                              borderRadius: "2px",
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>

      {/* Back button removed; use the global sub-header Back */}
    </Container>
  );
}
