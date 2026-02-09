import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Card,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useLocation, useParams } from "react-router-dom";
import { query } from "../../api-builder";

type Detail = {
  id: number;
  title?: string;
  created_at?: string;
  audio_url?: string | null;
  processed_url?: string | null;
  transcription?: string | null;
  analysis?: string | null;
  score?: number | null;
  keywords_of_improvement?: string | null;
  medicine?: string | null;
};

type ScoreSection = {
  score: number;
  max: number;
  met: string[];
  missed: string[];
};

function normalizeSections(rawSections: any): Record<string, ScoreSection> {
  const result: Record<string, ScoreSection> = {};

  // Section key mapping from backend PascalCase to frontend snake_case
  const sectionKeyMap: Record<string, string> = {
    Model_Communication_Compliance: "model_communication_compliance",
    Language_Tonality: "language_quality_clarity",
    Medical_Scientific_Accuracy: "medical_scientific_accuracy",
    Closing_Action_Orientation: "closing_action_orientation",
  };

  for (const [sectionKey, sectionValue] of Object.entries(rawSections || {})) {
    const sec: any = sectionValue;
    const normalizedKey = sectionKeyMap[sectionKey] || sectionKey;

    // Try to get the total score from various possible fields
    const sectionScore = sec.total ?? sec.score ?? 0;

    let met: string[] = [];
    let missed: string[] = [];

    // Handle new schema: subsections with positive/negative fields
    for (const [subKey, subValue] of Object.entries(sec)) {
      if (subKey === "total" || subKey === "score") continue;
      if (typeof subValue === "object" && subValue !== null) {
        const sub: any = subValue;

        // Extract positive items as "met"
        if (
          sub.positive &&
          typeof sub.positive === "string" &&
          sub.positive.trim()
        ) {
          met.push(sub.positive.trim());
        }

        // Extract negative items as "missed"
        if (
          sub.negative &&
          typeof sub.negative === "string" &&
          sub.negative.trim()
        ) {
          missed.push(sub.negative.trim());
        }
      }
    }

    result[normalizedKey] = {
      score: sectionScore,
      max: getMaxForSection(normalizedKey),
      met,
      missed,
    };
  }

  return result;
}

function getMaxForSection(sectionKey: string): number {
  const maxValues: Record<string, number> = {
    model_communication_compliance: 30,
    language_quality_clarity: 25,
    medical_scientific_accuracy: 25,
    closing_action_orientation: 20,
  };
  return maxValues[sectionKey] || 0;
}

export default function AnalysisDetail() {
  const location = useLocation();
  const { company, app, id } = useParams<{
    company: string;
    app: string;
    id: string;
  }>();

  const prefetch = (location.state as any)?.prefetch as Detail | undefined;
  const [loading, setLoading] = useState(!prefetch);
  const [error, setError] = useState<string>("");
  const [rec, setRec] = useState<Detail | null>(prefetch || null);

  // Scorecard state
  const [score, setScore] = useState(0);
  const [label, setLabel] = useState("");
  const [sections, setSections] = useState<Record<string, ScoreSection> | null>(
    null,
  );
  const [improvementPlan, setImprovementPlan] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      if (!prefetch) setLoading(true);
      setError("");
      try {
        const resp = await query({
          resource: "audio_recordings",
          fields: [
            "id",
            "title",
            "created_at",
            "audio_url",
            "processed_url",
            "transcription",
            "analysis",
            "score",
            "keywords_of_improvement",
            "medicine",
          ],
          filters: { "id.eq": Number(id) },
        });
        const rows: any[] = Array.isArray((resp as any)?.data)
          ? (resp as any).data
          : Array.isArray(resp as any)
            ? (resp as any)
            : [];

        if (mounted) {
          const record = rows[0] || null;
          setRec(record);

          // Parse analysis and bind to scorecard state
          if (record?.analysis) {
            try {
              const analysisObj =
                typeof record.analysis === "string"
                  ? JSON.parse(record.analysis)
                  : record.analysis;

              setScore(analysisObj.overall_score || 0);
              setLabel(analysisObj.overall_label || "");
              setSections(normalizeSections(analysisObj.sections));
              setImprovementPlan(analysisObj.summary?.improvement_areas || []);
            } catch (e) {
              console.warn("Failed to parse analysis JSON:", e);
              setScore(record.score || 0);
            }
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load analysis");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, prefetch]);

  // Back navigation handled by global AppShell Back button

  if (loading)
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );

  if (error)
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );

  if (!rec)
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Recording not found.</Alert>
      </Container>
    );

  const metricDefs = [
    {
      key: "model_communication_compliance",
      title: "Model Communication Compliance",
    },
    {
      key: "language_quality_clarity",
      title: "Language Quality & Communication Clarity",
    },
    {
      key: "medical_scientific_accuracy",
      title: "Medical / Scientific Accuracy",
    },
    {
      key: "closing_action_orientation",
      title: "Closing & Action Orientation",
    },
  ];

  return (
    <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", py: "18px" }}>
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
            sx={{
              fontSize: "20px",
              fontWeight: 700,
              lineHeight: 1.3,
              color: "#111827",
            }}
          >
            {rec.title || `Recording #${rec.id}`} Practice Results
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

        {/* Score Grid */}
        {sections && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                mb: "20px",
              }}
            >
              {metricDefs.map((m) => {
                const sec = sections[m.key] as ScoreSection;
                if (!sec) return null;
                const percent = (sec.score / sec.max) * 100;
                const barColor =
                  percent >= 70
                    ? "#22c55e"
                    : percent >= 50
                      ? "#d97706"
                      : "#ef4444";
                return (
                  <Card
                    key={m.key}
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
                      {m.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#111827",
                        fontSize: "18px",
                        mb: "10px",
                      }}
                    >
                      {sec.score} / {sec.max}
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
                {score}
              </Typography>
              <Chip
                label={label || ""}
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
              {metricDefs.map((m, idx) => {
                const sec = sections[m.key] as ScoreSection;
                if (!sec) return null;
                return (
                  <Card
                    key={m.key}
                    elevation={0}
                    sx={{
                      bgcolor: "#fff",
                      borderRadius: "14px",
                      mb: "10px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <Accordion
                      elevation={0}
                      disableGutters
                      sx={{
                        bgcolor: "transparent",
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={
                          <ExpandMoreIcon
                            sx={{ fontSize: 18, color: "#9ca3af" }}
                          />
                        }
                        sx={{ px: "14px", py: "10px" }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: "#111827",
                              fontSize: "15px",
                            }}
                          >
                            {m.title}
                          </Typography>
                          <Typography
                            sx={{
                              color: "#6b7280",
                              fontSize: "13px",
                              mt: "2px",
                            }}
                          >
                            {sec.score} / {sec.max} points
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: "14px", pb: "14px" }}>
                        <Box sx={{ mb: "12px" }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "14px",
                              mb: "6px",
                              color: "#111827",
                            }}
                          >
                            ✓ Met Criteria
                          </Typography>
                          <Box
                            component="ul"
                            sx={{
                              pl: 2.25,
                              m: 0,
                              color: "#059669",
                              lineHeight: 1.6,
                            }}
                          >
                            {(sec.met || []).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </Box>
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "14px",
                              mb: "6px",
                              color: "#111827",
                            }}
                          >
                            ✗ Missed Elements
                          </Typography>
                          <Box
                            component="ul"
                            sx={{
                              pl: 2.25,
                              m: 0,
                              color: "#dc2626",
                              lineHeight: 1.6,
                            }}
                          >
                            {(sec.missed || []).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Card>
                );
              })}
            </Box>

            {/* Improvement Plan */}
            {improvementPlan.length > 0 && (
              <>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "#111827",
                    mb: "12px",
                    fontSize: "18px",
                  }}
                >
                  Next Call Improvement Plan
                </Typography>

                <Card
                  elevation={0}
                  sx={{
                    p: "16px",
                    borderRadius: "16px",
                    border: "1px solid #e5e7eb",
                    bgcolor: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    mb: "16px",
                  }}
                >
                  {improvementPlan.map((item, i) => (
                    <Box
                      key={i}
                      sx={{ display: "flex", gap: "10px", mb: "12px" }}
                    >
                      <Typography
                        sx={{
                          color: "#2563eb",
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      >
                        →
                      </Typography>
                      <Typography
                        sx={{
                          color: "#111827",
                          lineHeight: 1.6,
                          fontSize: "13px",
                        }}
                      >
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Card>
              </>
            )}
          </>
        )}

        {/* No analysis fallback */}
        {!sections && rec.analysis && (
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Analysis data is available but could not be parsed. Please
              refresh.
            </Typography>
          </Card>
        )}

        {!rec.analysis && !sections && (
          <Card sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No analysis available yet. Check back soon.
            </Typography>
          </Card>
        )}
      </Container>
    </Box>
  );
}
