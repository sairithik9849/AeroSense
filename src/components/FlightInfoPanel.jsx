import { X, Plane, Gauge, Navigation, TrendingUp, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { calculateFlightRisk } from '../utils/aviation';
import RiskExplanation from './RiskExplanation';

export default function FlightInfoPanel({ flight, clickPoint, onClose }) {
  const [position, setPosition] = useState(() => {
    if (clickPoint && clickPoint.x !== undefined && clickPoint.y !== undefined) {
      return {
        x: clickPoint.x + 10,
        y: clickPoint.y + 10,
      };
    }
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Update position when clickPoint changes (new aircraft selected)
  useEffect(() => {
    if (clickPoint && clickPoint.x !== undefined && clickPoint.y !== undefined) {
      const newX = clickPoint.x + 10;
      const newY = clickPoint.y + 10;
      setTimeout(() => setPosition({ x: newX, y: newY }), 0);
    }
  }, [clickPoint]);

  // Handle mouse down on header
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;

    setIsDragging(true);
    const card = cardRef.current;
    if (card) {
      const rect = card.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Handle mouse move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const card = cardRef.current;
      if (!card) return;

      const parent = card.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const newX = e.clientX - parentRect.left - dragOffset.x;
      const newY = e.clientY - parentRect.top - dragOffset.y;

      const maxX = parentRect.width - card.offsetWidth;
      const maxY = parentRect.height - card.offsetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!flight) return null;

  const riskAssessment = calculateFlightRisk(flight, null);
  const risk = riskAssessment.risk;
  const confidence = riskAssessment.confidence;
  const factors = riskAssessment.factors;

  const altitudeFt = flight.altitude * 3.28;
  const speedKt = flight.velocity ? flight.velocity * 1.944 : 0;
  const heading = flight.track !== null && flight.track !== undefined ? flight.track : null;

  const compassPoint = (h) =>
    h >= 337.5 || h < 22.5 ? 'N' :
    h < 67.5 ? 'NE' :
    h < 112.5 ? 'E' :
    h < 157.5 ? 'SE' :
    h < 202.5 ? 'S' :
    h < 247.5 ? 'SW' :
    h < 292.5 ? 'W' : 'NW';

  return (
    <div
      ref={cardRef}
      className="absolute w-[calc(100%-1rem)] md:w-96 panel text-foreground rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] md:max-h-[80vh] z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header - Draggable */}
      <div
        className="p-3 md:p-4 border-b border-border bg-surface-2/60 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              <Plane size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm md:text-base font-mono truncate tracking-tight">
                {flight.callsign || 'UNKNOWN'}
              </h2>
              <p className="text-[10px] md:text-xs text-fg-subtle uppercase tracking-wider">
                Flight Information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {flight.callsign && (
              <button
                onClick={() =>
                  window.open(
                    `https://www.flightaware.com/live/flight/${flight.callsign}`,
                    '_blank'
                  )
                }
                className="p-2 hover:bg-surface-3 rounded-md transition text-accent"
                title="Track flight online (FlightAware)"
                aria-label="Track flight on FlightAware"
              >
                <ExternalLink size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-3 rounded-md transition text-fg-muted hover:text-foreground"
              aria-label="Close flight information"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 overflow-y-auto space-y-3 md:space-y-4 custom-scrollbar">
        {/* Risk Assessment with explanation */}
        <RiskExplanation
          risk={risk}
          confidence={confidence}
          factors={factors}
          showFactors={true}
          compact={false}
        />

        {/* Flight Details Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Altitude */}
          <div className="metric-tile">
            <div className="flex items-center gap-2 mb-1.5 text-fg-muted">
              <TrendingUp size={15} className="text-accent" />
              <p className="metric-label">Altitude</p>
            </div>
            <p className="text-xl font-semibold font-mono text-foreground">
              {altitudeFt.toFixed(0)}
              <span className="text-sm text-fg-subtle ml-1">ft</span>
            </p>
            <p className="text-[10px] text-fg-subtle mt-0.5">{flight.altitude.toFixed(0)} m</p>
          </div>

          {/* Speed */}
          <div className="metric-tile">
            <div className="flex items-center gap-2 mb-1.5 text-fg-muted">
              <Gauge size={15} className="text-accent" />
              <p className="metric-label">Speed</p>
            </div>
            <p className="text-xl font-semibold font-mono text-foreground">
              {speedKt.toFixed(0)}
              <span className="text-sm text-fg-subtle ml-1">kt</span>
            </p>
            {flight.velocity && (
              <p className="text-[10px] text-fg-subtle mt-0.5">
                {(flight.velocity * 3.6).toFixed(0)} km/h
              </p>
            )}
          </div>

          {/* Heading */}
          {heading !== null && (
            <div className="metric-tile">
              <div className="flex items-center gap-2 mb-1.5 text-fg-muted">
                <Navigation size={15} className="text-accent" />
                <p className="metric-label">Heading</p>
              </div>
              <p className="text-xl font-semibold font-mono text-foreground">{heading.toFixed(0)}°</p>
              <p className="text-[10px] text-fg-subtle mt-0.5">{compassPoint(heading)}</p>
            </div>
          )}

          {/* Position */}
          <div className="metric-tile">
            <div className="flex items-center gap-2 mb-1.5 text-fg-muted">
              <Plane size={15} className="text-accent" />
              <p className="metric-label">Position</p>
            </div>
            <p className="text-xs font-mono text-foreground">
              {Math.abs(flight.lat).toFixed(4)}°{flight.lat >= 0 ? 'N' : 'S'}
            </p>
            <p className="text-xs font-mono text-foreground">
              {Math.abs(flight.lng).toFixed(4)}°{flight.lng >= 0 ? 'E' : 'W'}
            </p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="metric-tile">
          <p className="metric-label mb-2">Flight Status</p>
          <div className="space-y-1 text-xs">
            {altitudeFt < 500 && (
              <p className="text-caution">Very low altitude — approach / landing phase</p>
            )}
            {altitudeFt >= 500 && altitudeFt < 1000 && (
              <p className="text-fg-muted">Approaching or departing</p>
            )}
            {altitudeFt >= 1000 && <p className="text-fg-muted">In transit</p>}
            {speedKt > 150 && <p className="text-fg-muted">High speed flight</p>}
            {speedKt < 50 && altitudeFt < 1000 && (
              <p className="text-fg-muted">Low speed — possible landing / takeoff</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
