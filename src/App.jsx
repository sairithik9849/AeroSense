import React, { useState, useEffect, useRef, useCallback } from 'react';
import AeroMap from './components/Map';
import Sidebar from './components/Sidebar';
import Controls from './components/Controls';
import WindOverlay from './components/WindOverlay';
import FlightOverlay from './components/FlightOverlay';
import FlightInfoPanel from './components/FlightInfoPanel';
import { getApiEndpoint } from './utils/api';

export default function App() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [timeIndex, setTimeIndex] = useState(-1);
  const [windAnimationPaused, setWindAnimationPaused] = useState(false);
  // Compare view state
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareIndexA, setCompareIndexA] = useState(null);
  const [compareIndexB, setCompareIndexB] = useState(null);
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState(null);
  const [showFlights, setShowFlights] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(10); // Track map zoom for wind animation

  // Dimensions for Overlay
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const mapRef = useRef(null);
  const flightOverlayRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-zoom based on wind animation state; center on selected station if available
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      const hasStation = selectedStation && typeof selectedStation.lng === 'number' && typeof selectedStation.lat === 'number';
      const center = hasStation ? [selectedStation.lng, selectedStation.lat] : mapRef.current.getCenter();
      mapRef.current.flyTo({
        center,
        zoom: windAnimationPaused ? 9 : 12,
        duration: 800
      });
    } catch (e) {
      // ignore zoom errors
    }
  }, [windAnimationPaused, selectedStation]);

  // 1. Fetch Stations Once at Top Level
  useEffect(() => {
    fetch(getApiEndpoint("/api/stations"))
      .then((res) => res.json())
      .then((data) => setStations(data))
      .catch((err) => console.error("Failed to load stations:", err));
  }, []);

  const onSearchChange = useCallback((query) => {
    setSearchQuery(query);
    if (query && query.length > 0) {
      setSelectedStation(null);
      setWeatherData(null);
      setSelectedFlight(null);
      setFlights([]);
      setRateLimitRetryAfter(null);
    }
  }, []);

  const onStationSelect = useCallback((station) => {
    if (!station) {
      setSelectedStation(null);
      setWeatherData(null); // Also clear weather data
      setSelectedFlight(null);
      setFlights([]);
      setRateLimitRetryAfter(null);
      return;
    }
    const normalized = {
      id: station.id || station.station_id,
      name: station.name || station.station_name,
      lat: station.lat || station.latitude,
      lng: station.lng || station.longitude
    };
    setSelectedStation(normalized);

    // Zoom to the selected station
    if (mapRef.current && normalized.lat && normalized.lng) {
      mapRef.current.flyTo({
        center: [normalized.lng, normalized.lat],
        zoom: 12,
        duration: 2000
      });
    }
  }, [mapRef]);

  // 2. Fetch Weather when Station Selected
  useEffect(() => {
    if (!selectedStation || !selectedStation.id) {
      return;
    }

    const fetchWeather = async () => {
      try {
        const res = await fetch(getApiEndpoint(`/api/weather?station=${selectedStation.id}`));
        if (res.ok) {
          const data = await res.json();
          setWeatherData(data);
          // Set timeIndex to last point, or 0 if no points
          // If we have a 'current' field, it will be used by Sidebar, but timeIndex still allows historical navigation
          const lastIdx = data.points && data.points.length > 0 ? data.points.length - 1 : 0;
          setTimeIndex(lastIdx);
          // Initialize compare indices to sensible defaults
          setCompareIndexA(lastIdx);
          setCompareIndexB(Math.max(0, lastIdx - 6));
        }
      } catch (err) {
        console.error("Failed to load weather:", err);
      }
    };

    fetchWeather();
  }, [selectedStation]);

  const onSearchResultSelect = (station) => {
    const normalizedStation = {
      id: station.station_id,
      name: station.station_name,
      lat: station.latitude,
      lng: station.longitude
    };

    setSelectedStation(normalizedStation);
    setSearchQuery('');

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [station.longitude, station.latitude],
        zoom: 12,
        duration: 2000
      });
    }
  };

  const handleFlightsUpdate = (updatedFlights) => {
    setFlights(updatedFlights);
  };

  const handleFlightSelect = (flight, clickPoint) => {
    // Ensure flights are visible when a flight is selected
    setShowFlights(true);
    
    // If clickPoint is provided (clicked on map), use it directly
    if (clickPoint) {
      setSelectedFlight({ flight, clickPoint });
      return;
    }

    // If selected from sidebar, zoom to flight and calculate screen position
    if (flight && typeof flight.lng === 'number' && typeof flight.lat === 'number' && mapRef.current) {
      // Zoom to flight
      mapRef.current.flyTo({
        center: [flight.lng, flight.lat],
        zoom: 12,
        duration: 1200
      });

      // After zoom completes, calculate screen position and show panel
      // Wait for animation to complete
      setTimeout(() => {
        if (mapRef.current) {
          // Get the canvas and its bounding rect to convert from canvas coords to viewport coords
          const canvas = mapRef.current.getCanvas();
          const canvasRect = canvas.getBoundingClientRect();

          // Project flight coordinates to canvas coordinates (relative to canvas top-left)
          const projectedPoint = mapRef.current.project([flight.lng, flight.lat]);

          // Convert canvas coordinates to viewport coordinates
          // by adding the canvas position on the page
          const clickPointCalculated = {
            x: canvasRect.left + projectedPoint.x + 15,
            y: canvasRect.top + projectedPoint.y + 15
          };

          setSelectedFlight({ flight, clickPoint: clickPointCalculated });
        }
      }, 1200); // Match the flyTo duration
    }
  };

  const handleRateLimit = (retryAfterSeconds) => {
    setRateLimitRetryAfter(retryAfterSeconds);
  };

  const handleRefreshWeather = async () => {
    if (!selectedStation || !selectedStation.id) return;
    try {
      const res = await fetch(getApiEndpoint(`/api/weather?station=${selectedStation.id}`));
      if (res.ok) {
        const data = await res.json();
        setWeatherData(data);
        const lastIdx = data.points && data.points.length > 0 ? data.points.length - 1 : 0;
        setTimeIndex(lastIdx);
        setCompareIndexA(lastIdx);
        setCompareIndexB(Math.max(0, lastIdx - 6));
      }
    } catch (err) {
      console.error("Failed to refresh weather:", err);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 relative overflow-hidden font-sans selection:bg-blue-500/30">

      {/* Floating Controls + Time Slider */}
      <Controls
        mapRef={mapRef}
        searchQuery={searchQuery}
        setSearchQuery={onSearchChange}
        stations={stations}
        onSelect={onSearchResultSelect}
        weatherData={weatherData}
        timeIndex={timeIndex}
        setTimeIndex={setTimeIndex}
        windAnimationPaused={windAnimationPaused}
        setWindAnimationPaused={setWindAnimationPaused}
        selectedStation={selectedStation}
        compareEnabled={compareEnabled}
        setCompareEnabled={setCompareEnabled}
        compareIndexA={compareIndexA}
        setCompareIndexA={setCompareIndexA}
        compareIndexB={compareIndexB}
        setCompareIndexB={setCompareIndexB}
        onResetAll={() => {
          setSelectedStation(null);
          setSelectedFlight(null);
          setSearchQuery('');
          setTimeIndex(-1);
          setCompareEnabled(false);
          setCompareIndexA(null);
          setCompareIndexB(null);
          setWeatherData(null);
          setFlights([]);
        }}
      />

      {/* Wind Overlay (Only when weather data exists) */}
      <WindOverlay
        weatherData={weatherData}
        timeIndex={timeIndex}
        width={dimensions.width}
        height={dimensions.height}
        paused={windAnimationPaused}
        zoomLevel={zoomLevel}
      />

      {/* Flight Overlay - Fetches flight data on demand */}
      {selectedStation && (
        <FlightOverlay
          ref={flightOverlayRef}
          station={selectedStation}
          onFlightsUpdate={handleFlightsUpdate}
          onRateLimit={handleRateLimit}
        />
      )}

      {/* The Map */}
      <AeroMap
        mapRef={mapRef}
        stations={stations}
        onStationSelect={onStationSelect}
        searchQuery={searchQuery}
        flights={showFlights ? flights : []}
        onFlightSelect={handleFlightSelect}
        onZoomChange={setZoomLevel}
      />

      {/* The Sidebar */}
      {selectedStation && (
        <Sidebar
          station={selectedStation}
          weather={weatherData}
          timeIndex={timeIndex}
          onClose={() => setSelectedStation(null)}
          flights={flights}
          rateLimitRetryAfter={rateLimitRetryAfter}
          onFlightSelect={(flight) => handleFlightSelect(flight, null)}
          showFlights={showFlights}
          setShowFlights={setShowFlights}
          compareEnabled={compareEnabled}
          compareIndexA={compareIndexA}
          compareIndexB={compareIndexB}
          onRefreshFlights={() => {
            if (flightOverlayRef.current) {
              flightOverlayRef.current.refresh();
            }
          }}
          onRefreshWeather={handleRefreshWeather}
        />
      )}

      {/* Flight Info Panel */}
      {selectedFlight && (
        <FlightInfoPanel
          flight={selectedFlight.flight}
          clickPoint={selectedFlight.clickPoint}
          onClose={() => setSelectedFlight(null)}
        />
      )}
    </div>
  );
}