import apiClient from '../utils/apiClient.js';
import { getCache, getStaleCache, setCache, setStaleCache } from '../utils/cache.js';
import { StationSchema, WeatherResponseSchema } from '../utils/validation.js';
import { z } from 'zod';

const BASE_URL = 'https://sfc.windbornesystems.com';

const createProviderUnavailableError = (message, cause = null) => {
  const error = new Error(message);
  error.code = 'WINDBORNE_UNAVAILABLE';
  if (cause) {
    error.cause = cause;
  }
  return error;
};

export const getStations = async () => {
  const cacheKey = 'windborne:stations';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiClient.get(`${BASE_URL}/stations`);
    
    // Handle case where Axios doesn't parse JSON automatically
    const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    
    console.log(`Received ${rawData.length} stations from API`);
    // console.log('Sample station:', JSON.stringify(rawData[44], null, 2)); // Debug specific failing item

    const stations = z.array(StationSchema).parse(rawData);
    console.log('Stations validated successfully');
    
    await setCache(cacheKey, stations, 86400); // 24 hours
    await setStaleCache(cacheKey, stations); // 7 days backup for provider outages
    return stations;
  } catch (error) {
    console.error('Error fetching stations:', error.message);

    const staleStations = await getStaleCache(cacheKey);
    if (staleStations) {
      console.warn('Using stale WindBorne station cache due to upstream outage');
      return staleStations;
    }

    throw createProviderUnavailableError('WindBorne station service unavailable', error);
  }
};

export const getHistoricalWeather = async (stationId) => {
  const cacheKey = `windborne:weather:${stationId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiClient.get(`${BASE_URL}/historical_weather`, {
      params: { station: stationId },
    });

    // Handle case where Axios doesn't parse JSON automatically
    // Note: API may return JSON with text/plain Content-Type, so we try parsing regardless
    let rawData;
    if (typeof response.data === 'string') {
      try {
        rawData = JSON.parse(response.data);
      } catch (parseError) {
        const contentType = response.headers['content-type'] || '';
        console.error(`JSON parse error for ${stationId}:`, parseError.message);
        console.error(`Content-Type: ${contentType}`);
        console.error(`Response data preview: ${response.data.substring(0, 200)}`);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
    } else {
      rawData = response.data;
    }

    // Validate structure
    const weatherData = WeatherResponseSchema.parse(rawData);

    // Filter valid data points
    weatherData.points = weatherData.points.filter(pt => 
      pt.temperature !== null &&
      pt.temperature < 150 && 
      pt.temperature > -100
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (weatherData.points.length === 0) {
      console.warn(`Warning: All data points filtered out for station ${stationId}`);
    }

    await setCache(cacheKey, weatherData, 300); // 5 minutes
    return weatherData;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const contentType = error.response.headers['content-type'] || '';
      
      console.error(`API Error for ${stationId}: ${status} - Content-Type: ${contentType}`);
      
      // Log response data if available (but be careful with non-JSON)
      if (error.response.data) {
        const dataPreview = typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 200)
          : JSON.stringify(error.response.data).substring(0, 200);
        console.error(`Response preview: ${dataPreview}`);
      }
      
      if (status === 429) {
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
        throw rateLimitError;
      }
      
      // Handle 404 (Not Found) and 400 (Bad Request - e.g. invalid ID)
      if (status === 404 || status === 400) {
        console.warn(`Station ${stationId} not found or invalid (Status: ${status}).`);
        return null; // Return null to indicate no data
      }

      if (status >= 500) {
        throw createProviderUnavailableError(`WindBorne weather service unavailable (${status})`, error);
      }
    } else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      // Handle JSON parsing errors specifically
      console.error(`JSON parsing error for ${stationId}:`, error.message);
      throw createProviderUnavailableError(`Invalid response format from API: ${error.message}`, error);
    } else {
      console.error(`Network/Code Error for ${stationId}:`, error.message);
      throw createProviderUnavailableError(`WindBorne weather request failed: ${error.message}`, error);
    }
    
    // Include timestamp to verify code update
    const timestamp = new Date().toISOString();
    throw createProviderUnavailableError(`Failed to fetch weather data: ${error.message} (Time: ${timestamp})`, error);
  }
};
