import React from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TopNavigation from "./TopNavigation";
import { Button, IconButton } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { app } = useParams<{ app: string }>();
  const onAdminPath = location.pathname.includes("/admin/");
  const onSelectCompany =
    location.pathname === "/select-company" ||
    location.pathname.startsWith("/select-company?");
  const onLoginPage = location.pathname.includes("/login");

  // Extract app name from URL path if params not available
  let appName = app ? app.charAt(0).toUpperCase() + app.slice(1) : "C-HUB";

  // Fallback: extract from pathname if useParams doesn't work
  if (!app) {
    const pathParts = location.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const extractedApp = pathParts[1];
      appName = extractedApp.charAt(0).toUpperCase() + extractedApp.slice(1);
    }
  }

  const computeBackTarget = (): string | null => {
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const company = parts[0];
    const appSlug = parts[1];
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const phase = (searchParams.get("phase") || "quick").toLowerCase();

    if (path.includes(`/${company}/${appSlug}/dashboard`)) {
      if (phase === "full")
        return `/${company}/${appSlug}/dashboard?phase=brand`;
      if (phase === "brand")
        return `/${company}/${appSlug}/dashboard?phase=quick`;
      if (phase === "quick") return `/${company}/${appSlug}/login`;
    }
    if (path.includes(`/${company}/${appSlug}/analysis/`)) {
      return `/${company}/${appSlug}/dashboard?phase=full`;
    }
    if (path.includes(`/${company}/${appSlug}/my-progress`)) {
      return `/${company}/${appSlug}/dashboard?phase=full`;
    }
    if (path.includes(`/${company}/${appSlug}/more`)) {
      return `/${company}/${appSlug}/dashboard?phase=full`;
    }
    return null;
  };

  return (
    <div>
      {/* show header for non-admin routes; AdminLayout provides its own AppBar */}
      {!onAdminPath && (
        <header className="app-header">
          <div className="app-header-inner">
            {!onSelectCompany && !onLoginPage && (
              <IconButton
                onClick={() => {
                  const target = computeBackTarget();
                  if (target) navigate(target);
                  else navigate(-1);
                }}
                sx={{
                  color: "#fff",
                  mr: 2,
                  "&:hover": {
                    background: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <div className="brand">
              <Link to="/select-company" className="brand-link">
                {appName}
              </Link>
            </div>
            {/* hide nav links and sign-in button on the select-company and login pages for a focused flow */}
            {!onSelectCompany && !onLoginPage && (
              <div className="header-actions">
                {isAuthenticated ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginLeft: "auto",
                    }}
                  >
                    <div className="user-pill">👤 {user?.name || "User"}</div>
                    <IconButton
                      onClick={() => {
                        const parts = location.pathname
                          .split("/")
                          .filter(Boolean);
                        if (parts.length >= 2) {
                          const company = parts[0];
                          const appSlug = parts[1];
                          navigate(`/${company}/${appSlug}/call-history`);
                        }
                      }}
                      sx={{
                        bgcolor: "#1f5df5",
                        color: "#fff",
                        "&:hover": {
                          bgcolor: "#1b52da",
                        },
                      }}
                      title="View Call History"
                    >
                      <HistoryIcon />
                    </IconButton>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<LogoutIcon />}
                      onClick={() => logout()}
                      sx={{
                        textTransform: "none",
                        whiteSpace: "nowrap",
                        borderColor: "#ef4444",
                        color: "#fff",
                        "&:hover": {
                          borderColor: "#dc2626",
                          background: "rgba(239,68,68,0.15)",
                        },
                      }}
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Link to="/select-company" className="btn small">
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      <TopNavigation />

      <main className="app-main">{children}</main>
    </div>
  );
}
