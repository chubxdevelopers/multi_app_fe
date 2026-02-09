import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Drawer,
  Fade,
  Grow,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import DetailsIcon from "@mui/icons-material/Details";
import BusinessIcon from "@mui/icons-material/Business";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import MedicationIcon from "@mui/icons-material/Medication";
import GroupIcon from "@mui/icons-material/Group";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EventIcon from "@mui/icons-material/Event";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api, { API_HOST } from "../../utils/axiosConfig";
import { query } from "../../api-builder";
import AudioRecorder from "../../components/AudioRecorder";

type DashboardPhase = "quick" | "brand" | "full";
type ViewMode = "record" | "progress" | "team";

type AudioRecordingRow = {
  id: number;
  title: string;
  status?: string;
  transcription?: string;
  created_at?: string;
  createdAt?: string;
  score?: number;
  keywords_of_improvement?: string;
  analysis?: any;
  recorded_by?: string;
  audio_url?: string;
  processed_url?: string;
};

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  recordingCount?: number;
  avgScore?: number;
};

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // CRITICAL: Redirect admins to admin dashboard IMMEDIATELY
  // This handles the case where the route /:company/:app/:role/dashboard matches
  // /pharma_labs/sales_control/admin/dashboard with :role="admin"
  if (
    user?.role?.toLowerCase() === "admin" &&
    !location.pathname.includes("/admin/")
  ) {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const company = parts[0];
      const app = parts[1];
      return <Navigate to={`/${company}/${app}/admin/dashboard`} replace />;
    }
  }

  const [phase, setPhase] = useState<DashboardPhase>(() =>
    getPhaseFromSearch(location.search),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("record");

  const [medicines, setMedicines] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandError, setBrandError] = useState<string>("");

  const [myRecordings, setMyRecordings] = useState<AudioRecordingRow[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [errorMy, setErrorMy] = useState<string>("");
  // const [selectedJourney, setSelectedJourney] =
  //   useState<AudioRecordingRow | null>(null);

  // Manager-specific state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberRecordings, setMemberRecordings] = useState<AudioRecordingRow[]>(
    [],
  );
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingMemberRecordings, setLoadingMemberRecordings] = useState(false);
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    submissionsThisWeek: 0,
    weeklyAvgScore: 0,
    activeToday: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const recorderRef = useRef<HTMLDivElement | null>(null);
  const brandSelectionRef = useRef<HTMLDivElement | null>(null);

  // Detail drawer state (opens when ?recordingId=<id> is present)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>("");
  const [detailRecord, setDetailRecord] = useState<AudioRecordingRow | null>(
    null,
  );

  useEffect(() => {
    const next = getPhaseFromSearch(location.search);
    setPhase(next);
    const params = new URLSearchParams(location.search);
    const rid = params.get("recordingId");
    if (rid) {
      openDetailById(Number(rid));
    } else {
      setDetailOpen(false);
    }
  }, [location.search]);

  // Note: Admin users should never reach this component due to routing
  // If they do, it indicates a routing configuration issue
  console.log(
    "[USER DASHBOARD] Rendering user dashboard component - pathname:",
    location.pathname,
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.get("phase")) {
      setPhaseAndUrl(phase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "full") {
      // Check permissions
      const hasAudioPerm = user?.uiPermissions?.some(
        (perm: any) => perm.feature_tag === "audio_recording",
      );
      const hasSpeechToText = user?.uiPermissions?.some(
        (perm: any) => perm.feature_tag === "speech_to_text",
      );

      console.log("Dashboard permissions check:", {
        hasAudioPerm,
        hasSpeechToText,
        uiPermissions: user?.uiPermissions,
        user,
      });

      // Manager with speech_to_text only -> team view
      if (hasSpeechToText && !hasAudioPerm) {
        console.log("Setting view mode to TEAM");
        setViewMode("team");
        handleLoadTeamMembers();
      }
      // User with audio recording -> record view
      else if (hasAudioPerm) {
        console.log("Setting view mode to RECORD");
        setViewMode("record");
      }
      // Otherwise progress view
      else {
        console.log("Setting view mode to PROGRESS");
        setViewMode("progress");
      }
    }
  }, [phase, user]);

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const payload = {
          operation: "query",
          resource: "team_documents",
          fields: ["medicines"],
        };
        const url = `${API_HOST}/api/query/v1/base_resource`;
        const resp = await api.post(url, payload, { timeout: 8000 });
        const rows: any[] = Array.isArray(resp?.data?.data)
          ? resp.data.data
          : Array.isArray(resp?.data)
            ? resp.data
            : [];
        const extracted: string[] = [];
        rows.forEach((r) => {
          const val = r?.medicines;
          if (!val) return;
          if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === "string" && item.trim())
                extracted.push(item.trim());
            });
          } else if (typeof val === "string") {
            val
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .forEach((s: string) => extracted.push(s));
          }
        });
        const unique = Array.from(new Set(extracted)).sort((a, b) =>
          a.localeCompare(b),
        );
        setMedicines(unique);
      } catch (e) {
        // Fallback: provide minimal medicine list for UI continuity
        console.warn("Failed to load medicines from backend, using fallback");
        setMedicines(["Medicine A", "Medicine B", "Medicine C"]);
      }
    };
    loadMedicines();
  }, []);

  function getPhaseFromSearch(search: string): DashboardPhase {
    const params = new URLSearchParams(search);
    const phaseParam = (params.get("phase") || "quick").toLowerCase();
    return phaseParam === "brand" || phaseParam === "full"
      ? (phaseParam as DashboardPhase)
      : "quick";
  }

  const setPhaseAndUrl = (nextPhase: DashboardPhase) => {
    const params = new URLSearchParams(location.search);
    params.set("phase", nextPhase);
    navigate(
      { pathname: location.pathname, search: `?${params.toString()}` },
      { replace: true },
    );
    setPhase(nextPhase);
  };

  // Back navigation is handled globally in AppShell

  const scrollToRecorder = () => {
    setTimeout(() => {
      recorderRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  };

  const handleQuickActionClick = (id: string, enabled: boolean) => {
    if (!enabled) return;
    if (id === "brand") {
      setPhaseAndUrl("brand");
      setTimeout(
        () => brandSelectionRef.current?.scrollIntoView({ behavior: "smooth" }),
        150,
      );
    }
  };

  const handleStartPractice = () => {
    if (!selectedBrand) {
      setBrandError("Please select a brand first");
      return;
    }
    setBrandError("");
    setPhaseAndUrl("full");
    scrollToRecorder();
  };

  const handleRecordingComplete = () => {
    // placeholder hook after save
  };

  const handleLoadMyRecordings = async () => {
    setLoadingMy(true);
    setErrorMy("");
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "status",
          "transcription",
          "created_at",
          "analysis",
          "score",
          "keywords_of_improvement",
          "audio_url",
          "processed_url",
        ],
        sort: { created_at: "desc" },
        filters: user?.name ? { "recorded_by.eq": user.name } : {},
      });
      const rows: any[] = Array.isArray((resp as any)?.data)
        ? (resp as any).data
        : Array.isArray(resp as any)
          ? (resp as any)
          : [];
      const normalized = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        transcription: r.transcription,
        created_at: r.created_at,
        score: r.score,
        keywords_of_improvement: r.keywords_of_improvement,
        analysis: r.analysis,
        audio_url: (r as any).audio_url,
        processed_url: (r as any).processed_url,
      }));
      setMyRecordings(normalized);
    } catch (e: any) {
      console.warn("Failed to load recordings:", e);
      setErrorMy(e?.message || "Failed to load recordings");
      // Fallback: set empty array to allow UI to render
      setMyRecordings([]);
    } finally {
      setLoadingMy(false);
    }
  };

  const openDetailById = async (id: number) => {
    setDetailLoading(true);
    setDetailError("");
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
        filters: { "id.eq": id },
      });
      const rows: any[] = Array.isArray((resp as any)?.data)
        ? (resp as any).data
        : Array.isArray(resp as any)
          ? (resp as any)
          : [];
      setDetailRecord(rows[0] || null);
      setDetailOpen(true);
    } catch (e: any) {
      setDetailError(e?.message || "Failed to load recording details");
      setDetailRecord(null);
      setDetailOpen(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const navigateToDetailRecord = (rec: any) => {
    const parts = location.pathname.split("/").filter(Boolean);
    const base = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : "";
    navigate(`${base}/analysis/${rec.id}`, { state: { prefetch: rec } });
  };

  const formattedDate = (ts?: string) =>
    ts ? new Date(ts).toLocaleString() : "";

  // Manager functions for team view
  const handleLoadTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      console.log("Loading team members with user info:", {
        company_id: user?.company_id,
        role_id: user?.role_id,
        team_id: user?.team_id,
      });

      // Fetch all users from the same company
      const resp = await query({
        resource: "users",
        fields: ["id", "name", "email", "role_id", "team_id", "company_id"],
        filters: {
          "company_id.eq": user?.company_id,
        },
      });

      const rows: any[] = Array.isArray((resp as any)?.data)
        ? (resp as any).data
        : Array.isArray(resp as any)
          ? (resp as any)
          : [];

      console.log("All users query response:", resp);
      console.log("All users rows:", rows);

      // Filter out the current user (manager) by role_id
      const salesmen = rows.filter((r: any) => r.role_id !== user?.role_id);

      console.log("Filtered salesmen:", salesmen);

      const members = salesmen.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: "salesman",
      }));

      setTeamMembers(members);

      // Calculate stats with the count of members
      calculateTeamStats(members.length);
    } catch (e) {
      console.error("Failed to load team members", e);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleLoadMemberRecordings = async (memberName: string) => {
    setLoadingMemberRecordings(true);
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: [
          "id",
          "title",
          "transcription",
          "created_at",
          "analysis",
          "score",
          "keywords_of_improvement",
          "recorded_by",
        ],
        sort: { created_at: "desc" },
        filters: { "recorded_by.eq": memberName },
      });
      const rows: any[] = Array.isArray((resp as any)?.data)
        ? (resp as any).data
        : Array.isArray(resp as any)
          ? (resp as any)
          : [];
      setMemberRecordings(rows);
    } catch (e: any) {
      console.error("Failed to load member recordings", e);
    } finally {
      setLoadingMemberRecordings(false);
    }
  };

  const calculateTeamStats = async (memberCount?: number) => {
    try {
      const resp = await query({
        resource: "audio_recordings",
        fields: ["id", "created_at", "score", "recorded_by"],
      });
      const rows: any[] = Array.isArray((resp as any)?.data)
        ? (resp as any).data
        : Array.isArray(resp as any)
          ? (resp as any)
          : [];

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const todayStart = new Date(now.setHours(0, 0, 0, 0));

      const submissionsThisWeek = rows.filter(
        (r: any) => new Date(r.created_at) >= weekStart,
      ).length;

      const activeToday = new Set(
        rows
          .filter((r: any) => new Date(r.created_at) >= todayStart)
          .map((r: any) => r.recorded_by),
      ).size;

      const scoresThisWeek = rows
        .filter(
          (r: any) =>
            new Date(r.created_at) >= weekStart &&
            r.score != null &&
            !isNaN(r.score),
        )
        .map((r: any) => parseFloat(r.score));

      const weeklyAvgScore =
        scoresThisWeek.length > 0
          ? scoresThisWeek.reduce((a, b) => a + b, 0) / scoresThisWeek.length
          : 0;

      setTeamStats({
        totalMembers: memberCount ?? teamMembers.length,
        submissionsThisWeek,
        weeklyAvgScore: Math.round(weeklyAvgScore),
        activeToday,
      });
    } catch (e) {
      console.error("Failed to calculate stats", e);
    }
  };

  // Check if user has audio recording permission
  const hasAudioRecordingPermission = user?.uiPermissions?.some(
    (perm: any) => perm.feature_tag === "audio_recording",
  );

  // Check if user has manager view permission (speech_to_text only)
  const hasManagerPermission =
    user?.uiPermissions?.some(
      (perm: any) => perm.feature_tag === "speech_to_text",
    ) && !hasAudioRecordingPermission;

  // If user doesn't have audio recording permission, skip quick actions/brand selection
  if (phase !== "full" && !hasAudioRecordingPermission) {
    // Redirect to view-only dashboard
    if (phase === "quick") {
      setPhaseAndUrl("full");
    }
  }

  if (phase !== "full" && hasAudioRecordingPermission) {
    const isBrandStep = phase === "brand";
    const actions = [
      {
        id: "brand",
        label: "Brand Detailing Practice",
        icon: <BusinessIcon />,
        enabled: true,
      },
      {
        id: "market",
        label: "Market Research",
        icon: <SearchIcon />,
        enabled: false,
      },
      {
        id: "doctor",
        label: "Doctor Call",
        icon: <PhoneIcon />,
        enabled: false,
      },
      {
        id: "chemist",
        label: "Chemist Call",
        icon: <MedicationIcon />,
        enabled: false,
      },
    ];

    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          py: 3,
          px: 2,
        }}
      >
        {!isBrandStep && (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                What do you want to do today?
              </Typography>
            </Box>
          </>
        )}

        {!isBrandStep && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {actions.map((action) => (
              <Card
                key={action.id}
                sx={{
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  opacity: action.enabled ? 1 : 0.55,
                  cursor: action.enabled ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  "&:hover": action.enabled
                    ? {
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }
                    : {},
                }}
                onClick={() =>
                  handleQuickActionClick(action.id, action.enabled)
                }
              >
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    py: 2,
                    "&:last-child": { pb: 2 },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        color: "#111827",
                      }}
                    >
                      {action.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {isBrandStep && (
          <Box>
            <Card
              ref={brandSelectionRef}
              sx={{
                borderRadius: 3,
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            >
              <CardHeader
                title="Brand Detailing Practice"
                subheader="Pick a brand to continue to your dashboard"
                avatar={<BusinessIcon color="primary" />}
                sx={{ px: 4, py: 3, pb: 2.25 }}
                titleTypographyProps={{ sx: { fontWeight: 700, mb: 0.5 } }}
                subheaderTypographyProps={{ sx: { color: "text.secondary" } }}
              />
              <CardContent sx={{ pt: 1, px: 4, pb: 4 }}>
                {brandError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {brandError}
                  </Alert>
                )}
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
                >
                  <FormControl fullWidth size="medium">
                    <InputLabel id="brand-select-label">
                      Choose a brand
                    </InputLabel>
                    <Select
                      labelId="brand-select-label"
                      value={selectedBrand}
                      label="Choose a brand"
                      onChange={(e) => {
                        setSelectedBrand(e.target.value as string);
                        setBrandError("");
                      }}
                      IconComponent={KeyboardArrowDownRounded}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            mt: 0.5,
                            borderRadius: 2,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          },
                        },
                      }}
                      sx={{
                        bgcolor: "#ffffff",
                        borderRadius: 2,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#e5e7eb",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#d1d5db",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#2563eb",
                        },
                        "& .MuiSelect-select": {
                          py: 1.35,
                          color: "#0f172a",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select brand</em>
                      </MenuItem>
                      {medicines.map((m) => (
                        <MenuItem
                          key={m}
                          value={m}
                          sx={{ color: "#0f172a", py: 1.2 }}
                        >
                          {m}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleStartPractice}
                    disabled={!selectedBrand}
                    sx={{
                      py: 1.25,
                      borderRadius: 999,
                      background: "#1f5df5",
                      color: "#ffffff",
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "1rem",
                      boxShadow: "0 8px 18px rgba(31,93,245,0.25)",
                      "&:hover": { background: "#1b52da" },
                      "&:active": { background: "#184ac6" },
                      "&.Mui-disabled": {
                        color: "#ffffff",
                        background: "#3b82f6",
                        opacity: 0.6,
                      },
                    }}
                  >
                    Start Practice
                  </Button>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2.25, display: "block" }}
                >
                  This pre-fills your recording title with the selected brand
                  and unlocks the dashboard.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "white" }}>
      {/* Horizontal Tab Navigation */}
      <Box
        sx={{
          bgcolor: "white",
          display: "flex",
          justifyContent: "center",
          py: 3,
          pt: 3,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            bgcolor: "white",
            borderRadius: 999,
            p: 0.6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            minWidth: { xs: "90%", sm: 500 },
          }}
        >
          {hasAudioRecordingPermission && (
            <Button
              onClick={() => setViewMode("record")}
              sx={{
                borderRadius: 999,
                flex: 1,
                px: 5,
                py: 1.1,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                transition: "all 0.3s",
                bgcolor: viewMode === "record" ? "#1f5df5" : "transparent",
                color: viewMode === "record" ? "white" : "#64748b",
                boxShadow:
                  viewMode === "record"
                    ? "0 4px 12px rgba(31,93,245,0.25)"
                    : "none",
                "&:hover": {
                  bgcolor: viewMode === "record" ? "#1b52da" : "#f1f5f9",
                },
              }}
            >
              record
            </Button>
          )}
          {hasManagerPermission && (
            <Button
              onClick={() => {
                setViewMode("team");
                handleLoadTeamMembers();
              }}
              sx={{
                borderRadius: 999,
                flex: 1,
                px: 5,
                py: 1.1,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                transition: "all 0.3s",
                bgcolor: viewMode === "team" ? "#1f5df5" : "transparent",
                color: viewMode === "team" ? "white" : "#64748b",
                boxShadow:
                  viewMode === "team"
                    ? "0 4px 12px rgba(31,93,245,0.25)"
                    : "none",
                "&:hover": {
                  bgcolor: viewMode === "team" ? "#1b52da" : "#f1f5f9",
                },
              }}
            >
              team view
            </Button>
          )}
          {!hasManagerPermission && (
            <Button
              onClick={() => setViewMode("progress")}
              sx={{
                borderRadius: 999,
                flex: 1,
                px: 5,
                py: 1.1,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                transition: "all 0.3s",
                bgcolor: viewMode === "progress" ? "#1f5df5" : "transparent",
                color: viewMode === "progress" ? "white" : "#64748b",
                boxShadow:
                  viewMode === "progress"
                    ? "0 4px 12px rgba(31,93,245,0.25)"
                    : "none",
                "&:hover": {
                  bgcolor: viewMode === "progress" ? "#1b52da" : "#f1f5f9",
                },
              }}
            >
              my progress
            </Button>
          )}
        </Box>
      </Box>

      <Container
        maxWidth="md"
        sx={{
          pt: { xs: 3, sm: 4 },
          pb: { xs: 8, sm: 10 },
          transition: "margin 0.3s",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {viewMode === "record" && hasAudioRecordingPermission && (
            <>
              <Fade in timeout={600}>
                <Card
                  ref={recorderRef}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "2px solid #e8effe",
                    boxShadow: "0 8px 24px rgba(31, 93, 245, 0.12)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    maxWidth: 620,
                    mx: "auto",
                    mt: { xs: 2, sm: 2.5 },
                    "&:hover": {
                      boxShadow: "0 12px 32px rgba(31, 93, 245, 0.18)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardHeader
                    title="Record Brand Detailing Practice"
                    subheader="Create a new recording and submit for feedback"
                    avatar={
                      <Box
                        sx={{
                          background: "#1f5df5",
                          borderRadius: "50%",
                          p: 1.2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MicIcon sx={{ color: "white", fontSize: 24 }} />
                      </Box>
                    }
                    sx={{
                      px: 3.5,
                      py: 2.5,
                      "& .MuiCardHeader-title": {
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: "#1e293b",
                      },
                      "& .MuiCardHeader-subheader": {
                        fontSize: "0.9rem",
                        mt: 0.5,
                        color: "#475569",
                      },
                    }}
                  />
                  <CardContent sx={{ pt: 0.5, px: 3.5, pb: 3.5 }}>
                    {selectedBrand && (
                      <Fade in timeout={400}>
                        <Box sx={{ mb: 4, textAlign: "center" }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 700,
                              color: "#1e293b",
                              mb: 1,
                              fontSize: "1.2rem",
                            }}
                          >
                            {selectedBrand}
                          </Typography>
                          <Box
                            sx={{
                              width: 48,
                              height: 3,
                              background: "#1f5df5",
                              borderRadius: 2,
                              mx: "auto",
                              mt: 1,
                            }}
                          />
                        </Box>
                      </Fade>
                    )}
                    <Box sx={{ textAlign: "center" }}>
                      <AudioRecorder
                        onRecordingComplete={handleRecordingComplete}
                        defaultTitle={selectedBrand || ""}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </>
          )}

          {/* Team View for Managers */}
          {viewMode === "team" && hasManagerPermission && (
            <Fade in timeout={600}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Back Button if viewing member details */}
                {selectedMember && (
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => {
                      setSelectedMember(null);
                      setMemberRecordings([]);
                    }}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Back to Team
                  </Button>
                )}

                {/* Team Metrics Cards */}
                {!selectedMember && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        md: "repeat(4, 1fr)",
                      },
                      gap: 3,
                    }}
                  >
                    <Card
                      sx={{
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <GroupIcon sx={{ fontSize: 40 }} />
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {teamStats.totalMembers}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              No of Salesmen
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        background:
                          "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <AssignmentIcon sx={{ fontSize: 40 }} />
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {teamStats.submissionsThisWeek}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Submissions This Week
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        background:
                          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "white",
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <TrendingUpIcon sx={{ fontSize: 40 }} />
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {teamStats.weeklyAvgScore.toFixed(1)}/10
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Weekly Avg Score
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>

                    <Card
                      sx={{
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        background:
                          "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                        color: "white",
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <CheckCircleIcon sx={{ fontSize: 40 }} />
                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                              {teamStats.activeToday}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Active Today
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Team Members List */}
                {!selectedMember && (
                  <Card
                    sx={{
                      borderRadius: 4,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }}
                  >
                    <CardHeader
                      title="Team Members"
                      subheader="Click on a member to view their recordings"
                      avatar={<GroupIcon color="primary" />}
                    />
                    <CardContent>
                      {loadingTeam ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      ) : teamMembers.length === 0 ? (
                        <Typography
                          color="text.secondary"
                          sx={{ textAlign: "center", py: 4 }}
                        >
                          No team members found
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(2, 1fr)",
                              md: "repeat(3, 1fr)",
                            },
                            gap: 2,
                          }}
                        >
                          {teamMembers.map((member) => (
                            <Card
                              key={member.id}
                              sx={{
                                cursor: "pointer",
                                transition: "all 0.3s",
                                "&:hover": {
                                  transform: "translateY(-4px)",
                                  boxShadow:
                                    "0 8px 24px rgba(102, 126, 234, 0.2)",
                                },
                              }}
                              onClick={() => {
                                setSelectedMember(member);
                                handleLoadMemberRecordings(member.name);
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    mb: 2,
                                  }}
                                >
                                  <Avatar
                                    sx={{
                                      bgcolor: "primary.main",
                                      width: 48,
                                      height: 48,
                                    }}
                                  >
                                    {member.name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography
                                      variant="h6"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {member.name}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {member.email}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                  <Chip
                                    label={`${
                                      member.recordingCount || 0
                                    } recordings`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  {member.avgScore !== undefined && (
                                    <Chip
                                      label={`Avg: ${member.avgScore.toFixed(
                                        1,
                                      )}/10`}
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Member Recordings View */}
                {selectedMember && (
                  <Card
                    sx={{
                      borderRadius: 4,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }}
                  >
                    <CardHeader
                      title={`${selectedMember.name}'s Recordings`}
                      subheader={selectedMember.email}
                      avatar={
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          {selectedMember.name.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                    />
                    <CardContent>
                      {loadingMemberRecordings ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 4,
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      ) : memberRecordings.length === 0 ? (
                        <Typography
                          color="text.secondary"
                          sx={{ textAlign: "center", py: 4 }}
                        >
                          No recordings found for this member
                        </Typography>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {memberRecordings.map((recording) => (
                            <Card
                              key={recording.id}
                              sx={{
                                cursor: "default",
                                transition: "all 0.3s",
                                "&:hover": {
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                },
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "start",
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      variant="h6"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      {recording.title}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {recording.created_at
                                        ? new Date(
                                            recording.created_at,
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ textAlign: "right" }}>
                                    {recording.score && (
                                      <Chip
                                        label={`${recording.score}/10`}
                                        color={
                                          recording.score >= 7
                                            ? "success"
                                            : recording.score >= 5
                                              ? "warning"
                                              : "error"
                                        }
                                        sx={{ fontWeight: 600 }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Fade>
          )}

          {viewMode === "progress" && (
            <Fade in timeout={600}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Performance Overview Card */}
                <Card
                  sx={{
                    borderRadius: "16px",
                    border: "1px solid #e5e7eb",
                    bgcolor: "#fff",
                    boxShadow: "none",
                  }}
                >
                  <Box sx={{ p: "16px" }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "15px",
                        mb: "16px",
                        color: "#0f172a",
                      }}
                    >
                      Performance Overview
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "12px",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#64748b",
                            fontSize: "12px",
                            mb: "6px",
                            fontWeight: 500,
                          }}
                        >
                          Average Score
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "22px",
                            color: "#0f172a",
                          }}
                        >
                          {myRecordings.length > 0
                            ? Math.round(
                                myRecordings.reduce(
                                  (acc, r) => acc + (r.score || 0),
                                  0,
                                ) / myRecordings.length,
                              )
                            : "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#64748b",
                            fontSize: "12px",
                            mb: "6px",
                            fontWeight: 500,
                          }}
                        >
                          Latest Score
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "22px",
                            color: "#0f172a",
                          }}
                        >
                          {myRecordings.length > 0
                            ? (myRecordings[0]?.score ?? "-")
                            : "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#64748b",
                            fontSize: "12px",
                            mb: "6px",
                            fontWeight: 500,
                          }}
                        >
                          Improvement
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "22px",
                            color: "#16a34a",
                          }}
                        >
                          {myRecordings.length > 1
                            ? `${
                                (myRecordings[0]?.score || 0) -
                                  (myRecordings[myRecordings.length - 1]
                                    ?.score || 0) >
                                0
                                  ? "+"
                                  : ""
                              }${Math.round(
                                (myRecordings[0]?.score || 0) -
                                  (myRecordings[myRecordings.length - 1]
                                    ?.score || 0),
                              )}`
                            : "-"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>

                {/* Recording History Header */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: "8px",
                  }}
                >
                  <Typography
                    sx={{ fontWeight: 700, fontSize: "18px", color: "#0f172a" }}
                  >
                    Recording History
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleLoadMyRecordings}
                    startIcon={
                      loadingMy ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DetailsIcon />
                      )
                    }
                    disabled={loadingMy}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    {loadingMy ? "Loading..." : "Refresh"}
                  </Button>
                </Box>

                {errorMy && <Alert severity="error">{errorMy}</Alert>}

                {/* Recording List - compact accordion style */}
                {myRecordings.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {myRecordings.map((recording) => {
                      // Parse analysis to extract scores from nested sections
                      let scores = {
                        modelCommunication: 0,
                        languageQuality: 0,
                        medicalAccuracy: 0,
                        closingAction: 0,
                      };
                      if (recording.analysis) {
                        try {
                          const analysis =
                            typeof recording.analysis === "string"
                              ? JSON.parse(recording.analysis)
                              : recording.analysis;

                          // Extract from nested sections structure
                          const sections = analysis.sections || analysis;
                          scores = {
                            modelCommunication:
                              sections.Model_Communication_Compliance?.total ??
                              sections.model_communication_compliance?.score ??
                              sections.modelCommunication?.score ??
                              analysis.model_communication ??
                              0,
                            languageQuality:
                              sections.Language_Tonality?.total ??
                              sections.language_quality_clarity?.score ??
                              sections.languageQuality?.score ??
                              analysis.language_quality ??
                              0,
                            medicalAccuracy:
                              sections.Medical_Scientific_Accuracy?.total ??
                              sections.medical_scientific_accuracy?.score ??
                              sections.medicalAccuracy?.score ??
                              analysis.medical_accuracy ??
                              0,
                            closingAction:
                              sections.Closing_Action_Orientation?.total ??
                              sections.closing_action_orientation?.score ??
                              sections.closingAction?.score ??
                              analysis.closing_action ??
                              0,
                          };
                        } catch {}
                      }
                      const open = !!expandedRows[recording.id];
                      const toggle = () =>
                        setExpandedRows((s) => ({
                          ...s,
                          [recording.id]: !s[recording.id],
                        }));
                      return (
                        <Card
                          key={recording.id}
                          sx={{
                            borderRadius: "14px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "none",
                            bgcolor: "#fff",
                          }}
                        >
                          <Box
                            onClick={toggle}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: "10px 14px",
                              cursor: "pointer",
                              height: "48px",
                            }}
                          >
                            <EventIcon
                              sx={{ color: "#94a3b8", fontSize: "18px" }}
                            />
                            <Typography
                              sx={{ color: "#64748b", fontSize: "13px" }}
                            >
                              {new Date(
                                recording.created_at ||
                                  (recording as any)?.createdAt ||
                                  Date.now(),
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              })}
                            </Typography>
                            <Typography
                              sx={{
                                color: "#0f172a",
                                fontWeight: 600,
                                fontSize: "14px",
                                ml: 1,
                              }}
                            >
                              {recording.title || "Brand"}
                            </Typography>
                            <Box
                              sx={{
                                ml: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "14px",
                                  color:
                                    recording.score >= 70
                                      ? "#16a34a"
                                      : recording.score >= 50
                                        ? "#d97706"
                                        : "#dc2626",
                                }}
                              >
                                {recording.score ?? "-"}
                              </Typography>
                              <KeyboardArrowDownRounded
                                sx={{
                                  color: "#94a3b8",
                                  fontSize: "18px",
                                  transform: open
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </Box>
                          </Box>
                          {open && (
                            <Box sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, 1fr)",
                                  gap: 2,
                                }}
                              >
                                {[
                                  {
                                    label: "Model Communication",
                                    value: scores.modelCommunication,
                                    max: 40,
                                  },
                                  {
                                    label: "Language Quality",
                                    value: scores.languageQuality,
                                    max: 25,
                                  },
                                  {
                                    label: "Medical Accuracy",
                                    value: scores.medicalAccuracy,
                                    max: 15,
                                  },
                                  {
                                    label: "Closing & Action",
                                    value: scores.closingAction,
                                    max: 20,
                                  },
                                ].map((m, idx) => {
                                  const percentage = (m.value / m.max) * 100;
                                  const barColor =
                                    percentage >= 70
                                      ? "#16a34a"
                                      : percentage >= 50
                                        ? "#3b82f6"
                                        : "#ef4444";
                                  return (
                                    <Box
                                      key={idx}
                                      sx={{
                                        bgcolor: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "14px",
                                        p: "12px",
                                        textAlign: "center",
                                        height: "92px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "12px",
                                          fontWeight: 500,
                                          color: "#64748b",
                                        }}
                                      >
                                        {m.label}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: "16px",
                                          fontWeight: 500,
                                          color: "#0f172a",
                                        }}
                                      >
                                        {m.value} / {m.max}
                                      </Typography>
                                      <Box
                                        sx={{
                                          height: "5px",
                                          borderRadius: 999,
                                          bgcolor: "#e5e7eb",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            height: "100%",
                                            width: `${percentage}%`,
                                            background: barColor,
                                            transition: "width 0.3s ease",
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  mt: 2,
                                }}
                              >
                                <Button
                                  variant="contained"
                                  onClick={() =>
                                    navigateToDetailRecord(recording)
                                  }
                                  sx={{
                                    borderRadius: 999,
                                    textTransform: "none",
                                    px: 2.75,
                                    py: 0.75,
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    boxShadow: "none",
                                  }}
                                >
                                  View analysis
                                </Button>
                              </Box>
                            </Box>
                          )}
                        </Card>
                      );
                    })}
                  </Box>
                ) : (
                  <Card sx={{ borderRadius: 3, p: 3, textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary">
                      No recordings yet. Tap Refresh to load your progress.
                    </Typography>
                  </Card>
                )}
              </Box>
            </Fade>
          )}
        </Box>
      </Container>

      {/* Analysis Detail Drawer */}
      <Drawer
        anchor={isMobile ? "bottom" : "right"}
        open={detailOpen}
        ModalProps={{ keepMounted: true, disableRestoreFocus: true }}
        onClose={() => {
          const params = new URLSearchParams(location.search);
          params.delete("recordingId");
          navigate(
            { pathname: location.pathname, search: `?${params.toString()}` },
            { replace: true },
          );
          setDetailOpen(false);
        }}
        PaperProps={{
          sx: {
            width: isMobile ? "100%" : 540,
            maxWidth: "100%",
            height: isMobile ? "82vh" : "100%",
            p: 3,
          },
        }}
      >
        {detailLoading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : detailError ? (
          <Alert severity="error">{detailError}</Alert>
        ) : detailRecord ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "#667eea" }}>
                <DetailsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {detailRecord.title || `Recording #${detailRecord.id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailRecord.created_at
                    ? new Date(detailRecord.created_at).toLocaleString()
                    : ""}
                </Typography>
              </Box>
              <Box
                sx={{
                  ml: "auto",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: "#fee2e2",
                  color: "#b91c1c",
                  fontWeight: 800,
                }}
              >
                {detailRecord.score ?? "-"}
              </Box>
            </Box>

            {/* Audio preview */}
            {(detailRecord.audio_url || detailRecord.processed_url) && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1 }}>
                {detailRecord.audio_url && (
                  <audio controls src={detailRecord.audio_url} />
                )}
                {detailRecord.processed_url && (
                  <audio controls src={detailRecord.processed_url} />
                )}
              </Box>
            )}

            {/* Keywords */}
            {detailRecord.keywords_of_improvement && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, mb: 1, display: "block" }}
                >
                  KEY IMPROVEMENTS
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {detailRecord.keywords_of_improvement
                    .split(",")
                    .slice(0, 6)
                    .map((keyword, idx) => (
                      <Chip key={idx} label={keyword.trim()} size="small" />
                    ))}
                </Box>
              </Box>
            )}

            {/* Analysis text */}
            <Box
              sx={{
                flex: 1,
                minHeight: 200,
                border: "1px solid #eef1f5",
                borderRadius: 2,
                p: 1.5,
                bgcolor: "#fafafa",
                overflow: "auto",
              }}
            >
              <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                {typeof detailRecord.analysis === "string"
                  ? detailRecord.analysis
                  : JSON.stringify(detailRecord.analysis, null, 2)}
              </pre>
            </Box>
          </Box>
        ) : (
          <Typography>No details</Typography>
        )}
      </Drawer>
    </Box>
  );
}
