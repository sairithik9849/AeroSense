import apiClient from '../utils/apiClient.js';
import { getCache, getStaleCache, setCache, setStaleCache } from '../utils/cache.js';

const METAR_BASE_URL = 'https://aviationweather.gov/api/data/metar';
const STATIONS_CACHE_VERSION = 'v2';
const STATIONS_CACHE_KEY = `aviation:stations:${STATIONS_CACHE_VERSION}`;

// World tiles: [minLat, minLon, maxLat, maxLon]
// Split to keep each tile's response size under the 15 s timeout.
// All tiles are fetched in parallel so total time ≈ slowest single tile.
const WORLD_TILES = [
  // North America (split into 4 tiles — dense METAR coverage requires smaller boxes)
  [25, -130, 55,  -95],  // West NA
  [25,  -95, 37,  -75],  // SE USA
  [37,  -75, 55,  -55],  // NE USA + Atlantic Canada
  [55, -130, 72,  -55],  // Northern Canada + Alaska
  // Rest of Americas
  [-60,  -90, 25,  -30], // South America + Caribbean + Mexico/Central America
  // Eastern Hemisphere
  [-40,  -30, 80,   30], // Europe + West Africa
  [-40,   30, 80,   80], // East Africa + Middle East + Central Asia
  [-40,   80, 80,  150], // South/East Asia
  [-60,  130, 30,  180], // Oceania + West Pacific
];

const createUnavailableError = (message) => {
  const error = new Error(message);
  error.code = 'AVIATIONWEATHER_UNAVAILABLE';
  return error;
};

export const getAviationStations = async () => {
  const cached = await getCache(STATIONS_CACHE_KEY);
  if (cached) return cached;

  const staleStations = await getStaleCache(STATIONS_CACHE_KEY);

  try {
    const stationMap = new Map();

    const fetchTile = async ([minLat, minLon, maxLat, maxLon]) => {
      const params = { bbox: `${minLat},${minLon},${maxLat},${maxLon}`, format: 'json', hours: 1 };
      try {
        return await apiClient.get(METAR_BASE_URL, { params, timeout: 20000 });
      } catch (err) {
        console.warn(`[AviationStations] Tile [${minLat},${minLon},${maxLat},${maxLon}] retry after: ${err.message}`);
        return await apiClient.get(METAR_BASE_URL, { params, timeout: 30000 });
      }
    };

    // Fetch all tiles in parallel — total time ≈ slowest single tile
    const tileResults = await Promise.allSettled(WORLD_TILES.map(fetchTile));

    tileResults.forEach((result, i) => {
      const [minLat, minLon, maxLat, maxLon] = WORLD_TILES[i];
      if (result.status === 'rejected') {
        console.warn(`[AviationStations] Tile [${minLat},${minLon},${maxLat},${maxLon}] failed: ${result.reason?.message}`);
        return;
      }
      for (const entry of result.value.data || []) {
        if (entry.icaoId && entry.lat != null && entry.lon != null) {
          stationMap.set(entry.icaoId, {
            station_id: entry.icaoId,
            station_name: entry.name || entry.icaoId,
            latitude: entry.lat,
            longitude: entry.lon,
          });
        }
      }
    });

    if (stationMap.size === 0) {
      if (staleStations) {
        console.warn('[AviationStations] No live data returned; using stale cache');
        return staleStations;
      }
      throw createUnavailableError('No stations returned from aviationweather.gov');
    }

    const stations = Array.from(stationMap.values());
    const failedTileCount = tileResults.filter(r => r.status === 'rejected').length;
    const allTilesOk = failedTileCount === 0;
    console.log(`[AviationStations] Loaded ${stations.length} METAR stations (${failedTileCount}/${WORLD_TILES.length} tiles failed)`);

    // Only pin a long cache when every tile succeeded — a partial result caches briefly
    // so the next request can retry the missing regions rather than serving stale gaps for days.
    const freshTtl = allTilesOk ? 604800 : 300;  // 7 days vs 5 min
    await setCache(STATIONS_CACHE_KEY, stations, freshTtl);
    if (allTilesOk) {
      await setStaleCache(STATIONS_CACHE_KEY, stations, 2592000); // stale: 30 days, only on complete fetch
    }

    return stations;
  } catch (error) {
    if (staleStations) {
      console.warn('[AviationStations] Live fetch failed; using stale cache');
      return staleStations;
    }
    throw createUnavailableError(`Aviation station service unavailable: ${error.message}`);
  }
};
