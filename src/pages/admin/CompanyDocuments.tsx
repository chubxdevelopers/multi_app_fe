import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Tabs,
  Tab,
  TextField,
  Card,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import api, { buildFullApiUrl, API_HOST } from "../../utils/axiosConfig";

import "../../styles/pages/company-documents.css";

export default function CompanyDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"company" | "team">("company");
  const [teamId, setTeamId] = useState<string | "">("");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [medicineInput, setMedicineInput] = useState("");
  const [savingMedicine, setSavingMedicine] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let resource = "company_documents";
      const filters: any = {};
      if (tab === "team") {
        resource = "team_documents";
        if (String(teamId).match(/^\d+$/)) filters.team_id = Number(teamId);
      }
      const payload = { operation: "query", resource, filters };
      const url = `${API_HOST}/api/query/v1/base_resource`;
      const resp = await api.post(url, payload);
      let rows: any[] = [];
      if (resp && resp.data) {
        const d = resp.data;
        if (Array.isArray(d)) rows = d;
        else if (d && Array.isArray(d.data)) rows = d.data;
        else if (d && d.success && Array.isArray(d.data)) rows = d.data;
        else rows = [];
      }
      setDocs(rows || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleFile = async (f: File) => {
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("doc_file", f);
      const resource = tab === "team" ? "team_documents" : "company_documents";
      fd.append("resource", resource);
      if (tab === "team" && String(teamId).match(/^\d+$/))
        fd.append("team_id", String(teamId));
      fd.append("medicine", medicineInput.trim());

      const url = `${API_HOST}/api/query/v1/upload_document`;
      console.debug("Uploading document to:", url);
      const resp = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        try {
          const parsed = JSON.parse(txt);
          setError(parsed?.error || `Upload failed (status ${resp.status})`);
        } catch (e) {
          const snippet =
            txt && txt.length > 200 ? txt.slice(0, 200) + "..." : txt;
          setError(`Upload failed (status ${resp.status}): ${snippet}`);
        }
        return;
      }

      let json: any = null;
      try {
        json = await resp.json();
      } catch (e) {
        const txt = await resp.text();
        setError(`Upload succeeded but returned invalid JSON: ${txt}`);
        return;
      }

      if (json && json.success) {
        setSuccess("Uploaded successfully");
        load();
      } else {
        setError(
          json?.error ||
            `Upload failed (status ${resp.status})` ||
            "Upload failed"
        );
      }
    } catch (e: any) {
      setError(e?.message || "Upload error");
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      const resource = tab === "team" ? "team_documents" : "company_documents";
      const payload = { operation: "delete", resource, data: { id } };
      const url = `${API_HOST}/api/query/v1/base_resource`;
      const resp = await api.post(url, payload);
      if (resp && resp.data) {
        setSuccess("Deleted");
        load();
      }
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const handleSaveMedicine = async () => {
    if (!selectedDocId || !medicineInput.trim()) {
      setError("Select a document and enter a medicine name");
      return;
    }

    setSavingMedicine(true);
    setError(null);
    try {
      const url = `${API_HOST}/api/update_document_medicine`;
      const resp = await api.post(url, {
        document_id: selectedDocId,
        medicine: medicineInput.trim(),
      });

      if (resp && resp.data && resp.data.success) {
        setSuccess("Medicine tagged successfully");
        setMedicineInput("");
        setSelectedDocId(null);
        setTimeout(() => load(), 500);
      } else {
        setError(resp?.data?.error || "Failed to save medicine tag");
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.error || e?.message || "Error saving medicine tag"
      );
    } finally {
      setSavingMedicine(false);
    }
  };

  return (
    <Container className="company-docs-page">
      <Typography className="page-title" sx={{ my: 2 }}>
        Documents
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Company" value="company" />
        <Tab label="Team" value="team" />
      </Tabs>

      <div
        className="card fade-in company-docs"
        style={{ marginBottom: "1rem" }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {tab === "team" && (
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              label="Filter by team id"
              value={teamId}
              onChange={(e) =>
                setTeamId(String(e.target.value).replace(/\D/g, ""))
              }
              size="small"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />
            <Button
              className="btn"
              variant="outlined"
              onClick={() => load()}
              sx={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              Refresh
            </Button>
          </Box>
        )}

        {/* Medicine Tagging Card */}
        <Card sx={{ p: 2, mb: 3 }}>
          <Typography fontWeight={600} fontSize={14} mb={1}>
            Tag Document with Medicine
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              placeholder="Medicine name"
              size="small"
              fullWidth
              value={medicineInput}
              onChange={(e) => setMedicineInput(e.target.value)}
            />
          </Box>
        </Card>

        <input
          id={tab === "team" ? "team-doc-upload" : "company-doc-upload"}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) handleFile(f);
          }}
        />
        <label
          htmlFor={tab === "team" ? "team-doc-upload" : "company-doc-upload"}
        >
          <Button
            component="span"
            className="upload-button btn"
            startIcon={<UploadFileIcon />}
          >
            UPLOAD DOCUMENT
          </Button>
        </label>
      </div>
    </Container>
  );
}
