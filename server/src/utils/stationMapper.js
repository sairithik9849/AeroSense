// Station ID to ICAO code mapping utility
// Maps WindBorne station IDs to ICAO airport codes for METAR lookups

// Common mappings - can be extended with more stations
const STATION_TO_ICAO_MAP = {
  // Add known mappings here
  // Example: 'LPFL': 'LPFL', // If station ID is already ICAO format
};

/**
 * Attempts to map a WindBorne station ID to an ICAO code
 * @param {string} stationId - WindBorne station ID
 * @param {Object} stationInfo - Optional station info with lat/lng/name for lookup
 * @returns {string|null} - ICAO code or null if mapping not found
 */
export const getICAOCode = (stationId, stationInfo = null) => {
  // Check direct mapping first
  if (STATION_TO_ICAO_MAP[stationId]) {
    return STATION_TO_ICAO_MAP[stationId];
  }

  // If station ID is 3-4 characters and uppercase, might be ICAO
  if (stationId && /^[A-Z]{3,4}$/.test(stationId)) {
    // For US airports, METAR API expects "K" prefix (e.g., KEWR, KJFK)
    if (stationId.length === 3) {
      // 3-character code - likely US airport, add K prefix
      return `K${stationId}`;
    } else if (stationId.length === 4) {
      // 4-character code - use as-is (could be US with K prefix or international)
      return stationId;
    }
  }

  // Check if station name contains an ICAO code (e.g., "Newark Intl (EWR)")
  if (stationInfo && stationInfo.name) {
    const nameMatch = stationInfo.name.match(/\b([A-Z]{4})\b/);
    if (nameMatch) {
      return nameMatch[1];
    }
    
    // Also check for common airport name patterns
    // E.g., "Newark Intl" -> try to find EWR
    const airportNameMap = {
      'newark': 'KEWR',
      'jfk': 'KJFK',
      'laguardia': 'KLGA',
      'lax': 'KLAX',
      'ord': 'KORD',
      'dfw': 'KDFW',
      'atlanta': 'KATL',
      'miami': 'KMIA',
      'chicago': 'KORD',
      'denver': 'KDEN',
      'phoenix': 'KPHX',
    };
    
    const nameLower = stationInfo.name.toLowerCase();
    for (const [key, icao] of Object.entries(airportNameMap)) {
      if (nameLower.includes(key)) {
        return icao;
      }
    }
  }

  return null;
};

/**
 * Gets nearby METAR stations using coordinates
 * This is a placeholder - in production, you'd query a METAR station database
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in kilometers (default 50km)
 * @returns {Array<string>} - Array of ICAO codes
 */
export const getNearbyICAOCodes = async () => {
  // This would typically query a database of METAR stations
  // For now, return empty array - METAR API can handle coordinate-based queries
  return [];
};

/**
 * Checks if a string looks like an ICAO code
 * @param {string} code - Code to check
 * @returns {boolean}
 */
export const isICAOCode = (code) => {
  return code && typeof code === 'string' && code.length === 4 && /^[A-Z]{4}$/.test(code);
};

