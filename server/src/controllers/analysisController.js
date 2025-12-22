import * as unifiedWeatherService from '../services/unifiedWeatherService.js';
import * as windborneService from '../services/windborneService.js';
import * as geminiService from '../services/geminiService.js';

export const analyzeStation = async (req, res, next) => {
  const { station } = req.query;
  if (!station) {
    return res.status(400).json({ error: 'Station ID required' });
  }

  try {
    // Get station info
    let stationInfo = null;
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
    }

    if (!stationInfo) {
      return res.status(404).json({ error: 'Station not found' });
    }

    // Get all historical weather data
    const weatherData = await unifiedWeatherService.getUnifiedWeather(
      station,
      stationInfo,
      'hybrid' // Get both METAR and WindBorne data
    );

    if (!weatherData || !weatherData.points || weatherData.points.length === 0) {
      return res.status(404).json({ error: 'No weather data available for this station' });
    }

    // Analyze with Gemini
    const analysis = await geminiService.analyzeStationData(
      stationInfo,
      weatherData.points,
      weatherData.current
    );

    res.json(analysis);
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

