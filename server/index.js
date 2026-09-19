const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "MediCuro Global API Server", time: new Date().toISOString() });
});

// Serve static frontend assets from client/dist
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// Fallback for HTML5 client-side routing
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`[MediCuro Global] REST API Server running on port ${PORT}`);
  console.log(`[MediCuro Global] Base currency: USD | Multi-currency engine active`);
});
