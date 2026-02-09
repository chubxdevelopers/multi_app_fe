import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { useNavigate, useLocation } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import api, { buildFullApiUrl } from "../../utils/axiosConfig";
import { useAuth } from "../../contexts/AuthContext";

const validationSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

export default function Login() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Redirect already-authenticated users away from login
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const companySlug = parts[0];
      const appSlug = parts[1];
      // Quick Actions merged into dashboard
      navigate(`/${companySlug}/${appSlug}/dashboard?phase=quick`, {
        replace: true,
      });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  // If the current URL does not include company and app slugs, force the
  // user to pick a company/app first. This prevents posting to `/api/auth/...`
  // which the server treats as a company slug and returns "Company not found: auth".
  useEffect(() => {
    try {
      const parts = window.location.pathname.split("/").filter(Boolean);

      // Expect the path to be /:company/:app/... when scoped. If not present,
      // redirect to the company selection page.
      if (parts.length < 2) {
        console.log(
          "Missing company/app context, redirecting to select-company"
        );
        navigate("/select-company", { replace: true });
      } else {
        console.log("Company/App context found:", {
          company: parts[0],
          app: parts[1],
        });
      }
    } catch (e) {
      console.log("Error checking path:", e);
      // ignore in non-browser environments
    }
  }, [navigate]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        // POST to the login route under the current company/app context
        // Build absolute URL to ensure company/app slugs are included
        const fullUrl = buildFullApiUrl("/login");
        console.log("Submitting login to:", fullUrl);
        const response = await api.post(fullUrl, values);

        if (response.data.token) {
          const parts = window.location.pathname.split("/").filter(Boolean);
          const companySlug = parts[0];
          const appSlug = parts[1];

          console.log("Login response data:", {
            user: response.data.user,
            role: response.data.user?.role,
          });

          login(response.data.token, response.data.user, companySlug, appSlug);

          const role = (response.data.user?.role || "").toLowerCase();
          const isAdmin = role.includes("admin");

          console.log("Login redirect logic:", {
            role,
            isAdmin,
            companySlug,
            appSlug,
          });

          const defaultDashboard = isAdmin
            ? `/${companySlug}/${appSlug}/admin/dashboard`
            : `/${companySlug}/${appSlug}/dashboard?phase=quick`;

          const dashboardRoute =
            response.data.dashboardRoute || defaultDashboard;
          const fromPath = (from || "").toString();
          const cleanedFrom =
            fromPath.includes("quick-actions") ||
            fromPath.includes("brand-detailing-practice")
              ? ""
              : fromPath;
          let target =
            cleanedFrom && cleanedFrom !== "/" ? cleanedFrom : dashboardRoute;
          if (
            !isAdmin &&
            target.includes("/dashboard") &&
            !target.includes("phase=")
          ) {
            const url = new URL(target, window.location.origin);
            url.searchParams.set("phase", "quick");
            target = `${url.pathname}${url.search}`;
          }

          console.log("Navigating to:", target);
          navigate(target, { replace: true });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Login failed");
      }
    },
  });

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{
        minHeight: "calc(100vh - 180px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 400,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
          }}
        >
          {/* Logo/Brand */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              mx: "auto",
              mb: 2,
              bgcolor: "#f3f4f6",
              borderRadius: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SC
            </Typography>
          </Box>

          {/* Welcome Text */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              color: "#1f2937",
              mb: 1,
            }}
          >
            Welcome
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#6b7280",
              mb: 3,
            }}
          >
            Sign in to continue
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={formik.handleSubmit}>
            {/* User ID Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#374151",
                  mb: 1,
                }}
              >
                User ID
              </Typography>
              <TextField
                fullWidth
                size="medium"
                placeholder="Enter your user ID"
                id="email"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#f9fafb",
                    borderRadius: 1.5,
                    "& fieldset": {
                      borderColor: "#e5e7eb",
                    },
                    "&:hover fieldset": {
                      borderColor: "#d1d5db",
                    },
                  },
                  "& .MuiOutlinedInput-input::placeholder": {
                    color: "#9ca3af",
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#374151",
                  mb: 1,
                }}
              >
                Password
              </Typography>
              <TextField
                fullWidth
                size="medium"
                placeholder="Enter your password"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.password && Boolean(formik.errors.password)
                }
                helperText={formik.touched.password && formik.errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: "#6b7280" }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#f9fafb",
                    borderRadius: 1.5,
                    "& fieldset": {
                      borderColor: "#e5e7eb",
                    },
                    "&:hover fieldset": {
                      borderColor: "#d1d5db",
                    },
                  },
                  "& .MuiOutlinedInput-input::placeholder": {
                    color: "#9ca3af",
                    opacity: 1,
                  },
                }}
              />
            </Box>

            {/* Sign In Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                py: 1.5,
                bgcolor: "#2563eb",
                color: "white",
                fontWeight: 700,
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "1rem",
                "&:hover": {
                  bgcolor: "#1d4ed8",
                },
                "&:active": {
                  bgcolor: "#1e40af",
                },
              }}
            >
              Sign in
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
