import axios from 'axios';
import process from 'node:process';

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
 * Fetch flights from ADS-B Exchange API (primary source)
 * This is the most reliable free API for serverless deployments
 */
const fetchFromADSB = async (lat, lng) => {
  const adsbUrl = `https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/50`;
  
  const response = await axios.get(adsbUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    timeout: 15000,
  });
  
  if (response.status === 200 && response.data && response.data.ac) {
    console.log(`[Flights] ADS-B Exchange returned ${response.data.ac.length} aircraft`);
    return response.data.ac;
  }
  
  throw new Error(`ADS-B Exchange returned status ${response.status}`);
};

export const getFlights = async (lat, lng) => {
  console.log(`[Flights] Fetching flights near lat=${lat}, lng=${lng}`);

  try {
    const aircraft = await fetchFromADSB(lat, lng);
    
    if (!aircraft || aircraft.length === 0) {
      console.log('[Flights] No aircraft found');
      return [];
    }

    // Convert and filter aircraft data
    const flights = aircraft
      .map(ac => {
        // Skip if missing essential position data
        if (typeof ac.lat !== 'number' || typeof ac.lon !== 'number') {
          return null;
        }
        
        // Validate coordinate ranges
        if (ac.lat < -90 || ac.lat > 90 || ac.lon < -180 || ac.lon > 180) {
          return null;
        }

        // Convert altitude from feet to meters, handle 'ground' value
        let altitude = null;
        if (ac.alt_baro && ac.alt_baro !== 'ground') {
          altitude = ac.alt_baro * 0.3048;
        } else if (ac.alt_geom) {
          altitude = ac.alt_geom * 0.3048;
        }

        // Skip if no altitude data
        if (altitude === null) {
          return null;
        }

        const distanceToStation = getNearbyDistance(ac.lat, ac.lon, lat, lng);
        
        // Skip if too far
        if (distanceToStation === null) {
          return null;
        }

        return {
          callsign: ac.flight?.trim() || ac.r || ac.hex || 'Unknown',
          lng: ac.lon,
          lat: ac.lat,
          altitude: altitude,
          velocity: typeof ac.gs === 'number' ? ac.gs * 0.514444 : null, // knots to m/s
          track: typeof ac.track === 'number' ? ac.track : 0,
          distanceToStation: distanceToStation,
          icao24: ac.hex || '',
          onGround: ac.alt_baro === 'ground' || ac.ground === true,
        };
      })
      .filter(f => {
        if (!f) return false;
        // Include flights below 5000 meters (~16,400 ft)
        if (f.altitude >= 5000) return false;
        return true;
      })
      .sort((a, b) => (a.distanceToStation || 999) - (b.distanceToStation || 999));

    console.log(`[Flights] Returning ${flights.length} nearby flights`);
    return flights;
    
  } catch (error) {
    console.error(`[Flights] Error fetching flights:`, error.message);
    return [];
  }
};
