import * as unifiedWeatherService from '../services/unifiedWeatherService.js';
import * as windborneService from '../services/windborneService.js';
import * as aviationStationsService from '../services/aviationStationsService.js';

export const getWeather = async (req, res, next) => {
  const { station, source, demo } = req.query;
  if (!station) {
    return res.status(400).json({ error: 'Station ID required' });
  }

  try {
    if (demo === 'true') {
      const demoWeather = windborneService.getDemoWeather(station);
      return res.json(demoWeather);
    }

    // Determine source preference
    const sourcePreference = source === 'metar' || source === 'windborne' 
      ? source 
      : 'hybrid';

    // Get station info for coordinate-based METAR lookup if needed
    let stationInfo = null;
    let stationEnrichmentFailed = false;
    try {
      let stations;
      try {
        stations = await windborneService.getStations();
      } catch {
        // WindBorne down — try aviation stations for coordinate enrichment
        stations = await aviationStationsService.getAviationStations();
      }
      const stationData = stations.find(s => s.station_id === station);
      if (stationData) {
        stationInfo = {
          lat: stationData.latitude,
          lng: stationData.longitude,
          name: stationData.station_name,
        };
        console.log(`Station info for ${station}: ${stationData.station_name} at ${stationData.latitude},${stationData.longitude}`);
      } else {
        console.log(`Station ${station} not found in station list`);
      }
    } catch (err) {
      console.warn(`Could not fetch station info for ${station}:`, err.message);
      stationEnrichmentFailed = true;
    }

    // Get unified weather data
    const weather = await unifiedWeatherService.getUnifiedWeather(
      station,
      stationInfo,
      sourcePreference
    );
    
    // Handle case where station is not found (returns null)
    if (weather === null) {
      if (sourcePreference === 'hybrid' || sourcePreference === 'metar') {
        return res.status(503).json({
          error: 'Weather data providers are temporarily unavailable',
          degraded: true,
          source: sourcePreference,
          station,
        });
      }
      return res.status(404).json({ error: 'Station not found or invalid' });
    }

    const degradedReasons = Array.isArray(weather.degradedReasons)
      ? [...weather.degradedReasons]
      : [];
    if (stationEnrichmentFailed) {
      degradedReasons.push('STATION_ENRICHMENT_UNAVAILABLE');
    }

    const responsePayload = {
      ...weather,
      degraded: Boolean(weather.degraded || stationEnrichmentFailed),
      degradedReasons,
      stationEnrichmentFailed,
    };
    
    res.json(responsePayload);
  } catch (error) {
    if (error.message === 'Rate limit exceeded') {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 min.' });
    }
    next(error);
  }
};
