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

/**
 * Centralized risk-level styling tokens so every component (Sidebar,
 * RiskExplanation, FlightInfoPanel, flight list) renders status colors
 * identically. Returns Tailwind class fragments for the given risk level.
 */
export const RISK_STYLES = {
  SAFE: {
    text: "text-safe",
    bg: "bg-safe/10",
    border: "border-safe/30",
    cardBg: "bg-safe/[0.07]",
    cardBorder: "border-safe/30",
    dot: "bg-safe",
  },
  CAUTION: {
    text: "text-caution",
    bg: "bg-caution/10",
    border: "border-caution/30",
    cardBg: "bg-caution/[0.07]",
    cardBorder: "border-caution/30",
    dot: "bg-caution",
  },
  DANGER: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
    cardBg: "bg-danger/[0.07]",
    cardBorder: "border-danger/30",
    dot: "bg-danger",
  },
  LANDED: {
    text: "text-fg-subtle",
    bg: "bg-fg-subtle/10",
    border: "border-border-strong",
    cardBg: "bg-surface-2",
    cardBorder: "border-border",
    dot: "bg-fg-subtle",
  },
  UNKNOWN: {
    text: "text-fg-subtle",
    bg: "bg-fg-subtle/10",
    border: "border-border-strong",
    cardBg: "bg-surface-2",
    cardBorder: "border-border",
    dot: "bg-fg-subtle",
  },
};

export const getRiskStyle = (risk) => RISK_STYLES[risk] || RISK_STYLES.UNKNOWN;
