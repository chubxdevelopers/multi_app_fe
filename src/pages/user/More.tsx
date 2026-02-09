import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import InfoIcon from "@mui/icons-material/Info";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../contexts/AuthContext";

export default function MorePage() {
  const navigate = useNavigate();
  const { company, app } = useParams<{ company: string; app: string }>();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(`/${company}/${app}/login`);
  };

  const menuItems = [
    // All core features are centralized on Dashboard now
    {
      id: "profile",
      label: "My Profile",
      icon: <PersonIcon />,
      disabled: true,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon />,
      disabled: true,
    },
    {
      id: "help",
      label: "Help & Support",
      icon: <HelpIcon />,
      disabled: true,
    },
    {
      id: "about",
      label: "About",
      icon: <InfoIcon />,
      disabled: true,
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: 700, mb: 3, color: "var(--color-text)" }}
        >
          More Options
        </Typography>
      </Box>

      {/* User Profile Card */}
      <Card
        sx={{
          p: 3,
          backgroundColor: "#f0f4ff",
          border: "1px solid #e0e7ff",
          borderRadius: "12px",
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "32px",
            backgroundColor: "#eff6ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PersonIcon sx={{ fontSize: 32, color: "var(--color-primary)" }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: "var(--color-text)",
              mb: 0.5,
            }}
          >
            {user?.name || "Salesman"}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "var(--color-text-secondary)",
            }}
          >
            {user?.email || "user@example.com"}
          </Typography>
        </Box>
      </Card>

      {/* Menu Items */}
      <Card
        sx={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          mb: 4,
          overflow: "hidden",
        }}
      >
        <List sx={{ p: 0 }}>
          {menuItems.map((item, idx) => (
            <Box key={item.id}>
              <ListItem disablePadding>
                <ListItemButton
                  disabled={item.disabled}
                  sx={{
                    opacity: item.disabled ? 0.5 : 1,
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    "&:hover": {
                      backgroundColor: item.disabled
                        ? "transparent"
                        : "#f3f4f6",
                    },
                  }}
                  onClick={() => {
                    if (item.disabled) return;
                    if (item.id === "pastRecordings") {
                      navigate(`/${company}/${app}/past-recordings`);
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "var(--color-primary)",
                      minWidth: 48,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      sx: {
                        fontWeight: 600,
                        color: "var(--color-text)",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
              {idx < menuItems.length - 1 && (
                <Divider sx={{ my: 0, backgroundColor: "#e5e7eb" }} />
              )}
            </Box>
          ))}
        </List>
      </Card>

      {/* Logout Button */}
      <Button
        fullWidth
        variant="outlined"
        size="large"
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        sx={{
          padding: "14px 24px",
          fontSize: "16px",
          fontWeight: 600,
          borderRadius: "10px",
          textTransform: "none",
          borderColor: "#ef4444",
          color: "#ef4444",
          mb: 4,
          "&:hover": {
            backgroundColor: "#fee2e2",
            borderColor: "#dc2626",
          },
        }}
      >
        Logout
      </Button>

      {/* App Version */}
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="body2"
          sx={{
            color: "var(--color-text-secondary)",
          }}
        >
          App Version 1.0.0
        </Typography>
      </Box>
    </Container>
  );
}
