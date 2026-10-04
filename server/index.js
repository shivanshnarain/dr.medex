const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware with support for product image uploads
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// API Routes
app.use("/api/admin", adminRoutes);
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "DR.MEDEX Global API Server", time: new Date().toISOString() });
});

// Serve static frontend assets from client/dist
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// Fallback for HTML5 client-side routing
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[DR.MEDEX Global] REST API Server running on port ${PORT}`);
  console.log(`[DR.MEDEX Global] Base currency: INR | Live FX Multi-currency engine active`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[DR.MEDEX Global] Port ${PORT} is already in use by an existing instance.`);
  } else {
    console.error("[DR.MEDEX Global] Server error:", err);
  }
});

