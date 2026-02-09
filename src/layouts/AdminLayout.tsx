import "@mui/material/styles";
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  PersonAdd,
  Category,
  Security,
  SwapHoriz,
  ExitToApp,
  Description,
  Group,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 240;

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const buildPath = (suffix: string) => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const companySlug = parts[0];
    const appSlug = parts[1];
    return `/${companySlug}/${appSlug}${suffix}`;
  };

  const menuItems = [
    {
      text: "Dashboard",
      icon: <Dashboard />,
      path: buildPath("/admin/dashboard"),
    },
    {
      text: "Add User",
      icon: <PersonAdd />,
      path: buildPath("/admin/dashboard/add-user"),
    },
    {
      text: "Add Feature",
      icon: <Category />,
      path: buildPath("/admin/dashboard/add-feature"),
    },
    {
      text: "Add Capability",
      icon: <Security />,
      path: buildPath("/admin/dashboard/capabilities-add"),
    },
    {
      text: "Company Documents",
      icon: <Description />,
      path: buildPath("/admin/dashboard/company-documents"),
    },
    {
      text: "Team Documents",
      icon: <Group />,
      path: buildPath("/admin/dashboard/team-documents"),
    },
    {
      text: "Role Mapping",
      icon: <SwapHoriz />,
      path: buildPath("/admin/dashboard/roles-mapping"),
    },
  ];

  const drawer = (
    <div>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            onClick={() => navigate(item.path)}
            sx={{ cursor: "pointer" }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Admin Panel
          </Typography>
          <Button
            color="inherit"
            onClick={() => {
              logout();
              const parts = window.location.pathname.split("/").filter(Boolean);
              const companySlug = parts[0];
              const appSlug = parts[1];
              navigate(`/${companySlug}/${appSlug}/login`);
            }}
            startIcon={<ExitToApp />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginLeft: { sm: `${drawerWidth}px` },
          marginTop: "64px", // Height of the AppBar
        }}
      >
        <div className="app-container">
          <Outlet />
        </div>
      </Box>
    </Box>
  );
}
