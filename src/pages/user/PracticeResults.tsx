import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../../utils/axiosConfig";

interface ScoringMetric {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

interface PracticeResult {
  id: string;
  brand: string;
  recordingDate: string;
  overallScore: number;
  status: string;
  metrics: {
    modelCommunication: { score: number; maxScore: number };
    languageQuality: { score: number; maxScore: number };
    medicalAccuracy: { score: number; maxScore: number };
    closingOrientation: { score: number; maxScore: number };
  };
  detailedSummary: {
    [key: string]: string;
  };
  keyFeedback: string[];
}

export default function PracticeResults() {
  const navigate = useNavigate();
  const { company, app, recordingId } = useParams<{
    company: string;
    app: string;
    recordingId: string;
  }>();
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [recordingId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch results from backend
      const response = await api.get(
        `/api/query/v1/practice_result/${recordingId}`
      );

      if (response.data) {
        setResult(response.data);
      } else {
        setError("Failed to load practice results");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load practice results");
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoringMetrics = (): ScoringMetric[] => {
    if (!result) return [];

    return [
      {
        name: "Model Communication Compliance",
        score: result.metrics.modelCommunication.score,
        maxScore: result.metrics.modelCommunication.maxScore,
        color: "#10b981",
      },
      {
        name: "Language Quality & Communication Clarity",
        score: result.metrics.languageQuality.score,
        maxScore: result.metrics.languageQuality.maxScore,
        color: "#10b981",
      },
      {
        name: "Medical / Scientific Accuracy",
        score: result.metrics.medicalAccuracy.score,
        maxScore: result.metrics.medicalAccuracy.maxScore,
        color: "#10b981",
      },
      {
        name: "Closing & Action Orientation",
        score: result.metrics.closingOrientation.score,
        maxScore: result.metrics.closingOrientation.maxScore,
        color:
          result.metrics.closingOrientation.score /
            result.metrics.closingOrientation.maxScore >=
          0.75
            ? "#10b981"
            : "#f59e0b",
      },
    ];
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 60) return "Needs Coaching";
    return "Needs Improvement";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Excellent":
        return "#10b981";
      case "Good":
        return "#3b82f6";
      case "Needs Coaching":
        return "#fbbf24";
      default:
        return "#ef4444";
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading results...</Typography>
      </Container>
    );
  }

  if (error || !result) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "No results found"}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/${company}/${app}/dashboard`)}
        >
          Go Back to Recording
        </Button>
      </Container>
    );
  }

  const metrics = getScoringMetrics();

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", py: "18px" }}>
      <Container
        maxWidth="sm"
        sx={{
          px: "18px",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          color: "#111827",
        }}
      >
        {/* Header */}
        <Box sx={{ mb: "16px" }}>
          <Typography
            sx={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.3 }}
          >
            {result.brand} Practice Results
          </Typography>
          <Typography
            sx={{
              fontSize: "13px",
              color: "#6b7280",
              mt: "4px",
              lineHeight: 1.5,
            }}
          >
            Analysis and feedback on your performance
          </Typography>
        </Box>

        {/* Scoring Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            mb: "20px",
          }}
        >
          {metrics.map((metric, idx) => {
            const percent = (metric.score / metric.maxScore) * 100;
            const barColor =
              percent >= 70 ? "#22c55e" : percent >= 50 ? "#d97706" : "#ef4444";
            return (
              <Card
                key={idx}
                elevation={0}
                sx={{
                  p: "12px 14px",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  bgcolor: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 500,
                    color: "#111827",
                    fontSize: "13px",
                    mb: "8px",
                    lineHeight: 1.35,
                  }}
                >
                  {metric.name}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#111827",
                    fontSize: "18px",
                    mb: "10px",
                  }}
                >
                  {metric.score} / {metric.maxScore}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: "#e5e7eb",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: barColor,
                      borderRadius: 999,
                    },
                  }}
                />
              </Card>
            );
          })}
        </Box>

        {/* Overall Score */}
        <Card
          elevation={0}
          sx={{
            p: "18px 16px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            bgcolor: "#f9fafb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            mb: "20px",
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              color: "#6b7280",
              fontWeight: 600,
              fontSize: "13px",
              mb: "8px",
            }}
          >
            Overall Score
          </Typography>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "44px",
              color: "#111827",
              lineHeight: 1.1,
            }}
          >
            {result.overallScore}
          </Typography>
          <Chip
            label={getScoreStatus(result.overallScore)}
            sx={{
              mt: "12px",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              fontWeight: 600,
              fontSize: "13px",
              px: 1.5,
              height: "24px",
              borderRadius: 999,
            }}
          />
        </Card>

        {/* Detailed Summary */}
        <Typography
          sx={{
            fontWeight: 700,
            color: "#111827",
            mb: "12px",
            fontSize: "18px",
          }}
        >
          Detailed Summary
        </Typography>
        <Box sx={{ mb: "20px" }}>
          {Object.entries(result.detailedSummary).map(([key, value], idx) => (
            <Accordion
              key={idx}
              elevation={0}
              disableGutters
              sx={{
                bgcolor: "#fff",
                borderRadius: "14px",
                mb: "10px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon sx={{ fontSize: "20px", color: "#9ca3af" }} />
                }
                sx={{ px: "14px" }}
              >
                <Box>
                  <Typography
                    sx={{ fontWeight: 700, color: "#111827", fontSize: "15px" }}
                  >
                    {key}
                  </Typography>
                  <Typography
                    sx={{ color: "#6b7280", fontSize: "13px", mt: "2px" }}
                  >
                    {metricLabel(idx, metrics)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: "14px", pb: "14px" }}>
                <Typography
                  sx={{ color: "#111827", lineHeight: 1.6, fontSize: "14px" }}
                >
                  {value}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* Key Feedback */}
        <Typography
          sx={{
            fontWeight: 700,
            color: "#111827",
            mb: "12px",
            fontSize: "18px",
          }}
        >
          Key Feedback
        </Typography>
        <Card
          elevation={0}
          sx={{
            p: "16px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            bgcolor: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            mb: "20px",
          }}
        >
          {result.keyFeedback.map((feedback, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: "10px", mb: "12px" }}>
              <Typography
                sx={{ color: "#9ca3af", fontWeight: 700, fontSize: "13px" }}
              >
                •
              </Typography>
              <Typography
                sx={{ color: "#111827", lineHeight: 1.6, fontSize: "13px" }}
              >
                {feedback}
              </Typography>
            </Box>
          ))}
        </Card>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            mb: "12px",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(`/${company}/${app}/dashboard`)}
            sx={{
              height: "48px",
              fontSize: "15px",
              fontWeight: 700,
              borderRadius: "12px",
              textTransform: "none",
              boxShadow: "none",
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(`/${company}/${app}/my-progress`)}
            sx={{
              height: "48px",
              fontSize: "15px",
              fontWeight: 700,
              borderRadius: "12px",
              textTransform: "none",
              borderColor: "#d1d5db",
              color: "#4b5563",
              backgroundColor: "#fff",
              "&:hover": {
                borderColor: "#9ca3af",
                backgroundColor: "#f9fafb",
              },
            }}
          >
            My Progress
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

// Helper for metric labeling in summary list
function metricLabel(idx: number, metrics: ScoringMetric[]) {
  const metric = metrics[idx];
  if (!metric) return "";
  return `${metric.score} / ${metric.maxScore} points`;
}
