import axios from 'axios';
import { OpenSkyResponseSchema } from '../utils/validation.js';
import process from 'node:process';

const OPENSKY_BASE_URL = 'https://opensky-network.org/api/states/all';

// List of CORS/proxy services to try (in order of preference)
const PROXY_SERVICES = [
  // AllOrigins proxy - often works well
  { name: 'allorigins', getUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  // corsproxy.io - reliable
  { name: 'corsproxy', getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  // proxy.cors.sh - another option
  { name: 'corssh', getUrl: (url) => `https://proxy.cors.sh/${url}` },
];

/**
 * Build OpenSky URL with embedded credentials for proxy requests
 */
const buildAuthenticatedOpenSkyUrl = (lamin, lomin, lamax, lomax) => {
  const username = process.env.OPENSKY_CLIENT_ID;
  const password = process.env.OPENSKY_CLIENT_SECRET;
  
  // Include auth in URL for proxy requests
  if (username && password) {
    return `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  }
  return `${OPENSKY_BASE_URL}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
};

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
      timeout: 10000, // Short timeout - if blocked, fail fast
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
        timeout: 10000, // Short timeout - if blocked, fail fast
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

  // Method 3: Try proxy services (with auth embedded in URL)
  const openSkyUrlWithAuth = buildAuthenticatedOpenSkyUrl(lamin, lomin, lamax, lomax);
  const openSkyUrlNoAuth = buildOpenSkyUrl(lamin, lomin, lamax, lomax);
  console.log(`[OpenSky] Using authenticated URL for proxies: ${openSkyUrlWithAuth.includes('@') ? 'YES' : 'NO'}`);
  
  // Try each proxy with both auth and no-auth URLs
  for (const proxy of PROXY_SERVICES) {
    // First try without auth in URL (some proxies break with @ symbol)
    try {
      console.log(`[OpenSky] Trying Method 3: ${proxy.name} proxy (no URL auth)...`);
      const proxyUrl = proxy.getUrl(openSkyUrlNoAuth);
      
      const response = await axios.get(proxyUrl, {
        headers: {
          ...browserHeaders,
          ...(authHeader ? { 'Authorization': authHeader } : {}),
        },
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });
      
      console.log(`[OpenSky] ${proxy.name} response status: ${response.status}`);
      console.log(`[OpenSky] ${proxy.name} response type: ${typeof response.data}`);
      
      if (response.status === 200 && response.data) {
        let data = response.data;
        
        // If response is a string, try to parse it as JSON
        if (typeof data === 'string') {
          // Log first 500 chars to debug what we're getting
          console.log(`[OpenSky] ${proxy.name} raw response (first 500 chars): ${data.substring(0, 500)}`);
          
          try {
            data = JSON.parse(data);
            console.log(`[OpenSky] ${proxy.name} parsed string response to JSON`);
          } catch (e) {
            console.log(`[OpenSky] ${proxy.name} response is not valid JSON string`);
            throw new Error(`Invalid JSON from ${proxy.name}`);
          }
        }
        
        // Handle case where proxy returns wrapper object
        data = data.contents || data;
        
        // Check if it looks like OpenSky data
        if (data && typeof data === 'object') {
          console.log(`[OpenSky] ${proxy.name} data keys: ${Object.keys(data).join(', ')}`);
          if ('states' in data || 'time' in data) {
            console.log(`[OpenSky] ${proxy.name} proxy SUCCESS!`);
            return data;
          }
        }
      }
      throw new Error(`Invalid response structure from ${proxy.name}`);
    } catch (error) {
      const errMsg = error.code || error.message;
      console.log(`[OpenSky] ${proxy.name} proxy failed: ${errMsg}`);
      errors.push({ method: proxy.name, error: errMsg });
    }
  }

  // Skip Methods 4 and 5 (global fetch) - they take too long and hit Vercel timeout
  // Direct requests to OpenSky are being blocked from Vercel IPs
  console.log('[OpenSky] Skipping global fetch methods (would exceed Vercel timeout)');

  // Method 4: Try ADS-B Exchange as fallback (free, more permissive)
  try {
    console.log('[OpenSky] Trying Method 4: ADS-B Exchange API fallback...');
    
    // ADS-B Exchange public API - uses different format
    const adsbUrl = `https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/50`;
    
    const response = await axios.get(adsbUrl, {
      headers: browserHeaders,
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });
    
    console.log(`[OpenSky] ADS-B Exchange response status: ${response.status}`);
    
    if (response.status === 200 && response.data && response.data.ac) {
      console.log(`[OpenSky] ADS-B Exchange SUCCESS! Found ${response.data.ac.length} aircraft`);
      
      // Convert ADS-B Exchange format to OpenSky format
      // Handle missing/null values properly to avoid NaN
      const states = response.data.ac.map(ac => {
        // Safely convert altitude from feet to meters, default to 0 if missing
        const altBaro = (ac.alt_baro && ac.alt_baro !== 'ground') 
          ? ac.alt_baro * 0.3048 
          : (ac.alt_geom ? ac.alt_geom * 0.3048 : null);
        
        // Safely convert velocity from knots to m/s
        const velocity = (typeof ac.gs === 'number') ? ac.gs * 0.514444 : null;
        
        // Track/heading - use 0 as default if missing
        const track = (typeof ac.track === 'number') ? ac.track : 0;
        
        return [
          ac.hex || '',                    // 0: icao24
          ac.flight?.trim() || ac.r || '', // 1: callsign
          ac.country || '',                // 2: origin_country
          Date.now() / 1000,               // 3: time_position (use current time)
          Date.now() / 1000,               // 4: last_contact (use current time)
          ac.lon,                          // 5: longitude
          ac.lat,                          // 6: latitude
          altBaro,                         // 7: baro_altitude (in meters)
          ac.ground === true || ac.alt_baro === 'ground', // 8: on_ground
          velocity,                        // 9: velocity (in m/s)
          track,                           // 10: true_track (in degrees)
          ac.baro_rate ? ac.baro_rate * 0.00508 : null, // 11: vertical_rate
          null,                            // 12: sensors
          ac.alt_geom ? ac.alt_geom * 0.3048 : null, // 13: geo_altitude
          ac.squawk || null,               // 14: squawk
          false,                           // 15: spi
          0,                               // 16: position_source
        ];
      });
      
      return { time: Date.now(), states };
    }
    throw new Error(`ADS-B Exchange returned status ${response.status}`);
  } catch (error) {
    const errMsg = error.code || error.message;
    console.log(`[OpenSky] ADS-B Exchange failed: ${errMsg}`);
    errors.push({ method: 'adsb-exchange', error: errMsg });
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
