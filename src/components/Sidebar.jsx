import { useState } from 'react';
import { X, Plane, Wind, AlertTriangle, CheckCircle, CloudOff, Clock, Database, Info, RefreshCw, Eye, EyeOff, Thermometer, Gauge, Droplets, CloudRain } from 'lucide-react';
import { getWindData, calculateLandingSafety, calculateFlightRisk } from '../utils/aviation';
import { clsx } from 'clsx';
import { getRiskStyle } from '../lib/utils';
import RiskExplanation from './RiskExplanation';

export default function Sidebar({ station, onClose, weather: propWeather, timeIndex, flights = [], onRefreshFlights, rateLimitRetryAfter, onFlightSelect, showFlights, setShowFlights, onRefreshWeather, compareEnabled, compareIndexA, compareIndexB }) {
  const [flightLoading, setFlightLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const formatRetryTime = (seconds) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!station) return null;

  // --- SAFE DATA PARSING ---
  const points = propWeather?.points || [];
  const isAtLatest = timeIndex >= 0 && timeIndex === points.length - 1;
  const current = (isAtLatest && propWeather?.current)
    ? propWeather.current
    : (points[timeIndex] || null);

  const pointA = compareEnabled && points.length > 0 ? points[Math.min(Math.max(0, compareIndexA ?? 0), points.length - 1)] : null;
  const pointB = compareEnabled && points.length > 0 ? points[Math.min(Math.max(0, compareIndexB ?? 0), points.length - 1)] : null;

  const dataSource = propWeather?.source || current?.source || 'Unknown';
  const dataAge = propWeather?.dataAge !== undefined ? propWeather.dataAge : (current?.dataAge !== undefined ? current.dataAge : null);
  const isRealTime = propWeather?.isRealTime !== undefined ? propWeather.isRealTime : (current?.isRealTime !== undefined ? current.isRealTime : false);
  const metarAttempted = propWeather?.metarAttempted || false;
  const metarUnavailable = propWeather?.metarUnavailable || false;
  const metarIcaoCode = propWeather?.metarIcaoCode || null;
  const degraded = propWeather?.degraded || false;
  const degradedReasons = Array.isArray(propWeather?.degradedReasons) ? propWeather.degradedReasons : [];
  const demoMode = propWeather?.demoMode || false;
  const windborneUnavailable = degradedReasons.includes('WINDBORNE_UNAVAILABLE');
  const usingMetarHistory = degradedReasons.includes('WINDBORNE_UNAVAILABLE_USING_METAR_HISTORY');

  const wind = current ? getWindData(current.wind_x, current.wind_y) : null;

  const safetyAssessment = current ? calculateLandingSafety(current) : null;
  const risk = safetyAssessment?.risk || 'SAFE';
  const confidence = safetyAssessment?.confidence || 'low';
  const factors = safetyAssessment?.factors || [];
  const riskStyle = getRiskStyle(risk);

  const displaySpeed = wind?.speed !== null && wind?.speed !== undefined ? wind.speed : null;
  const displayTemp = current?.temperature !== null && current?.temperature !== undefined ? current.temperature : null;

  const formatDataAge = (age) => {
    if (age === null || age === undefined) return 'Unknown';
    if (age < 1) return 'Just now';
    if (age < 60) return `${Math.round(age)} min ago`;
    const hours = Math.floor(age / 60);
    const mins = Math.round(age % 60);
    return `${hours}h ${mins}m ago`;
  };

  const sourceLabel = (() => {
    if (dataSource === 'hybrid') {
      return usingMetarHistory ? 'METAR · current & historical' : 'METAR + WindBorne';
    }
    if (dataSource === 'METAR') return 'METAR · current';
    return dataSource;
  })();

  return (
    <div className="absolute top-3 right-3 bottom-3 md:bottom-auto w-[calc(100%-1.5rem)] md:w-[24rem] panel text-fg overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-1.5rem)] z-50 animate-panel-in">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg leading-tight truncate">{station.name || "Unknown Station"}</h2>
            <p className="text-xs text-fg-subtle font-mono mt-0.5 truncate">{station.id || "ID: N/A"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
              className="icon-btn"
              title="Refresh weather data"
              aria-label="Refresh weather data"
            >
              <RefreshCw size={16} className={clsx(weatherLoading && "animate-spin")} />
            </button>
            <button onClick={onClose} className="icon-btn" aria-label="Close station details">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Source & freshness chips */}
        {current && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={clsx(
              "chip",
              isRealTime ? "border-safe/30 bg-safe/10 text-safe" :
                metarAttempted && metarUnavailable ? "border-accent/30 bg-accent/10 text-accent" :
                  "border-caution/30 bg-caution/10 text-caution"
            )}>
              <Database size={11} />
              <span className="uppercase tracking-wide">{sourceLabel}</span>
            </span>
            <span className={clsx(
              "chip",
              dataAge !== null && dataAge < 30 ? "border-accent/30 bg-accent/10 text-accent" :
                dataAge !== null && dataAge < 60 ? "border-caution/30 bg-caution/10 text-caution" :
                  "border-danger/30 bg-danger/10 text-danger"
            )}>
              <Clock size={11} />
              <span>{formatDataAge(dataAge)}</span>
            </span>
          </div>
        )}

        {/* Status notices */}
        {usingMetarHistory && (
          <Notice tone="accent" title="Live METAR data" text="Historical data sourced from aviationweather.gov METAR records (last 24 h)." />
        )}
        {degraded && !usingMetarHistory && (
          <Notice
            tone="caution"
            icon={<AlertTriangle size={14} className="mt-0.5 shrink-0" />}
            title={windborneUnavailable ? 'WindBorne unavailable' : 'Degraded data mode'}
            text={windborneUnavailable
              ? 'WindBorne API is currently unavailable. Showing best available weather data.'
              : 'Some providers are temporarily unavailable. Showing best available weather data.'}
            extra={degradedReasons.length > 0 ? `Reasons: ${degradedReasons.join(', ')}` : null}
          />
        )}
        {demoMode && (
          <Notice tone="accent" title="Demo data active" text="Showing demo station weather so you can preview all features during an outage." />
        )}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-5">

        {/* Loading */}
        {!propWeather && (
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-surface-2 rounded-xl" />
            <div className="h-16 bg-surface-2 rounded-xl" />
            <div className="h-24 bg-surface-2 rounded-xl" />
          </div>
        )}

        {/* Empty */}
        {propWeather && !current && !(compareEnabled && pointA && pointB) && (
          <div className="card p-8 flex flex-col items-center text-fg-subtle gap-3 text-center">
            <CloudOff size={32} />
            <p className="text-sm">No weather data available for this time.</p>
          </div>
        )}

        {/* Compare view */}
        {compareEnabled && pointA && pointB ? (
          <div className="space-y-3">
            <h3 className="eyebrow">Compare Snapshots</h3>
            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'A', p: pointA }, { label: 'B', p: pointB }].map(({ label, p }, idx) => {
                const windLocal = p ? getWindData(p.wind_x, p.wind_y) : null;
                const safetyLocal = p ? calculateLandingSafety(p) : null;
                const riskLocal = safetyLocal?.risk || 'SAFE';
                const styleLocal = getRiskStyle(riskLocal);
                const displaySpeedLocal = windLocal?.speed ?? null;
                const displayTempLocal = p?.temperature ?? null;
                const ts = p?.timestamp ? new Date(p.timestamp) : null;
                const tsStr = ts ? ts.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                return (
                  <div key={idx} className={clsx("rounded-xl border p-3 flex flex-col gap-2", styleLocal.cardBg, styleLocal.cardBorder)}>
                    <div className="flex items-center justify-between">
                      <span className={clsx("chip", styleLocal.bg, styleLocal.border, styleLocal.text)}>
                        <span className={clsx("h-1.5 w-1.5 rounded-full", styleLocal.dot)} />
                        {label}
                      </span>
                      <span className="text-[10px] font-mono text-fg-subtle">{tsStr}</span>
                    </div>
                    <div>
                      <p className="eyebrow">Surface Wind</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        {windLocal ? (
                          <>
                            <p className="text-2xl font-bold font-mono text-fg">{displaySpeedLocal?.toFixed(1) ?? 'N/A'}</p>
                            <span className="text-xs text-fg-subtle font-medium">kt</span>
                          </>
                        ) : (
                          <p className="text-xl font-bold font-mono text-fg-subtle">No data</p>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted mt-1.5">
                        Temp <span className="text-fg font-medium">{displayTempLocal != null ? displayTempLocal.toFixed(1) : 'N/A'}°F</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : current && (
          <>
            {/* Weather summary card */}
            <div className={clsx("rounded-xl border overflow-hidden", riskStyle.cardBorder)}>
              <div className={clsx("p-4", riskStyle.cardBg)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Surface Wind</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      {wind ? (
                        <>
                          <p className="text-4xl font-bold font-mono text-fg leading-none">{displaySpeed?.toFixed(1) ?? 'N/A'}</p>
                          <span className="text-sm text-fg-muted font-medium">kt</span>
                        </>
                      ) : (
                        <p className="text-2xl font-bold font-mono text-fg-subtle">No data</p>
                      )}
                    </div>
                    {current?.wind_gust && current.wind_gust > displaySpeed && (
                      <p className="text-xs text-caution mt-1.5">
                        Gusting to <span className="font-semibold">{current.wind_gust.toFixed(1)} kt</span>
                      </p>
                    )}
                  </div>
                  <div className={clsx("flex h-12 w-12 items-center justify-center rounded-full bg-surface/60", riskStyle.text)}>
                    <Wind size={22} />
                  </div>
                </div>

                {/* Metric grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                  <Metric icon={<Thermometer size={13} />} label="Temp" value={displayTemp != null ? `${displayTemp.toFixed(0)}°F` : 'N/A'} />
                  <Metric icon={<Gauge size={13} />} label="Pressure" value={current?.pressure != null ? `${current.pressure.toFixed(0)}` : 'N/A'} unit="hPa" />
                  <Metric icon={<Droplets size={13} />} label="Dewpoint" value={current?.dewpoint != null ? `${current.dewpoint.toFixed(0)}°F` : 'N/A'} />
                  {current?.visibility != null && (
                    <Metric icon={<Eye size={13} />} label="Visibility" value={current.visibility.toFixed(1)} unit="SM" />
                  )}
                  {current?.precip != null && (
                    <Metric icon={<CloudRain size={13} />} label="Precip" value={current.precip.toFixed(2)} unit="mm" />
                  )}
                </div>
              </div>

              {/* Inline warnings */}
              {(metarAttempted && metarUnavailable) && (
                <div className="px-4 py-3 border-t border-border bg-surface-2 text-xs text-accent flex items-start gap-2">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  <span>
                    {metarIcaoCode
                      ? `Real-time METAR is unavailable for ${metarIcaoCode}. Showing WindBorne historical data.`
                      : 'Real-time METAR is unavailable for this station. Showing WindBorne historical data.'}
                  </span>
                </div>
              )}
              {dataAge !== null && dataAge > 30 && (
                <div className="px-4 py-3 border-t border-border bg-surface-2 text-xs text-caution flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>Data is {dataAge > 60 ? 'stale' : 'aging'}. Refresh for current conditions.</span>
                </div>
              )}
            </div>

            {/* Risk assessment */}
            <RiskExplanation risk={risk} confidence={confidence} factors={factors} showFactors={false} />

            {/* Nearby aircraft */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="eyebrow flex items-center gap-1.5">
                  <Plane size={13} /> Nearby Aircraft <span className="text-fg-muted">({flights.length})</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowFlights(!showFlights)}
                    className={`icon-btn h-8 w-8 ${showFlights ? 'border-accent/50 bg-accent/15 text-accent hover:text-accent' : ''}`}
                    title={showFlights ? "Hide flights on map" : "Show flights on map"}
                    aria-pressed={showFlights}
                  >
                    {showFlights ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={async () => {
                      if (!onRefreshFlights) return;
                      setFlightLoading(true);
                      try {
                        await onRefreshFlights();
                      } finally {
                        setTimeout(() => setFlightLoading(false), 500);
                      }
                    }}
                    disabled={flightLoading}
                    className="icon-btn h-8 w-8"
                    title="Refresh flight data"
                    aria-label="Refresh flight data"
                  >
                    <RefreshCw size={14} className={clsx(flightLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="card px-3 py-2 mb-3 text-[11px] text-fg-subtle flex items-start gap-2">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>Aircraft below 16,400 ft within a 50 nm radius.</span>
              </div>

              {flightLoading ? (
                <div className="card p-6 text-center text-fg-subtle text-sm">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                  Loading flight data…
                </div>
              ) : rateLimitRetryAfter !== null ? (
                <div className="rounded-xl border border-caution/30 bg-caution/10 p-5 text-center text-caution text-sm">
                  <AlertTriangle size={20} className="mx-auto mb-2" />
                  <p className="font-semibold mb-1">API Rate Limited</p>
                  <p className="text-xs text-caution/80">OpenSky has rate limited this request.</p>
                  {rateLimitRetryAfter && (
                    <p className="text-xs text-caution/80 mt-2">
                      Try again in <span className="font-mono font-semibold">{formatRetryTime(rateLimitRetryAfter)}</span>
                    </p>
                  )}
                </div>
              ) : flights.length === 0 ? (
                <div className="card p-6 text-center text-fg-subtle">
                  <Plane size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-1">No nearby aircraft detected.</p>
                  <p className="text-xs text-fg-subtle/70">Aircraft within 50 nm will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {flights.map((flight, i) => {
                    const landingRiskAssessment = calculateFlightRisk(flight, current);
                    const landingRisk = landingRiskAssessment.risk;
                    const landingFactors = landingRiskAssessment.factors;
                    const fStyle = getRiskStyle(landingRisk);
                    const distance = flight.distanceToStation?.toFixed(1) || "N/A";
                    const altitudeFt = (flight.altitude * 3.28).toFixed(0);
                    const speedKt = flight.velocity ? (flight.velocity * 1.944).toFixed(0) : "N/A";

                    return (
                      <button
                        key={i}
                        onClick={() => onFlightSelect && onFlightSelect(flight)}
                        className={clsx("w-full text-left rounded-xl border p-3 transition-colors group", fStyle.cardBg, fStyle.cardBorder, "hover:bg-surface-3")}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-accent text-sm truncate">{flight.callsign || "UNK"}</div>
                            <div className="text-xs text-fg-subtle mt-0.5">
                              {altitudeFt} ft · {speedKt} kt · {distance} nm
                            </div>
                          </div>
                          <span className={clsx("chip shrink-0", fStyle.bg, fStyle.border, fStyle.text)}>
                            {landingRisk === 'DANGER' ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                            {landingRisk}
                          </span>
                        </div>
                        {landingFactors && landingFactors.length > 0 && (
                          <div className="text-xs text-fg-subtle space-y-0.5 mt-2 pt-2 border-t border-border">
                            {landingFactors.slice(0, 2).map((factor, idx) => (
                              <p key={idx} className="flex items-start gap-1.5">
                                <span className="text-fg-subtle/60 mt-0.5">•</span>
                                <span>{factor}</span>
                              </p>
                            ))}
                            {landingFactors.length > 2 && (
                              <p className="text-fg-subtle/60 text-[10px] italic">+{landingFactors.length - 2} more factor(s)</p>
                            )}
                          </div>
                        )}
                      </button>
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

// --- Small presentational helpers ---
function Metric({ icon, label, value, unit }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-fg-subtle mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="font-mono text-sm font-semibold text-fg truncate">
        {value}{unit && <span className="text-fg-subtle font-normal text-xs ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function Notice({ tone = 'accent', title, text, extra, icon }) {
  const tones = {
    accent: 'border-accent/30 bg-accent/10 text-accent',
    caution: 'border-caution/30 bg-caution/10 text-caution',
  };
  return (
    <div className={clsx("mt-3 rounded-lg border p-2.5 text-xs flex items-start gap-2", tones[tone])}>
      {icon || <Info size={14} className="mt-0.5 shrink-0" />}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-[11px] opacity-90 mt-0.5">{text}</p>
        {extra && <p className="text-[10px] opacity-80 mt-1">{extra}</p>}
      </div>
    </div>
  );
}
