import React from "react";
import { Box, AppBar, Tabs, Tab, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import MicIcon from "@mui/icons-material/Mic";
import BarChartIcon from "@mui/icons-material/BarChart";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export default function TopNavigation() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const { company, app } = useParams<{ company: string; app: string }>();
  const phase = new URLSearchParams(location.search).get("phase") || "full";

  // Hide nav on login/select company pages
  const shouldShowNav =
    phase === "full" &&
    !location.pathname.includes("/login") &&
    !location.pathname.includes("/select-company") &&
    !location.pathname.includes("/admin") &&
    !location.pathname.includes("/register") &&
    company &&
    app;

  if (!shouldShowNav) {
    return null;
  }

  // Determine active tab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/my-progress")) return 1;
    if (path.includes("/more")) return 2;
    return 0;
  };

  const handleTabChange = (event: React.SyntheticEvent, value: number) => {
    if (value === 0) {
      navigate(`/${company}/${app}/dashboard`);
    } else if (value === 1) {
      navigate(`/${company}/${app}/my-progress`);
    } else if (value === 2) {
      navigate(`/${company}/${app}/more`);
    }
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "white",
        color: "var(--color-text)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Tabs
        value={getActiveTab()}
        onChange={handleTabChange}
        sx={{
          display: isMobile ? "none" : "flex",
          "& .MuiTab-root": {
            fontWeight: 600,
            fontSize: "14px",
            textTransform: "none",
            color: "var(--color-text-secondary)",
            gap: 1,
            "&.Mui-selected": {
              color: "var(--color-primary)",
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "var(--color-primary)",
            height: "3px",
          },
        }}
      >
        <Tab icon={<MicIcon />} label="Record" iconPosition="start" />
        <Tab icon={<BarChartIcon />} label="My Progress" iconPosition="start" />
        <Tab icon={<MoreVertIcon />} label="More" iconPosition="start" />
      </Tabs>
    </AppBar>
  );
}
