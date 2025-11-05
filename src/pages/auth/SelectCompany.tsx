import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api, { buildPublicApiUrl } from "../../utils/axiosConfig";

interface Company {
  id: number;
  name: string;
  slug: string;
}

interface App {
  id: number;
  name: string;
  slug: string;
  company_id: number;
}

export default function SelectCompany() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      try {
        const url = buildPublicApiUrl("/companies");
        const response = await api.get(url);
        if (!mounted) return;
        setCompanies(response.data || []);
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error("Error loading companies:", err);
        if (!mounted) return;
        setError("Failed to load companies. Please try again.");
      }
    };
    fetchCompanies();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchApps = async () => {
      if (!selectedCompany) {
        setApps([]);
        return;
      }
      try {
        const url = buildPublicApiUrl(`/companies/${selectedCompany}/apps`);
        const response = await api.get(url);
        if (!mounted) return;
        setApps(response.data || []);
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error("Error loading apps:", err);
        if (!mounted) return;
        setError("Failed to load apps. Please try again.");
      }
    };
    fetchApps();
    return () => {
      mounted = false;
    };
  }, [selectedCompany]);

  const handleSubmit = () => {
    if (selectedCompany && selectedApp) {
      navigate(`/${selectedCompany}/${selectedApp}/login`);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Select Company and App
        </Typography>
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="company-label">Company</InputLabel>
            <Select
              labelId="company-label"
              id="company-select"
              value={selectedCompany}
              label="Company"
              onChange={(e) => {
                setSelectedCompany(e.target.value as string);
                setSelectedApp("");
              }}
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.slug}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="app-label">App</InputLabel>
            <Select
              labelId="app-label"
              id="app-select"
              value={selectedApp}
              label="App"
              onChange={(e) => setSelectedApp(e.target.value as string)}
              disabled={!selectedCompany}
            >
              {apps.length === 0 && selectedCompany ? (
                <MenuItem value="" disabled>
                  No apps available
                </MenuItem>
              ) : (
                apps.map((app) => (
                  <MenuItem key={app.id} value={app.slug}>
                    {app.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={!selectedCompany || !selectedApp}
          >
            Continue
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
