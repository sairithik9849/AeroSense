import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/api.js";

/* global process *///

// Validate required environment variables at startup
const requiredEnvVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const optionalEnvVars = ['GEMINI_API_KEY', 'OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'];

const missingRequired = requiredEnvVars.filter(v => !process.env[v]);
const missingOptional = optionalEnvVars.filter(v => !process.env[v]);

if (missingRequired.length > 0) {
  console.warn(`⚠️  WARNING: Missing required environment variables: ${missingRequired.join(', ')}`);
  console.warn('Redis caching will use in-memory cache (not suitable for production serverless).');
}

if (missingOptional.length > 0) {
  console.warn(`⚠️  WARNING: Missing optional environment variables: ${missingOptional.join(', ')}`);
  if (missingOptional.includes('GEMINI_API_KEY')) {
    console.warn('AI analysis features will not be available.');
  }
  if (missingOptional.includes('OPENSKY_CLIENT_ID') || missingOptional.includes('OPENSKY_CLIENT_SECRET')) {
    console.warn('OpenSky API will use anonymous access (lower rate limits).');
  }
}

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route Not found" });
});

// Global Error Handler
app.use((err, req, res) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log("Your routes will be running on http://localhost:3000");
});
