import { Container, Typography, Paper, Box } from "@mui/material";
import "../../styles/pages/admin-dashboard.css";

export default function Dashboard() {
  console.log("[ADMIN DASHBOARD] Rendering admin dashboard component");
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography className="page-title" gutterBottom>
        Admin Dashboard
      </Typography>
      <div className="stats-grid">
        <div className="stat-card fade-in">
          <h3>Users</h3>
          <div className="num">0</div>
        </div>
        <div className="stat-card fade-in">
          <h3>Features</h3>
          <div className="num">0</div>
        </div>
        <div className="stat-card fade-in">
          <h3>Capabilities</h3>
          <div className="num">0</div>
        </div>
      </div>
    </Container>
  );
}
