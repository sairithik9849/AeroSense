import apiClient from '../utils/apiClient.js';
import { OpenSkyResponseSchema } from '../utils/validation.js';
import process from 'node:process';

const BASE_URL = 'https://opensky-network.org/api/states/all';

/**
 * Get Basic Auth header for OpenSky Network
 * OpenSky REST API supports Basic Authentication
 */
const getAuthHeader = () => {
  const username = process.env.OPENSKY_CLIENT_ID;
  const password = process.env.OPENSKY_CLIENT_SECRET;

  console.log('[OpenSky] Checking credentials - Username:', username ? 'SET' : 'NOT SET', 'Password:', password ? 'SET' : 'NOT SET');

  if (!username || !password) {
    console.log('[OpenSky] No API credentials found - using anonymous access');
    return null;
  }

  // Use Basic Auth (more reliable than OAuth for OpenSky)
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  console.log('[OpenSky] Using Basic Auth with provided credentials');
  return `Basic ${credentials}`;
};

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate bearing from one point to another
 */
/*
const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
};
*/

/**
 * Check if a flight is within nearby distance threshold
 * Returns the distance to the station if nearby, null if too far
 */
const getNearbyDistance = (flightLat, flightLng, stationLat, stationLng) => {
  // Calculate distance
  const distance = calculateDistance(flightLat, flightLng, stationLat, stationLng);
  
  // Show flights within 50km (85.5 nautical miles) of the station
  // This gives a reasonable search radius without being too wide
  if (distance > 50) return null;
  
  return distance;
};

export const getFlights = async (lat, lng) => {
  // Bounding box ~50km (increased from 20km for better coverage)
  // OpenSky expects: lamin (min latitude), lomin (min longitude), lamax (max latitude), lomax (max longitude)
  const lamin = lat - 0.5;
  const lomin = lng - 0.5;
  const lamax = lat + 0.5;
  const lomax = lng + 0.5;

  console.log(`[OpenSky] Requesting flights for station at lat=${lat}, lng=${lng}`);
  console.log(`[OpenSky] Bounding box: lat [${lamin}, ${lamax}], lng [${lomin}, ${lomax}]`);

  try {
    // Get Basic Auth header if credentials are available
    const authHeader = getAuthHeader();
    
    const headers = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    console.log(`[OpenSky] Making API request to ${BASE_URL}...`);
    const response = await apiClient.get(BASE_URL, {
      params: { lamin, lomin, lamax, lomax },
      headers,
      timeout: 45000, // 45 second timeout for OpenSky (it can be slow)
    });

    console.log(`[OpenSky] API response status: ${response.status}`);
    console.log(`[OpenSky] API response has data:`, !!response.data);
    console.log(`[OpenSky] Response data type:`, typeof response.data);
    
    if (response.data) {
      console.log(`[OpenSky] Response data keys:`, Object.keys(response.data));
    }

    let parsedData;
    try {
      parsedData = OpenSkyResponseSchema.parse(response.data);
    } catch (parseError) {
      console.error(`[OpenSky] Schema validation error:`, parseError.message);
      console.error(`[OpenSky] Response data structure:`, {
        hasTime: 'time' in (response.data || {}),
        hasStates: 'states' in (response.data || {}),
        statesType: Array.isArray(response.data?.states) ? 'array' : typeof response.data?.states,
        statesLength: Array.isArray(response.data?.states) ? response.data.states.length : 'N/A',
      });
      // Try to continue with raw data if validation fails
      if (response.data && typeof response.data === 'object') {
        parsedData = {
          time: response.data.time || Date.now(),
          states: Array.isArray(response.data.states) ? response.data.states : null,
        };
        console.warn(`[OpenSky] Using raw data structure due to validation failure`);
      } else {
        throw parseError;
      }
    }
    
    const rawFlights = parsedData.states || [];

    console.log(`[OpenSky] Found ${rawFlights.length} total flights in bounding box`);
    
    if (rawFlights.length > 0) {
      console.log(`[OpenSky] Sample flight data:`, {
        callsign: rawFlights[0][1],
        lat: rawFlights[0][6],
        lng: rawFlights[0][5],
        altitude: rawFlights[0][7],
      });
    }

    // Filter for relevant flights (increased altitude limit for better detection)
    // Index 7 is baro_altitude in meters
    // Index 9 is velocity
    // Index 10 is true_track
    // First, count flights with valid coordinates (regardless of altitude)
    const flightsWithValidCoords = rawFlights.filter(f => 
      f[6] !== null && f[5] !== null && f[7] !== null
    );
    console.log(`[OpenSky] ${flightsWithValidCoords.length} flights with valid coordinates`);

    // Count flights by altitude ranges for debugging
    const altitudeRanges = {
      below1000: 0,
      below2000: 0,
      below5000: 0,
      above5000: 0,
    };
    
    flightsWithValidCoords.forEach(f => {
      const alt = f[7];
      if (alt < 1000) altitudeRanges.below1000++;
      if (alt < 2000) altitudeRanges.below2000++;
      if (alt < 5000) altitudeRanges.below5000++;
      else altitudeRanges.above5000++;
    });
    
    console.log(`[OpenSky] Altitude distribution:`, altitudeRanges);

    const relevantFlights = rawFlights
      .map(f => {
        // OpenSky state vector: index 5 = longitude, index 6 = latitude
        const flightLng = f[5];
        const flightLat = f[6];
        const altitude = f[7];
        const track = f[10];
        
        // Validate coordinates are numbers and within valid ranges
        if (typeof flightLng !== 'number' || typeof flightLat !== 'number') {
          return null;
        }
        
        // Validate coordinate ranges
        if (flightLat < -90 || flightLat > 90 || flightLng < -180 || flightLng > 180) {
          return null;
        }

        // Calculate distance to station (use station lat/lng from outer scope)
        const distanceToStation = getNearbyDistance(flightLat, flightLng, lat, lng);
        
        return {
          callsign: f[1]?.trim(),
          lng: flightLng,
          lat: flightLat,
          altitude: altitude,
          velocity: f[9],
          track: track,
          distanceToStation: distanceToStation,
        };
      })
      .filter(f => {
        // Filter out null entries (invalid coordinates)
        if (!f) return false;
        
        // Filter out flights with missing critical data
        if (f.lat === null || f.lng === null || f.altitude === null) {
          return false;
        }
        
        // Include flights below 5000 meters (~16,400 ft) for better coverage
        if (f.altitude >= 5000) return false;
        
        // CHANGED: Show all nearby flights (not just approaching ones)
        // This includes departing, approaching, and passing flights
        return f.distanceToStation !== null;
      })
      .sort((a, b) => {
        // Sort by distance (closest first)
        return (a.distanceToStation || 999) - (b.distanceToStation || 999);
      });

    console.log(`[OpenSky] Filtered to ${relevantFlights.length} nearby flights (altitude < 5000m, within 50km of station)`);
    
    return relevantFlights;
  } catch (error) {
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['x-rate-limit-retry-after-seconds'];
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : null;
      
      // Check if we were using authentication
      const wasAuthenticated = error.config?.headers?.Authorization ? 'authenticated' : 'anonymous';
      console.warn(`[OpenSky] Rate limited! (${wasAuthenticated} request) Retry after: ${retryAfterSeconds} seconds`);
      
      if (wasAuthenticated === 'anonymous') {
        console.warn(`[OpenSky] Note: Using API credentials should provide higher rate limits`);
      }
      
      // Return special error object that includes rate limit info
      throw {
        type: 'RATE_LIMITED',
        retryAfterSeconds,
        message: 'OpenSky API rate limit exceeded'
      };
    }
    
    // Log other errors for debugging
    console.error(`[OpenSky] Error occurred:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      hasResponse: !!error.response,
      hasRequest: !!error.request,
    });
    
    if (error.response) {
      console.error(`[OpenSky] Response status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`[OpenSky] Response data:`, JSON.stringify(error.response.data).substring(0, 500));
      }
    } else if (error.request) {
      console.error(`[OpenSky] Request was made but no response received`);
    } else {
      console.error(`[OpenSky] Error setting up request:`, error.message);
    }
    
    // Return empty array on failure to avoid crashing the app
    return [];
  }
};
