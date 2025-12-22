import { clsx } from "clsx";

export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Converts wind components to direction and speed
 * Shared utility to eliminate duplicate code
 * @param {number} wind_x - East component (positive = wind blowing TO the east)
 * @param {number} wind_y - North component (positive = wind blowing TO the north)
 * @returns {Object|null} - {speed, dir} or null if data unavailable
 */
export const getWindFromComponents = (wind_x, wind_y) => {
  if (wind_x === null || wind_y === null || wind_x === undefined || wind_y === undefined) return null;
  
  // Calculate speed (magnitude of vector)
  const speed = Math.hypot(wind_x, wind_y);

  // Calculate direction (0-360 degrees)
  // Math.atan2 returns direction TO (where wind is blowing)
  let dir = (Math.atan2(wind_y, wind_x) * 180) / Math.PI;
  dir = (dir + 360) % 360; // Normalize to 0-360

  return { speed, dir };
};
