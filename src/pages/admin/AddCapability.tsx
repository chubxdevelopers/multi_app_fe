import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Alert,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../utils/axiosConfig";

interface Feature {
  id: number;
  feature_name: string;
  type: string;
}

const validationSchema = yup.object({
  features_json: yup.array().min(1, "Select at least one feature"),
});

export default function AddCapability() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);

  // Fetch available features when component mounts
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        // load features via admin GET; backend will expose /features (added server-side)
        const response = await api.get<Feature[]>("/public/features");
        setFeatures(response.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || `Failed to load features `);
        console.error(err);
      }
    };
    fetchFeatures();
  }, []);

  const formik = useFormik({
    initialValues: {
      features_json: [] as number[],
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        // backend admin endpoint is /add-feature-capability
        const response = await api.post("/admin/add-feature-capability", {
          features_json: values.features_json,
        });
        if (response.data) {
          setSuccess("Capability added successfully!");
          setError("");
          formik.resetForm();
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to add capability");
        setSuccess("");
      }
    },
  });

  return (
    <Container maxWidth="sm">
      <Typography component="h1" variant="h5" gutterBottom>
        Add Feature Capability
      </Typography>
      <Paper className="card fade-in" elevation={3} sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <form onSubmit={formik.handleSubmit}>
          <FormControl
            component="fieldset"
            error={
              formik.touched.features_json &&
              Boolean(formik.errors.features_json)
            }
            sx={{ width: "100%" }}
          >
            <FormLabel component="legend">Select Features</FormLabel>
            <FormGroup>
              {features.length === 0 && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No features available
                </Typography>
              )}
              {features.map((feature: any) => (
                <FormControlLabel
                  key={feature.id}
                  control={
                    <Checkbox
                      checked={formik.values.features_json.includes(feature.id)}
                      onChange={(e) => {
                        const newFeatures = e.target.checked
                          ? [...formik.values.features_json, feature.id]
                          : formik.values.features_json.filter(
                              (id) => id !== feature.id
                            );
                        formik.setFieldValue("features_json", newFeatures);
                      }}
                    />
                  }
                  label={`${feature.feature_name} (${feature.type})`}
                />
              ))}
            </FormGroup>
          </FormControl>
          <Button
            className="btn"
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
          >
            Create Capability
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
