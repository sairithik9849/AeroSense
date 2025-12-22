import { Router } from 'express';
import * as stationController from '../controllers/stationController.js';
import * as weatherController from '../controllers/weatherController.js';
import * as flightController from '../controllers/flightController.js';
import * as analysisController from '../controllers/analysisController.js';

const router = Router();

router.get('/stations', stationController.getAllStations);
router.get('/weather', weatherController.getWeather);
router.get('/flights', flightController.getFlights);
router.get('/analyze', analysisController.analyzeStation);

export default router;
