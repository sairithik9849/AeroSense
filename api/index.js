import "dotenv/config";
import express from "express";
import cors from "cors";

// Import controllers directly
import * as stationController from '../server/src/controllers/stationController.js';
import * as weatherController from '../server/src/controllers/weatherController.js';
import * as flightController from '../server/src/controllers/flightController.js';
import * as analysisController from '../server/src/controllers/analysisController.js';

const app = express();

app.use(cors());
app.use(express.json());

// Define routes directly
app.get('/api/stations', stationController.getAllStations);
app.get('/api/weather', weatherController.getWeather);
app.get('/api/flights', flightController.getFlights);
app.get('/api/analyze', analysisController.analyzeStation);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route Not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

export default app;
