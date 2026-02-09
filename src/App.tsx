import React from "react";
import AddCapability from "./pages/admin/AddCapability";
import AdminRegister from "./pages/admin/AdminRegister";
import Login from "./pages/auth/Login";
import SelectCompany from "./pages/auth/SelectCompany";
import AddUser from "./pages/admin/AddUser";
import AddFeature from "./pages/admin/AddFeature";
import CompanyDocuments from "./pages/admin/CompanyDocuments";
import RoleMapping from "./pages/admin/RoleMapping";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UserDashboard from "./pages/user/Dashboard";
import AudioReview from "./pages/user/AudioReview";
import AnalysisDetail from "./pages/user/AnalysisDetail";
import PracticeResults from "./pages/user/PracticeResults";
import MyProgress from "./pages/user/MyProgress";
import More from "./pages/user/More";
import CallHistory from "./pages/user/CallHistory";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AppShell from "./components/AppShell";
import { Box, CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";

const theme = createTheme();

function getSlugsFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { company: parts[0], app: parts[1] };
  }
  return { company: null, app: null } as any;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();
  const { company, app } = getSlugsFromPathname(location.pathname);

  if (!isInitialized) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = company && app ? `/${company}/${app}/login` : `/`;
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Legacy paths redirect to consolidated dashboards
function RedirectToDashboard() {
  const { company, app } = useParams();
  const target =
    company && app ? `/${company}/${app}/dashboard` : "/select-company";
  return <Navigate to={target} replace />;
}

function RedirectRoleDashboard() {
  const { company, app, role } = useParams();
  const target =
    company && app
      ? role
        ? `/${company}/${app}/${role}/dashboard`
        : `/${company}/${app}/dashboard`
      : "/select-company";
  return <Navigate to={target} replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <Router>
            <AppShell>
              <Routes>
                {/* Public routes with slugs */}
                <Route path="/:company/:app/login" element={<Login />} />
                <Route
                  path="/:company/:app/admin/register"
                  element={<AdminRegister />}
                />

                {/* Protected admin routes with slugs */}
                <Route
                  path="/:company/:app/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="capabilities-add" element={<AddCapability />} />
                  <Route path="add-feature" element={<AddFeature />} />
                  <Route path="add-user" element={<AddUser />} />
                  <Route
                    path="company-documents"
                    element={<CompanyDocuments />}
                  />
                  <Route path="team-documents" element={<CompanyDocuments />} />
                  <Route path="roles-mapping" element={<RoleMapping />} />
                </Route>

                {/* Company/App Selection */}
                <Route path="/select-company" element={<SelectCompany />} />

                {/* Generic role-based dashboard (e.g. /:company/:app/salesman/dashboard or /:company/:app/manager/dashboard) */}
                <Route
                  path="/:company/:app/:role/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Quick Actions and Brand Detailing are integrated into Dashboard */}
                <Route
                  path="/:company/:app/quick-actions"
                  element={<RedirectToDashboard />}
                />
                <Route
                  path="/:company/:app/brand-detailing-practice"
                  element={<RedirectToDashboard />}
                />
                <Route
                  path="/:company/:app/:role/quick-actions"
                  element={<RedirectRoleDashboard />}
                />
                <Route
                  path="/:company/:app/:role/brand-detailing-practice"
                  element={<RedirectRoleDashboard />}
                />

                {/* Record audio is handled inside Dashboard now */}

                {/* Practice Results page */}
                <Route
                  path="/:company/:app/practice-results/:recordingId"
                  element={
                    <ProtectedRoute>
                      <PracticeResults />
                    </ProtectedRoute>
                  }
                />

                {/* Full-page Analysis Detail */}
                <Route
                  path="/:company/:app/analysis/:id"
                  element={
                    <ProtectedRoute>
                      <AnalysisDetail />
                    </ProtectedRoute>
                  }
                />

                {/* My Progress page */}
                <Route
                  path="/:company/:app/my-progress"
                  element={
                    <ProtectedRoute>
                      <MyProgress />
                    </ProtectedRoute>
                  }
                />

                {/* Call History page */}
                <Route
                  path="/:company/:app/call-history"
                  element={
                    <ProtectedRoute>
                      <CallHistory />
                    </ProtectedRoute>
                  }
                />

                {/* Past recordings consolidated under Dashboard */}

                {/* More page */}
                <Route
                  path="/:company/:app/more"
                  element={
                    <ProtectedRoute>
                      <More />
                    </ProtectedRoute>
                  }
                />

                {/* Also support the generic app-level dashboard (/:company/:app/dashboard) */}
                <Route
                  path="/:company/:app/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Single audio review page */}
                <Route
                  path="/:company/:app/audio/:id"
                  element={
                    <ProtectedRoute>
                      <AudioReview />
                    </ProtectedRoute>
                  }
                />

                {/* Root redirect to company selection */}
                <Route
                  path="/"
                  element={<Navigate to="/select-company" replace />}
                />

                {/* 404 catch-all */}
                {/* <Route
              path="*"
              element={
                <div style={{ padding: "2rem" }}>
                  <h1>404 - Not Found</h1>
                  <p>The page you are looking for does not exist.</p>
                </div>
              }
            /> */}
              </Routes>
            </AppShell>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
