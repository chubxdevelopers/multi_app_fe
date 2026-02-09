import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Chip,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../utils/axiosConfig";

interface Role {
  id: number;
  name: string;
}

interface Capability {
  id: number;
  features: any[];
}

const validationSchema = yup.object({
  role_id: yup.number().required("Role is required"),
  capabilities: yup.array().min(1, "Select at least one capability"),
});

export default function RoleMapping() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<number[]>(
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesResponse, capabilitiesResponse] = await Promise.all([
          // GET endpoints exposed on backend to list roles and capabilities
          api.get("/public/roles"),
          api.get("/public/capabilities"),
        ]);
        setRoles(rolesResponse.data || []);
        setCapabilities(capabilitiesResponse.data || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load data fe");
      }
    };
    fetchData();
  }, []);

  const formik = useFormik({
    initialValues: {
      role_id: "" as string | number,
      capabilities: [] as number[],
    },
    validationSchema: validationSchema,
    onSubmit: async (values: {
      role_id: string | number;
      capabilities: number[];
    }) => {
      try {
        // Send one mapping per capability to match backend expectations
        for (const capId of selectedCapabilities) {
          await api.post("/admin/add-role-capability", {
            role: values.role_id, // role name string
            team: null,
            capability_id: capId,
          });
        }

        setSuccess("Role mapping updated successfully!");
        setError("");
        formik.resetForm();
        setSelectedCapabilities([]);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to update role mapping"
        );
        setSuccess("");
      }
    },
  });

  const handleCapabilityToggle = (capabilityId: number) => {
    setSelectedCapabilities((prev) => {
      const isSelected = prev.includes(capabilityId);
      if (isSelected) {
        return prev.filter((id) => id !== capabilityId);
      } else {
        return [...prev, capabilityId];
      }
    });
    formik.setFieldValue("capabilities", selectedCapabilities);
  };

  return (
    <Container maxWidth="md">
      <Typography component="h1" variant="h5" gutterBottom>
        Role Feature Mapping
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
            fullWidth
            error={formik.touched.role_id && Boolean(formik.errors.role_id)}
            sx={{ mb: 3 }}
          >
            <InputLabel>Select Role</InputLabel>
            <Select
              name="role_id"
              value={formik.values.role_id}
              onChange={formik.handleChange}
              label="Select Role"
            >
              {roles.length === 0 && (
                <MenuItem disabled value="">
                  No roles available
                </MenuItem>
              )}
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.name}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="subtitle1" gutterBottom>
            Select Capabilities
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={1}>
              {capabilities.length === 0 && (
                <Typography variant="body2" sx={{ pl: 1 }}>
                  No capabilities available
                </Typography>
              )}
              {capabilities.map((capability) => (
                <Grid
                  key={capability.id}
                  sx={{ display: "inline-block", m: 0.5 }}
                >
                  <Chip
                    label={
                      capability.features && Array.isArray(capability.features)
                        ? capability.features
                            .map(
                              (f: any) =>
                                f.feature_name || f.name || f.feature_tag
                            )
                            .join(", ")
                        : `Capability ${capability.id}`
                    }
                    onClick={() => handleCapabilityToggle(capability.id)}
                    color={
                      selectedCapabilities.includes(capability.id)
                        ? "primary"
                        : "default"
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Button
            className="btn"
            type="submit"
            fullWidth
            variant="contained"
            disabled={selectedCapabilities.length === 0}
          >
            Update Role Mapping
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
