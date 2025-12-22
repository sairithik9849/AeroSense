import * as windborneService from './windborneService.js';
import * as aviationWeatherService from './aviationWeatherService.js';
import { getICAOCode } from '../utils/stationMapper.js';
import { WeatherResponseSchema } from '../utils/validation.js';

/**
 * Calculates the age of a data point in minutes
 * @param {string} timestamp - ISO timestamp string
 * @returns {number} - Age in minutes
 */
const calculateDataAge = (timestamp) => {
  if (!timestamp) return null;
  const dataTime = new Date(timestamp);
  const now = new Date();
  return Math.round((now - dataTime) / 1000 / 60);
};

/**
 * Gets the most recent data point from WindBorne historical data
 * @param {Object} windborneData - WindBorne weather response
 * @returns {Object|null} - Most recent point or null
 */
const getMostRecentWindBornePoint = (windborneData) => {
  if (!windborneData || !windborneData.points || windborneData.points.length === 0) {
    return null;
  }

  // Points are already sorted by timestamp
  const latest = windborneData.points[windborneData.points.length - 1];
  
  // Calculate age
  const age = calculateDataAge(latest.timestamp);
  
  return {
    ...latest,
    source: 'WindBorne',
    dataAge: age,
    isRealTime: age !== null && age < 30, // Consider < 30 min as "real-time enough"
  };
};

/**
 * Merges METAR and WindBorne data into a unified format
 * @param {Object} metarData - METAR weather data
 * @param {Object} windborneData - WindBorne historical data
 * @param {string} stationId - Station ID
 * @param {Object} metarMetadata - METAR attempt metadata
 * @returns {Object} - Unified weather response
 */
const mergeWeatherData = (metarData, windborneData, stationId, metarMetadata = {}) => {
  const metarAge = metarData ? calculateDataAge(metarData.timestamp) : null;
  const windborneLatest = getMostRecentWindBornePoint(windborneData);

  // Determine primary source and current point
  let currentPoint;
  let source;
  let isRealTime;

  if (metarData && metarAge !== null && metarAge < 30) {
    // METAR is fresh, use it as primary
    currentPoint = {
      ...metarData,
      source: 'METAR',
      dataAge: metarAge,
      isRealTime: true,
    };
    source = 'hybrid';
    isRealTime = true;
  } else if (windborneLatest && windborneLatest.isRealTime) {
    // WindBorne has recent data
    currentPoint = windborneLatest;
    source = 'WindBorne';
    isRealTime = true;
  } else if (metarData) {
    // METAR exists but is stale, still use it
    currentPoint = {
      ...metarData,
      source: 'METAR',
      dataAge: metarAge,
      isRealTime: false,
    };
    source = 'METAR';
    isRealTime = false;
  } else if (windborneLatest) {
    // Only WindBorne available
    currentPoint = windborneLatest;
    source = 'WindBorne';
    isRealTime = false;
  } else {
    // No data available
    return null;
  }

  // Build response with historical points from WindBorne
  const response = {
    points: windborneData?.points || [],
    current: currentPoint,
    source,
    dataAge: currentPoint.dataAge,
    isRealTime,
    station: stationId,
    metarAttempted: metarMetadata.metarAttempted || false,
    metarUnavailable: metarMetadata.metarUnavailable || false,
    metarIcaoCode: metarMetadata.metarIcaoCode || null,
  };

  // If we have METAR, add it as the most recent point
  if (metarData && metarAge !== null && metarAge < 30) {
    // Add METAR point to the beginning of points array (most recent)
    response.points = [
      ...(windborneData?.points || []),
      {
        timestamp: metarData.timestamp,
        temperature: metarData.temperature,
        wind_x: metarData.wind_x,
        wind_y: metarData.wind_y,
        dewpoint: metarData.dewpoint,
        pressure: metarData.pressure,
        precip: metarData.precip,
        wind_gust: metarData.wind_gust,
        wind_direction: metarData.wind_direction,
        visibility: metarData.visibility,
        source: 'METAR',
      },
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  return response;
};

/**
 * Gets unified weather data combining METAR and WindBorne sources
 * @param {string} stationId - WindBorne station ID
 * @param {Object} stationInfo - Optional station info with lat/lng
 * @param {string} sourcePreference - 'metar', 'windborne', or 'hybrid' (default)
 * @returns {Object|null} - Unified weather data or null
 */
export const getUnifiedWeather = async (stationId, stationInfo = null, sourcePreference = 'hybrid') => {
  let metarData = null;
  let windborneData = null;
  let metarAttempted = false;
  let metarUnavailable = false;
  let metarIcaoCode = null;

  // Fetch METAR if requested
  if (sourcePreference === 'metar' || sourcePreference === 'hybrid') {
    try {
      // Try to get ICAO code
      const icaoCode = getICAOCode(stationId, stationInfo);
      metarAttempted = true;
      
      if (icaoCode) {
        metarIcaoCode = icaoCode;
        console.log(`Attempting METAR fetch for station ${stationId} using ICAO code: ${icaoCode}`);
        metarData = await aviationWeatherService.getMETAR(icaoCode);
        if (metarData) {
          console.log(`✓ METAR data retrieved for ${icaoCode}`);
        } else {
          console.log(`✗ METAR data not available for ${icaoCode}`);
          metarUnavailable = true;
        }
      } else {
        console.log(`Station ${stationId} is not a recognized ICAO code, skipping METAR lookup`);
        metarUnavailable = true;
        // Try coordinate-based lookup as fallback
        if (stationInfo && stationInfo.lat && stationInfo.lng) {
          console.log(`Attempting coordinate-based METAR lookup for ${stationInfo.lat},${stationInfo.lng}`);
          metarData = await aviationWeatherService.getMETARByCoordinates(
            stationInfo.lat,
            stationInfo.lng
          );
          if (!metarData) {
            metarUnavailable = true;
          }
        }
      }
    } catch (error) {
      console.warn(`METAR fetch failed for ${stationId}:`, error.message);
      metarUnavailable = true;
    }
  }

  // Fetch WindBorne if requested
  if (sourcePreference === 'windborne' || sourcePreference === 'hybrid') {
    try {
      windborneData = await windborneService.getHistoricalWeather(stationId);
    } catch (error) {
      console.warn(`WindBorne fetch failed for ${stationId}:`, error.message);
    }
  }

  // Handle source-specific requests
  if (sourcePreference === 'metar') {
    if (!metarData) {
      return null;
    }
    const age = calculateDataAge(metarData.timestamp);
    const currentPoint = {
      ...metarData,
      source: 'METAR',
      dataAge: age,
      isRealTime: age !== null && age < 30,
    };
    return {
      points: [currentPoint],
      current: currentPoint,
      source: 'METAR',
      dataAge: age,
      isRealTime: age !== null && age < 30,
      station: stationId,
      metarAttempted: metarAttempted,
      metarUnavailable: metarUnavailable,
      metarIcaoCode: metarIcaoCode,
    };
  }

  if (sourcePreference === 'windborne') {
    if (!windborneData) {
      return null;
    }
    const latest = getMostRecentWindBornePoint(windborneData);
    return {
      points: windborneData.points || [],
      current: latest,
      source: 'WindBorne',
      dataAge: latest?.dataAge || null,
      isRealTime: latest?.isRealTime || false,
      station: stationId,
      metarAttempted: false,
      metarUnavailable: false,
      metarIcaoCode: null,
    };
  }

  // Hybrid: merge both sources
  return mergeWeatherData(metarData, windborneData, stationId, {
    metarAttempted,
    metarUnavailable,
    metarIcaoCode,
  });
};

