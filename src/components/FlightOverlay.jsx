import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { filterApproachingFlights } from '../utils/aviation';

const FlightOverlay = forwardRef(({ station, onFlightsUpdate, onRateLimit }, ref) => {
  const abortControllerRef = useRef(null);
  const callbackRef = useRef(onFlightsUpdate);
  const rateLimitCallbackRef = useRef(onRateLimit);

  // Keep callback refs up to date without causing re-renders
  useEffect(() => {
    callbackRef.current = onFlightsUpdate;
    rateLimitCallbackRef.current = onRateLimit;
  }, [onFlightsUpdate, onRateLimit]);

  const fetchFlights = useCallback(async () => {
    if (!station || !station.lat || !station.lng) {
      callbackRef.current([]);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const res = await fetch(`/api/flights?lat=${station.lat}&lng=${station.lng}`, {
        signal
      });

      if (res.ok) {
        const data = await res.json();

        // Filter out flights with null coordinates
        const validFlights = (data || []).filter(
          f => f.lat !== null && f.lng !== null && f.altitude !== null
        );

        // Filter to only flights approaching the station
        // Use stricter criteria to avoid showing flights to nearby airports
        const approachingFlights = filterApproachingFlights(validFlights, station, {
          maxAngleDifference: 20, // Stricter: within 20 degrees of direct heading
          maxDistance: 50, // Reduced: within 50 nautical miles
          minAltitude: 200, // Above 200 feet (exclude landed)
        });

        callbackRef.current(approachingFlights);
        
        // Clear rate limit state on success
        if (rateLimitCallbackRef.current) {
          rateLimitCallbackRef.current(null);
        }
      } else if (res.status === 429) {
        const errorData = await res.json().catch(() => ({}));
        const retryAfterSeconds = errorData.retryAfterSeconds || null;
        
        // Notify parent about rate limit
        if (rateLimitCallbackRef.current) {
          rateLimitCallbackRef.current(retryAfterSeconds);
        }
        
        callbackRef.current([]);
      } else {
        callbackRef.current([]);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        return;
      }

      callbackRef.current([]);
    }
  }, [station]);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchFlights
  }));

  // Fetch once when station changes
  useEffect(() => {
    if (!station || !station.lat || !station.lng) {
      callbackRef.current([]);
      return;
    }

    fetchFlights();

    return () => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      callbackRef.current([]);
    };
  }, [station, fetchFlights]);

  // This component doesn't render anything, it just manages flight data
  return null;
});

FlightOverlay.displayName = 'FlightOverlay';

export default FlightOverlay;

