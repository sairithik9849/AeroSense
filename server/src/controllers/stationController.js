import * as windborneService from '../services/windborneService.js';
import * as aviationStationsService from '../services/aviationStationsService.js';

export const getAllStations = async (req, res, next) => {
  try {
    console.log('Received request for all stations');
    const stations = await windborneService.getStations();
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.json(stations);
  } catch (error) {
    if (error.code === 'WINDBORNE_UNAVAILABLE') {
      // WindBorne is down — fall back to aviationweather.gov METAR stations
      try {
        const aviationStations = await aviationStationsService.getAviationStations();
        res.setHeader('Cache-Control', 's-maxage=3600');
        return res.json(aviationStations);
      } catch (aviationError) {
        console.warn('Aviation station fallback also failed:', aviationError.message);
      }

      // Both sources exhausted — signal demo eligibility to the frontend
      const fallbackStatus = await windborneService.getStationFallbackStatus();
      return res.status(503).json({
        error: 'Station service temporarily unavailable',
        degraded: true,
        reason: 'WINDBORNE_UNAVAILABLE',
        source: 'WindBorne',
        cacheEmpty: fallbackStatus.cacheEmpty,
        demoEligible: Boolean(fallbackStatus.cacheEmpty),
      });
    }
    next(error);
  }
};
