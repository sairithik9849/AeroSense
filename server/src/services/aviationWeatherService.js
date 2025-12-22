import apiClient from '../utils/apiClient.js';
import { getCache, setCache } from '../utils/cache.js';

const METAR_BASE_URL = 'https://aviationweather.gov/api/data/metar';

/**
 * Parses METAR string to extract weather data
 * METAR format: https://en.wikipedia.org/wiki/METAR
 * Example: "KJFK 211851Z 28015G25KT 10SM FEW250 12/08 A3015"
 */
const parseMETAR = (metarString) => {
  if (!metarString || typeof metarString !== 'string') {
    return null;
  }

  const result = {
    station: null,
    timestamp: null,
    wind_speed: null,
    wind_direction: null,
    wind_gust: null,
    visibility: null,
    temperature: null,
    dewpoint: null,
    pressure: null,
    cloud_cover: [],
    raw: metarString,
  };

  // Extract station code (first 4-letter code)
  const stationMatch = metarString.match(/^([A-Z]{4})\s/);
  if (stationMatch) {
    result.station = stationMatch[1];
  }

  // Extract wind (format: DDDssKT or DDDssGggKT)
  // Examples: 28015KT, 28015G25KT, VRB05KT, 00000KT
  const windMatch = metarString.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/);
  if (windMatch) {
    result.wind_direction = windMatch[1] === 'VRB' ? null : parseInt(windMatch[1], 10);
    result.wind_speed = parseInt(windMatch[2], 10);
    if (windMatch[4]) {
      result.wind_gust = parseInt(windMatch[4], 10);
    }
  }

  // Extract temperature/dewpoint (format: TT/TT or MTT/MTT)
  // Example: 12/08 or M05/M10
  const tempMatch = metarString.match(/(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    const tempStr = tempMatch[1].replace('M', '-');
    const dewStr = tempMatch[2].replace('M', '-');
    result.temperature = parseFloat(tempStr);
    result.dewpoint = parseFloat(dewStr);
    // Convert Celsius to Fahrenheit for consistency
    result.temperature = (result.temperature * 9/5) + 32;
    result.dewpoint = (result.dewpoint * 9/5) + 32;
  }

  // Extract pressure (format: A#### or Q####)
  // A#### is inches of mercury, Q#### is hectopascals
  const pressureMatch = metarString.match(/([AQ])(\d{4})/);
  if (pressureMatch) {
    const value = parseInt(pressureMatch[2], 10);
    if (pressureMatch[1] === 'A') {
      // Convert inches Hg to hPa
      result.pressure = Math.round(value / 100 * 33.8639);
    } else {
      result.pressure = value;
    }
  }

  // Extract visibility (format: ##SM or ####)
  const visMatch = metarString.match(/(\d+(?:\.\d+)?)SM/);
  if (visMatch) {
    result.visibility = parseFloat(visMatch[1]);
  }

  return result;
};

/**
 * Converts wind direction and speed to wind_x and wind_y components
 * @param {number} direction - Wind direction in degrees (0-360, where 0 is North)
 * @param {number} speed - Wind speed in knots
 * @returns {Object} - {wind_x, wind_y} in knots
 */
const windToComponents = (direction, speed) => {
  if (direction === null || speed === null) {
    return { wind_x: null, wind_y: null };
  }

  // METAR wind direction is where wind is FROM (meteorological convention)
  // Convert to radians, adjusting for standard math convention (0° = East)
  const radians = ((direction - 90) * Math.PI) / 180;
  
  // Calculate components (x = East, y = North)
  const wind_x = speed * Math.cos(radians);
  const wind_y = speed * Math.sin(radians);

  return { wind_x, wind_y };
};

/**
 * Fetches METAR data for a station
 * @param {string} icaoCode - ICAO station code (e.g., "KJFK")
 * @returns {Object|null} - Parsed METAR data or null if not found
 */
export const getMETAR = async (icaoCode) => {
  if (!icaoCode || icaoCode.length !== 4) {
    console.log(`Invalid ICAO code format: ${icaoCode}`);
    return null;
  }

  const cacheKey = `metar:${icaoCode}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    // Check if cached data is still fresh (< 3 minutes)
    const age = (Date.now() - cached.timestamp) / 1000 / 60;
    if (age < 3) {
      console.log(`Using cached METAR data for ${icaoCode} (${age.toFixed(1)} min old)`);
      return cached.data;
    }
  }

  try {
    console.log(`Fetching METAR for ${icaoCode} from AviationWeather API...`);
    
    // For US airports, try with "K" prefix if not already present
    let codesToTry = [icaoCode];
    if (icaoCode.length === 3 && /^[A-Z]{3}$/.test(icaoCode)) {
      codesToTry = [`K${icaoCode}`, icaoCode]; // Try K-prefix first for US airports
    } else if (icaoCode.length === 4 && !icaoCode.startsWith('K') && /^[A-Z]{4}$/.test(icaoCode)) {
      // If it's 4 chars but not US format, might be international - try as-is
      codesToTry = [icaoCode];
    }
    
    let response = null;
    let lastError = null;
    
    for (const code of codesToTry) {
      try {
        response = await apiClient.get(METAR_BASE_URL, {
          params: {
            ids: code,
            format: 'raw',
            hours: 1, // Get last hour of data
          },
          timeout: 10000, // Increased timeout
        });
        console.log(`✓ METAR API responded for ${code}`);
        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        console.log(`✗ METAR API failed for ${code}: ${err.response?.status || err.message}`);
        continue; // Try next code
      }
    }
    
    if (!response) {
      throw lastError || new Error('All METAR code attempts failed');
    }

    console.log(`METAR API response status: ${response.status}`);

    // METAR API returns text/plain with one METAR per line
    const metarText = typeof response.data === 'string' 
      ? response.data 
      : response.data?.data || '';

    console.log(`METAR response length: ${metarText.length} chars`);

    if (!metarText || metarText.trim().length === 0) {
      console.log(`No METAR data returned for ${icaoCode}`);
      return null;
    }

    // Get the most recent METAR (usually the first line)
    const metarLines = metarText.trim().split('\n').filter(line => line.trim());
    console.log(`Found ${metarLines.length} METAR lines`);
    
    if (metarLines.length === 0) {
      console.log(`No valid METAR lines found for ${icaoCode}`);
      return null;
    }

    const latestMETAR = metarLines[0];
    console.log(`Parsing METAR: ${latestMETAR.substring(0, 50)}...`);
    const parsed = parseMETAR(latestMETAR);

    if (!parsed) {
      console.log(`Failed to parse METAR for ${icaoCode}`);
      return null;
    }

    // Convert to our standard format
    const now = new Date();
    const windComponents = windToComponents(parsed.wind_direction, parsed.wind_speed);

    const weatherData = {
      timestamp: now.toISOString(),
      temperature: parsed.temperature,
      wind_x: windComponents.wind_x,
      wind_y: windComponents.wind_y,
      wind_gust: parsed.wind_gust,
      wind_direction: parsed.wind_direction,
      dewpoint: parsed.dewpoint,
      pressure: parsed.pressure,
      visibility: parsed.visibility,
      precip: null, // METAR doesn't always include precipitation
      source: 'METAR',
      raw_metar: parsed.raw,
    };

    // Cache for 2 minutes
    await setCache(cacheKey, { data: weatherData, timestamp: Date.now() }, 120);

    return weatherData;
  } catch (error) {
    // Log more details for debugging
    if (error.response) {
      console.error(`METAR fetch error for ${icaoCode}: ${error.response.status} - ${error.response.statusText}`);
    } else {
      console.error(`METAR fetch error for ${icaoCode}:`, error.message);
    }
    return null;
  }
};

/**
 * Fetches METAR data using coordinates (finds nearest station)
 * Note: AviationWeather API may not support direct coordinate queries.
 * This function attempts to use radius-based query if supported.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Search radius in nautical miles (default 50)
 * @returns {Object|null} - Parsed METAR data or null if not found
 */
export const getMETARByCoordinates = async (lat, lng, radius = 50) => {
  const cacheKey = `metar:coords:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    const age = (Date.now() - cached.timestamp) / 1000 / 60;
    if (age < 3) {
      return cached.data;
    }
  }

  try {
    // Try radius-based query (some APIs support this)
    // AviationWeather API format may vary - try multiple approaches
    let response;
    
    try {
      // Attempt 1: Try with radius parameter
      response = await apiClient.get(METAR_BASE_URL, {
        params: {
          lat: lat.toFixed(4),
          lon: lng.toFixed(4),
          radius: radius,
          format: 'raw',
          hours: 1,
        },
        timeout: 5000,
      });
    } catch {
      // Attempt 2: Try without radius
      try {
        response = await apiClient.get(METAR_BASE_URL, {
          params: {
            lat: lat.toFixed(4),
            lon: lng.toFixed(4),
            format: 'raw',
            hours: 1,
          },
          timeout: 5000,
        });
      } catch {
        // Coordinate-based queries not supported by AviationWeather API
        // This is expected - system will fall back to WindBorne data
        return null;
      }
    }

    // Check if response indicates error
    if (response.status === 400 || response.status >= 400) {
      // Coordinate queries not supported - this is expected, fallback to WindBorne
      return null;
    }

    const metarText = typeof response.data === 'string' 
      ? response.data 
      : response.data?.data || '';

    if (!metarText || metarText.trim().length === 0) {
      return null;
    }

    const metarLines = metarText.trim().split('\n').filter(line => line.trim());
    if (metarLines.length === 0) {
      return null;
    }

    const latestMETAR = metarLines[0];
    const parsed = parseMETAR(latestMETAR);

    if (!parsed) {
      return null;
    }

    const now = new Date();
    const windComponents = windToComponents(parsed.wind_direction, parsed.wind_speed);

    const weatherData = {
      timestamp: now.toISOString(),
      temperature: parsed.temperature,
      wind_x: windComponents.wind_x,
      wind_y: windComponents.wind_y,
      wind_gust: parsed.wind_gust,
      wind_direction: parsed.wind_direction,
      dewpoint: parsed.dewpoint,
      pressure: parsed.pressure,
      visibility: parsed.visibility,
      precip: null,
      source: 'METAR',
      raw_metar: parsed.raw,
    };

    await setCache(cacheKey, { data: weatherData, timestamp: Date.now() }, 120);

    return weatherData;
  } catch (error) {
    // Handle 400 errors gracefully - coordinate queries may not be supported by the API
    if (error.response && error.response.status === 400) {
      // This is expected - coordinate queries aren't always supported
      // The unified service will fall back to WindBorne data
      return null;
    }
    // Only log actual errors, not expected 400s
    if (error.response && error.response.status !== 400) {
      console.error(`METAR fetch error for coordinates ${lat},${lng}: ${error.response.status} - ${error.response.statusText}`);
    }
    return null;
  }
};

