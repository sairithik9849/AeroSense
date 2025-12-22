import { useState } from 'react';
import { X, Plane, Wind, AlertTriangle, CheckCircle, CloudOff, Clock, Database, Info, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { getWindData, calculateLandingSafety, calculateFlightRisk } from '../utils/aviation';
import { clsx } from 'clsx';
import RiskExplanation from './RiskExplanation';

export default function Sidebar({ station, onClose, weather: propWeather, timeIndex, flights = [], onRefreshFlights, rateLimitRetryAfter, onFlightSelect, showFlights, setShowFlights, onRefreshWeather, compareEnabled, compareIndexA, compareIndexB }) {
  const [flightLoading, setFlightLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Format retry time
  const formatRetryTime = (seconds) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!station) return null;

  // --- SAFE DATA PARSING ---
  // 1. Get current weather point safely based on Time Travel Index
  // For historical view: use the point at timeIndex
  // For current/latest view: prefer 'current' field (real-time METAR) if available
  const points = propWeather?.points || [];
  const isAtLatest = timeIndex >= 0 && timeIndex === points.length - 1;
  const current = (isAtLatest && propWeather?.current) 
    ? propWeather.current  // Use real-time METAR data when at latest point
    : (points[timeIndex] || null);  // Use historical WindBorne data for historical view

  // Compare points (if enabled)
  const pointA = compareEnabled && points.length > 0 ? points[Math.min(Math.max(0, compareIndexA ?? 0), points.length - 1)] : null;
  const pointB = compareEnabled && points.length > 0 ? points[Math.min(Math.max(0, compareIndexB ?? 0), points.length - 1)] : null;
  
  // Get metadata from unified response
  const dataSource = propWeather?.source || current?.source || 'Unknown';
  const dataAge = propWeather?.dataAge !== undefined ? propWeather.dataAge : (current?.dataAge !== undefined ? current.dataAge : null);
  const isRealTime = propWeather?.isRealTime !== undefined ? propWeather.isRealTime : (current?.isRealTime !== undefined ? current.isRealTime : false);
  const metarAttempted = propWeather?.metarAttempted || false;
  const metarUnavailable = propWeather?.metarUnavailable || false;
  const metarIcaoCode = propWeather?.metarIcaoCode || null;

  // 2. Calculate wind safely. If no 'current', wind is null.
  const wind = current ? getWindData(current.wind_x, current.wind_y) : null;

  // 3. Enhanced safety assessment using unified system
  const safetyAssessment = current ? calculateLandingSafety(current) : null;
  const risk = safetyAssessment?.risk || 'SAFE';
  const confidence = safetyAssessment?.confidence || 'low';
  const factors = safetyAssessment?.factors || [];

  // 4. Safe values for display - handle null/undefined properly
  const displaySpeed = wind?.speed !== null && wind?.speed !== undefined ? wind.speed : null;
  const displayTemp = current?.temperature !== null && current?.temperature !== undefined ? current.temperature : null;
  
  // Format data age display
  const formatDataAge = (age) => {
    if (age === null || age === undefined) return 'Unknown';
    if (age < 1) return 'Just now';
    if (age < 60) return `${Math.round(age)} min ago`;
    const hours = Math.floor(age / 60);
    const mins = Math.round(age % 60);
    return `${hours}h ${mins}m ago`;
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-zinc-900/95 backdrop-blur border border-zinc-700 text-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-50">

      {/* Header */}
      <div className="p-4 border-b border-zinc-700 bg-black/20">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h2 className="font-bold text-lg">{station.name || "Unknown Station"}</h2>
            <p className="text-xs text-zinc-400 font-mono">{station.id || "ID: N/A"}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={async () => {
                if (!onRefreshWeather) return;
                setWeatherLoading(true);
                try {
                  await onRefreshWeather();
                } finally {
                  setTimeout(() => setWeatherLoading(false), 500);
                }
              }}
              disabled={weatherLoading}
              className={clsx(
                "p-2 rounded border transition-all hover:scale-105 active:scale-95",
                weatherLoading
                  ? "bg-zinc-700/50 text-zinc-500 border-zinc-600/50 cursor-not-allowed"
                  : "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30"
              )}
              title="Refresh weather data"
            >
              <RefreshCw size={18} className={clsx(weatherLoading && "animate-spin")} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition">
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Data Source & Freshness Indicator */}
        {current && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className={clsx(
                "flex items-center gap-1 text-[10px] px-2 py-1 rounded",
                isRealTime ? "bg-emerald-500/20 text-emerald-400" : 
                metarAttempted && metarUnavailable ? "bg-blue-500/20 text-blue-400" :
                "bg-yellow-500/20 text-yellow-400"
              )}>
                <Database size={10} />
                <span className="uppercase font-semibold">
                  {(() => {
                    if (dataSource === 'hybrid') {
                      if (isRealTime) {
                        return 'METAR (current) + WindBorne (historical)';
                      } else {
                        return 'WindBorne (current & historical)';
                      }
                    } else if (dataSource === 'METAR') {
                      return 'METAR (current)';
                    } else if (metarAttempted && metarUnavailable && dataSource === 'WindBorne') {
                      return 'WindBorne (METAR unavailable)';
                    } else {
                      return dataSource;
                    }
                  })()}
                </span>
              </div>
              <div className={clsx(
                "flex items-center gap-1 text-[10px] px-2 py-1 rounded",
                dataAge !== null && dataAge < 30 ? "bg-blue-500/20 text-blue-400" :
                dataAge !== null && dataAge < 60 ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              )}>
                <Clock size={10} />
                <span>{formatDataAge(dataAge)}</span>
              </div>
            </div>
          )}
      </div>

      {/* Content Container */}
      <div className="p-4 overflow-y-auto space-y-6">

        {/* State 1: Loading (Weather) */}
        {!propWeather && (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-zinc-800 rounded-lg"></div>
          </div>
        )}

        {/* State 2: Data Loaded but Empty */}
        {propWeather && !current && (
          <div className="p-8 border border-dashed border-zinc-700 rounded-lg flex flex-col items-center text-zinc-500 gap-2">
            <CloudOff size={32} />
            <p>No weather data available for this time.</p>
          </div>
        )}

        {/* State 3: Success */}
        {compareEnabled && pointA && pointB ? (
          <>
            {/* COMPARE VIEW */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Compare Snapshots</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{label:'A', p: pointA}, {label:'B', p: pointB}].map(({label, p}, idx) => {
                  const windLocal = p ? getWindData(p.wind_x, p.wind_y) : null;
                  const safetyLocal = p ? calculateLandingSafety(p) : null;
                  const riskLocal = safetyLocal?.risk || 'SAFE';
                  const displaySpeedLocal = windLocal?.speed !== null && windLocal?.speed !== undefined ? windLocal.speed : null;
                  const displayTempLocal = p?.temperature !== null && p?.temperature !== undefined ? p.temperature : null;
                  const ts = p?.timestamp ? new Date(p.timestamp) : null;
                  const tsStr = ts ? ts.toLocaleDateString([], { month: 'short', day: 'numeric'}) + ' ' + ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : 'N/A';
                  return (
                    <div key={idx} className={clsx(
                      "p-3 rounded-lg border flex flex-col gap-2",
                      riskLocal === 'DANGER' ? "bg-red-900/20 border-red-500/50" :
                        riskLocal === 'CAUTION' ? "bg-yellow-900/20 border-yellow-500/50" :
                          "bg-emerald-900/20 border-emerald-500/50"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-black/40 rounded-full">
                            <Wind size={18} className={clsx(
                              riskLocal === 'DANGER' ? "text-red-500" :
                                riskLocal === 'CAUTION' ? "text-yellow-500" :
                                  "text-emerald-500"
                            )} />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{tsStr}</span>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Surface Wind</p>
                        <div className="flex items-baseline gap-2">
                          {windLocal ? (
                            <>
                              <p className="text-2xl font-bold font-mono text-white">{displaySpeedLocal?.toFixed(1) || 'N/A'}</p>
                              <span className="text-xs text-zinc-400 font-medium">kt</span>
                            </>
                          ) : (
                            <p className="text-2xl font-bold font-mono text-zinc-500">No data</p>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Temp: <span className="text-zinc-200">{displayTempLocal !== null && displayTempLocal !== undefined ? displayTempLocal.toFixed(1) : 'N/A'}°F</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : current && (
          <>
            {/* 1. WEATHER CARD */}
            <div className={clsx(
              "p-4 rounded-lg border flex items-center gap-4 transition-colors",
              risk === 'DANGER' ? "bg-red-900/20 border-red-500/50" :
                risk === 'CAUTION' ? "bg-yellow-900/20 border-yellow-500/50" :
                  "bg-emerald-900/20 border-emerald-500/50"
            )}>
              <div className="p-3 bg-black/40 rounded-full shadow-sm">
                <Wind size={24} className={clsx(
                  risk === 'DANGER' ? "text-red-500" :
                    risk === 'CAUTION' ? "text-yellow-500" :
                      "text-emerald-500"
                )} />
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Surface Wind</p>
                <div className="flex items-baseline gap-2">
                  {wind ? (
                    <>
                      <p className="text-3xl font-bold font-mono text-white">
                        {displaySpeed?.toFixed(1) || 'N/A'}
                      </p>
                      <span className="text-sm text-zinc-400 font-medium">kt</span>
                    </>
                  ) : (
                    <p className="text-3xl font-bold font-mono text-zinc-500">No data</p>
                  )}
                </div>

                {/* Temperature (Fahrenheit) */}
                <p className="text-xs text-zinc-400 mt-1">
                  Temp: <span className="text-zinc-200">{displayTemp !== null && displayTemp !== undefined ? displayTemp.toFixed(1) : 'N/A'}°F</span>
                </p>

                {/* Wind Gust Indicator */}
                {current?.wind_gust && current.wind_gust > displaySpeed && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Gusts: <span className="font-semibold">{current.wind_gust.toFixed(1)} kt</span>
                  </p>
                )}
                
                {/* Visibility (if available from METAR) */}
                {current?.visibility !== null && current?.visibility !== undefined && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Visibility: <span className="text-zinc-200">{current.visibility.toFixed(1)} SM</span>
                  </p>
                )}

                {/* Extra Weather Details */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-[10px] text-zinc-400">
                  <div>
                    <p className="uppercase tracking-wider">Pressure</p>
                    <p className="text-zinc-200 font-mono">{current?.pressure?.toFixed(0) || "N/A"} hPa</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Dewpoint</p>
                    <p className="text-zinc-200 font-mono">
                      {current?.dewpoint ? (current.dewpoint).toFixed(1) : "N/A"}°F
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider">Precip</p>
                    <p className="text-zinc-200 font-mono">{current?.precip?.toFixed(2) || "0.00"} mm</p>
                  </div>
                </div>
                
                {/* METAR Unavailable Info */}
                {metarAttempted && metarUnavailable && (
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-0.5">METAR Data Unavailable</p>
                      <p className="text-[10px] opacity-90">
                        {metarIcaoCode 
                          ? `Real-time METAR data is not available for ${metarIcaoCode}. Displaying WindBorne historical data instead.`
                          : 'Real-time METAR data is not available for this station. Displaying WindBorne historical data instead.'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Stale Data Warning */}
                {dataAge !== null && dataAge > 30 && (
                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-[10px] text-yellow-400">
                    <AlertTriangle size={12} className="inline mr-1" />
                    Data is {dataAge > 60 ? 'stale' : 'aging'}. Consider refreshing for current conditions.
                  </div>
                )}
              </div>
            </div>

            {/* 2. RISK ASSESSMENT */}
            <RiskExplanation 
              risk={risk}
              confidence={confidence}
              factors={factors}
              showFactors={false}
            />

            {/* 3. NEARBY FLIGHTS LIST - Shows all flights near station with landing risk */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 uppercase tracking-wide">
                  <Plane size={16} /> Nearby Aircraft ({flights.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFlights(!showFlights)}
                    className={clsx(
                      "p-2 rounded border transition-all hover:scale-105 active:scale-95",
                      showFlights
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                        : "bg-zinc-700/50 text-zinc-400 border-zinc-600/50"
                    )}
                    title={showFlights ? "Hide flights on map" : "Show flights on map"}
                  >
                    {showFlights ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={async () => {
                      if (!onRefreshFlights) return;
                      setFlightLoading(true);
                      try {
                        await onRefreshFlights();
                      } finally {
                        // Small delay to show loading state
                        setTimeout(() => setFlightLoading(false), 500);
                      }
                    }}
                    disabled={flightLoading}
                    className={clsx(
                    "p-1.5 rounded border transition-all hover:scale-105 active:scale-95",
                    flightLoading
                      ? "bg-zinc-700/50 text-zinc-500 border-zinc-600/50 cursor-not-allowed"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30"
                  )}
                  title="Refresh flight data"
                >
                  <RefreshCw size={14} className={clsx(flightLoading && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Altitude Restriction Note */}
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-[11px] text-blue-300 flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>Showing aircraft below 16,400 ft (5,000 m) altitude within 50 nm radius</span>
            </div>

              {flightLoading ? (
                <div className="text-center p-6 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm bg-black/20">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                  Loading flight data...
                </div>
              ) : rateLimitRetryAfter !== null ? (
                <div className="text-center p-6 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm bg-yellow-500/10">
                  <AlertTriangle size={20} className="mx-auto mb-2" />
                  <p className="mb-2 font-semibold">API Rate Limited</p>
                  <p className="text-xs text-yellow-500/80 mb-2">
                    OpenSky API has rate limited this request.
                  </p>
                  {rateLimitRetryAfter && (
                    <p className="text-xs text-yellow-500/80">
                      Please try again in: <span className="font-mono font-bold">{formatRetryTime(rateLimitRetryAfter)}</span>
                    </p>
                  )}
                  <p className="text-xs text-yellow-500/60 mt-2">
                    OpenSky has strict rate limits for anonymous users.
                  </p>
                </div>
              ) : flights.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm bg-black/20">
                  <p className="mb-2">No nearby aircraft detected.</p>
                  <p className="text-xs text-zinc-600">Aircraft within 50nm will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {flights.map((flight, i) => {
                    // Calculate landing risk if aircraft were to land at this station
                    const landingRiskAssessment = calculateFlightRisk(flight, current);
                    const landingRisk = landingRiskAssessment.risk;
                    const landingFactors = landingRiskAssessment.factors;
                    
                    // Get distance from flight to station if available
                    const distance = flight.distanceToStation?.toFixed(1) || "N/A";
                    const altitudeFt = (flight.altitude * 3.28).toFixed(0);
                    const speedKt = flight.velocity ? (flight.velocity * 1.944).toFixed(0) : "N/A";
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => onFlightSelect && onFlightSelect(flight)}
                        className={clsx(
                          "p-3 border rounded transition-all group cursor-pointer",
                          landingRisk === 'DANGER' ? "bg-red-950/30 border-red-500/50 hover:bg-red-900/40" :
                            landingRisk === 'CAUTION' ? "bg-yellow-950/30 border-yellow-500/50 hover:bg-yellow-900/40" :
                            landingRisk === 'LANDED' ? "bg-gray-900/30 border-gray-600/50 hover:bg-gray-800/40" :
                              "bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/40"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-mono font-bold text-blue-400 group-hover:text-blue-300 text-sm">
                              {flight.callsign || "UNK"}
                            </div>
                            <div className="text-xs text-zinc-500 group-hover:text-zinc-400 mt-1">
                              Alt: {altitudeFt}ft • Speed: {speedKt}kt • Distance: {distance}nm
                            </div>
                          </div>
                          
                          {/* Landing Risk Badge */}
                          <div className={clsx(
                            "px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border shrink-0 ml-2",
                            landingRisk === 'DANGER' ? "bg-red-500/20 text-red-400 border-red-500/40" :
                              landingRisk === 'CAUTION' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" :
                              landingRisk === 'LANDED' ? "bg-gray-500/20 text-gray-400 border-gray-500/40" :
                                "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          )}>
                            {landingRisk === 'DANGER' ? <AlertTriangle size={12} /> : 
                             landingRisk === 'LANDED' ? <CheckCircle size={12} /> :
                             <CheckCircle size={12} />}
                            {landingRisk}
                          </div>
                        </div>

                        {/* Landing Assessment Details - Compact */}
                        <div className="text-xs text-zinc-500 space-y-0.5">
                          {landingFactors && landingFactors.length > 0 && (
                            <>
                              <p className="text-zinc-400 font-semibold mb-1">Landing Assessment:</p>
                              {landingFactors.slice(0, 2).map((factor, idx) => (
                                <p key={idx} className="flex items-start gap-2">
                                  <span className="text-zinc-600 mt-0.5">•</span>
                                  <span>{factor}</span>
                                </p>
                              ))}
                              {landingFactors.length > 2 && (
                                <p className="text-zinc-600 text-[10px] italic">+{landingFactors.length - 2} more factor(s)</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}