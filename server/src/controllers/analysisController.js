import * as unifiedWeatherService from '../services/unifiedWeatherService.js';
import * as windborneService from '../services/windborneService.js';
import * as geminiService from '../services/geminiService.js';

export const analyzeStation = async (req, res, next) => {
  const { station, demo } = req.query;
  if (!station) {
    return res.status(400).json({ error: 'Station ID required' });
  }

  try {
    if (demo === 'true') {
      const demoStation = windborneService.getDemoStation();
      const weatherData = windborneService.getDemoWeather(station);

      const analysis = await geminiService.analyzeStationData(
        {
          id: station,
          name: demoStation.station_name,
          lat: demoStation.latitude,
          lng: demoStation.longitude,
          estimated: true,
        },
        weatherData.points,
        weatherData.current
      );

      return res.json({
        ...analysis,
        degraded: true,
        degradedReasons: ['WINDBORNE_UNAVAILABLE', 'DEMO_MODE'],
        demoMode: true,
      });
    }

    // Get station info
    let stationInfo = null;
    let stationEnrichmentFailed = false;
    try {
      const stations = await windborneService.getStations();
      const stationData = stations.find(s => s.station_id === station);
      if (stationData) {
        stationInfo = {
          id: stationData.station_id,
          name: stationData.station_name,
          lat: stationData.latitude,
          lng: stationData.longitude,
        };
      }
    } catch (err) {
      console.warn(`Could not fetch station info for ${station}:`, err.message);
      stationEnrichmentFailed = true;
    }

    if (!stationInfo) {
      stationInfo = {
        id: station,
        name: station,
        lat: null,
        lng: null,
        estimated: true,
      };
    }

    // Get all historical weather data
    const weatherData = await unifiedWeatherService.getUnifiedWeather(
      station,
      stationInfo,
      'hybrid' // Get both METAR and WindBorne data
    );

    if (!weatherData || !weatherData.points || weatherData.points.length === 0) {
      return res.status(503).json({
        error: 'No weather data available right now. Upstream providers may be unavailable.',
        degraded: true,
      });
    }

    // Analyze with Gemini
    const analysis = await geminiService.analyzeStationData(
      stationInfo,
      weatherData.points,
      weatherData.current
    );

    res.json({
      ...analysis,
      degraded: Boolean(weatherData?.degraded || stationEnrichmentFailed),
      degradedReasons: [
        ...(Array.isArray(weatherData?.degradedReasons) ? weatherData.degradedReasons : []),
        ...(stationEnrichmentFailed ? ['STATION_ENRICHMENT_UNAVAILABLE'] : []),
      ],
      stationEnrichmentFailed,
    });
  } catch (error) {
    if (error.message.includes('GEMINI_API_KEY')) {
      return res.status(500).json({ 
        error: 'AI analysis service not configured. Please set GEMINI_API_KEY environment variable.' 
      });
    }
    console.error('Analysis error:', error.message);
    next(error);
  }
};

