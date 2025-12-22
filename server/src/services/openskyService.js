import axios from 'axios';
import { OpenSkyResponseSchema } from '../utils/validation.js';
import process from 'node:process';

const OPENSKY_BASE_URL = 'https://opensky-network.org/api/states/all';

// List of CORS/proxy services to try (in order of preference)
const PROXY_SERVICES = [
  // AllOrigins proxy - often works well
  { name: 'allorigins', getUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  // corsproxy.io
  { name: 'corsproxy', getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  // cors-anywhere alternative
  { name: 'corsanywhere', getUrl: (url) => `https://cors-anywhere.herokuapp.com/${url}` },
];

/**
 * Get Basic Auth header for OpenSky Network
 */
const getAuthHeader = () => {
  const username = process.env.OPENSKY_CLIENT_ID;
  const password = process.env.OPENSKY_CLIENT_SECRET;

  console.log('[OpenSky] Checking credentials - Username:', username ? 'SET' : 'NOT SET', 'Password:', password ? 'SET' : 'NOT SET');

  if (!username || !password) {
    console.log('[OpenSky] No API credentials found - using anonymous access');
    return null;
  }

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  console.log('[OpenSky] Using Basic Auth with provided credentials');
  return `Basic ${credentials}`;
};

/**
 * Build the OpenSky API URL with query params
 */
const buildOpenSkyUrl = (lamin, lomin, lamax, lomax) => {
  return `${OPENSKY_BASE_URL}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
};

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Check if a flight is within nearby distance threshold
 */
const getNearbyDistance = (flightLat, flightLng, stationLat, stationLng) => {
  const distance = calculateDistance(flightLat, flightLng, stationLat, stationLng);
  if (distance > 50) return null;
  return distance;
};

/**
 * Try to fetch from OpenSky using various methods
 */
const tryFetchOpenSky = async (lat, lng) => {
  const lamin = lat - 0.5;
  const lomin = lng - 0.5;
  const lamax = lat + 0.5;
  const lomax = lng + 0.5;

  const errors = [];
  const authHeader = getAuthHeader();
  
  // Browser-like headers to avoid blocks
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
  };

  // Method 1: Direct request with auth header and browser-like headers
  try {
    console.log('[OpenSky] Trying Method 1: Direct request with browser headers...');
    
    const response = await axios.get(OPENSKY_BASE_URL, {
      params: { lamin, lomin, lamax, lomax },
      headers: {
        ...browserHeaders,
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data) {
      console.log('[OpenSky] Method 1 SUCCESS!');
      return response.data;
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    const errMsg = error.code || error.message;
    console.log(`[OpenSky] Method 1 failed: ${errMsg}`);
    errors.push({ method: 'direct', error: errMsg });
  }

  // Method 2: Try with URL-embedded auth (sometimes works better)
  try {
    console.log('[OpenSky] Trying Method 2: URL-embedded authentication...');
    const username = process.env.OPENSKY_CLIENT_ID;
    const password = process.env.OPENSKY_CLIENT_SECRET;
    
    if (username && password) {
      const authUrl = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@opensky-network.org/api/states/all`;
      
      const response = await axios.get(authUrl, {
        params: { lamin, lomin, lamax, lomax },
        headers: browserHeaders,
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200 && response.data) {
        console.log('[OpenSky] Method 2 SUCCESS!');
        return response.data;
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } else {
      throw new Error('No credentials');
    }
  } catch (error) {
    const errMsg = error.code || error.message;
    console.log(`[OpenSky] Method 2 failed: ${errMsg}`);
    errors.push({ method: 'url-auth', error: errMsg });
  }

  // Method 3: Try proxy services
  const openSkyUrl = buildOpenSkyUrl(lamin, lomin, lamax, lomax);
  
  for (const proxy of PROXY_SERVICES) {
    try {
      console.log(`[OpenSky] Trying Method 3: ${proxy.name} proxy...`);
      const proxyUrl = proxy.getUrl(openSkyUrl);
      
      const response = await axios.get(proxyUrl, {
        headers: {
          ...browserHeaders,
          ...(authHeader ? { 'Authorization': authHeader } : {}),
          'Origin': 'https://opensky-network.org',
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200 && response.data) {
        // Handle case where proxy returns wrapper object
        const data = response.data.contents || response.data;
        if (data && (data.states !== undefined || data.time !== undefined)) {
          console.log(`[OpenSky] ${proxy.name} proxy SUCCESS!`);
          return data;
        }
      }
      throw new Error(`Invalid response from ${proxy.name}`);
    } catch (error) {
      const errMsg = error.code || error.message;
      console.log(`[OpenSky] ${proxy.name} proxy failed: ${errMsg}`);
      errors.push({ method: proxy.name, error: errMsg });
    }
  }

  // Method 4: Try without bounding box (global data, then filter locally)
  try {
    console.log('[OpenSky] Trying Method 4: Global fetch without bounding box (will filter locally)...');
    
    const response = await axios.get(OPENSKY_BASE_URL, {
      headers: {
        ...browserHeaders,
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      timeout: 60000, // Longer timeout for global fetch
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data) {
      console.log('[OpenSky] Method 4 SUCCESS! (global fetch)');
      return response.data;
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    const errMsg = error.code || error.message;
    console.log(`[OpenSky] Method 4 failed: ${errMsg}`);
    errors.push({ method: 'global-fetch', error: errMsg });
  }

  // Method 5: Try via allorigins with global fetch
  try {
    console.log('[OpenSky] Trying Method 5: AllOrigins proxy with global fetch...');
    const globalUrl = OPENSKY_BASE_URL;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(globalUrl)}`;
    
    const response = await axios.get(proxyUrl, {
      headers: browserHeaders,
      timeout: 60000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data) {
      console.log('[OpenSky] Method 5 SUCCESS!');
      return response.data;
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (error) {
    const errMsg = error.code || error.message;
    console.log(`[OpenSky] Method 5 failed: ${errMsg}`);
    errors.push({ method: 'allorigins-global', error: errMsg });
  }

  // All methods failed
  console.error('[OpenSky] All methods failed:', JSON.stringify(errors, null, 2));
  throw new Error(`All OpenSky fetch methods failed`);
};

export const getFlights = async (lat, lng) => {
  console.log(`[OpenSky] Requesting flights for station at lat=${lat}, lng=${lng}`);

  try {
    const data = await tryFetchOpenSky(lat, lng);
    
    console.log(`[OpenSky] API response received, parsing...`);
    
    if (!data) {
      console.log('[OpenSky] No data received');
      return [];
    }

    let parsedData;
    try {
      parsedData = OpenSkyResponseSchema.parse(data);
    } catch (parseError) {
      console.error(`[OpenSky] Schema validation error:`, parseError.message);
      if (data && typeof data === 'object') {
        parsedData = {
          time: data.time || Date.now(),
          states: Array.isArray(data.states) ? data.states : null,
        };
        console.warn(`[OpenSky] Using raw data structure due to validation failure`);
      } else {
        throw parseError;
      }
    }
    
    const rawFlights = parsedData.states || [];
    console.log(`[OpenSky] Found ${rawFlights.length} total flights`);
    
    if (rawFlights.length > 0) {
      console.log(`[OpenSky] Sample flight:`, {
        callsign: rawFlights[0][1],
        lat: rawFlights[0][6],
        lng: rawFlights[0][5],
        altitude: rawFlights[0][7],
      });
    }

    const relevantFlights = rawFlights
      .map(f => {
        const flightLng = f[5];
        const flightLat = f[6];
        const altitude = f[7];
        const track = f[10];
        
        if (typeof flightLng !== 'number' || typeof flightLat !== 'number') {
          return null;
        }
        
        if (flightLat < -90 || flightLat > 90 || flightLng < -180 || flightLng > 180) {
          return null;
        }

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
        if (!f) return false;
        if (f.lat === null || f.lng === null || f.altitude === null) return false;
        if (f.altitude >= 5000) return false;
        return f.distanceToStation !== null;
      })
      .sort((a, b) => (a.distanceToStation || 999) - (b.distanceToStation || 999));

    console.log(`[OpenSky] Filtered to ${relevantFlights.length} nearby flights`);
    
    return relevantFlights;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['x-rate-limit-retry-after-seconds'];
      console.warn(`[OpenSky] Rate limited! Retry after: ${retryAfter} seconds`);
      throw {
        type: 'RATE_LIMITED',
        retryAfterSeconds: retryAfter ? parseInt(retryAfter) : null,
        message: 'OpenSky API rate limit exceeded'
      };
    }
    
    console.error(`[OpenSky] Final error:`, error.message);
    return [];
  }
};
