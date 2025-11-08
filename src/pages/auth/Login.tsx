import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { useNavigate, useLocation } from "react-router-dom";
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

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
          login(response.data.token, response.data.user, companySlug, appSlug);
          const dashboardRoute =
            response.data.dashboardRoute ||
            `/${companySlug}/${appSlug}/admin/dashboard`;
          // Prefer the original 'from' route when available (keeps navigation semantics)
          const target = dashboardRoute || from;
          navigate(target, { replace: true });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Login failed");
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mt: 3, width: "100%" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              id="email"
              name="email"
              label="Email Address"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField
              fullWidth
              margin="normal"
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            <Box sx={{ textAlign: "center" }}></Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
