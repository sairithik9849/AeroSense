import { X, Plane, AlertTriangle, CheckCircle, Gauge, Navigation, TrendingUp, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { calculateFlightRisk } from '../utils/aviation';
import RiskExplanation from './RiskExplanation';

export default function FlightInfoPanel({ flight, clickPoint, onClose }) {
  const [position, setPosition] = useState(() => {
    // Initialize position based on click point, or default
    if (clickPoint && clickPoint.x !== undefined && clickPoint.y !== undefined) {
      return {
        x: clickPoint.x + 10,
        y: clickPoint.y + 10
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
      
      // Defer state update to avoid synchronous set state in effect
      setTimeout(() => setPosition({ x: newX, y: newY }), 0);
    }
  }, [clickPoint]);

  // Handle mouse down on header
  const handleMouseDown = (e) => {
    // Only drag from the header, not from close button
    if (e.target.closest('button')) return;
    
    setIsDragging(true);
    const card = cardRef.current;
    if (card) {
      const rect = card.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
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

      // Keep card within viewport bounds
      const maxX = parentRect.width - card.offsetWidth;
      const maxY = parentRect.height - card.offsetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
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

  // Use unified flight risk assessment
  // Note: Weather data could be passed in as a prop if available for combined assessment
  const riskAssessment = calculateFlightRisk(flight, null);
  const risk = riskAssessment.risk;
  const confidence = riskAssessment.confidence;
  const factors = riskAssessment.factors;
  
  const altitudeFt = flight.altitude * 3.28;
  const speedKt = flight.velocity ? flight.velocity * 1.944 : 0;
  const heading = flight.track !== null && flight.track !== undefined ? flight.track : null;

  return (
    <div 
      ref={cardRef}
      className="absolute w-[calc(100%-1rem)] md:w-96 bg-zinc-900/95 backdrop-blur border border-zinc-700 text-white rounded-lg md:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] md:max-h-[80vh] z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header - Draggable */}
      <div 
        className="p-3 md:p-4 border-b border-zinc-700 bg-black/20 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Plane size={16} className="md:hidden text-amber-400 shrink-0" />
              <Plane size={20} className="hidden md:block text-amber-400 shrink-0" />
              <h2 className="font-bold text-sm md:text-lg font-mono truncate">{flight.callsign || "UNKNOWN"}</h2>
            </div>
            <p className="text-[10px] md:text-xs text-zinc-400">Flight Information</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 ml-2 shrink-0">
            {flight.callsign && (
              <button 
                onClick={() => window.open(`https://www.flightaware.com/live/flight/${flight.callsign}`, '_blank')}
                className="p-1.5 md:p-2 hover:bg-zinc-800 rounded transition"
                title="Track flight online (FlightAware)"
              >
                <ExternalLink size={14} className="md:hidden text-blue-400" />
                <ExternalLink size={18} className="hidden md:block text-blue-400" />
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1.5 md:p-2 hover:bg-zinc-800 rounded transition"
            >
              <X size={16} className="md:hidden" />
              <X size={20} className="hidden md:block" />
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
        <div className="grid grid-cols-2 gap-3">
          {/* Altitude */}
          <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-400" />
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Altitude</p>
            </div>
            <p className="text-xl font-bold font-mono text-white">
              {altitudeFt.toFixed(0)}
              <span className="text-sm text-zinc-400 ml-1">ft</span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {(flight.altitude).toFixed(0)} m
            </p>
          </div>

          {/* Speed */}
          <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={16} className="text-amber-400" />
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Speed</p>
            </div>
            <p className="text-xl font-bold font-mono text-white">
              {speedKt.toFixed(0)}
              <span className="text-sm text-zinc-400 ml-1">kt</span>
            </p>
            {flight.velocity && (
              <p className="text-[10px] text-zinc-500 mt-1">
                {(flight.velocity * 3.6).toFixed(0)} km/h
              </p>
            )}
          </div>

          {/* Heading */}
          {heading !== null && (
            <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Navigation size={16} className="text-amber-400" />
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Heading</p>
              </div>
              <p className="text-xl font-bold font-mono text-white">
                {heading.toFixed(0)}°
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {heading >= 0 && heading < 22.5 ? 'N' :
                 heading >= 22.5 && heading < 67.5 ? 'NE' :
                 heading >= 67.5 && heading < 112.5 ? 'E' :
                 heading >= 112.5 && heading < 157.5 ? 'SE' :
                 heading >= 157.5 && heading < 202.5 ? 'S' :
                 heading >= 202.5 && heading < 247.5 ? 'SW' :
                 heading >= 247.5 && heading < 292.5 ? 'W' :
                 heading >= 292.5 && heading < 337.5 ? 'NW' : 'N'}
              </p>
            </div>
          )}

          {/* Position */}
          <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Plane size={16} className="text-amber-400" />
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Position</p>
            </div>
            <p className="text-xs font-mono text-white">
              {flight.lat.toFixed(4)}°N
            </p>
            <p className="text-xs font-mono text-white">
              {flight.lng.toFixed(4)}°E
            </p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-lg">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-2">Flight Status</p>
          <div className="space-y-1 text-xs text-zinc-300">
            {altitudeFt < 500 && (
              <p className="text-yellow-400">⚠ Very low altitude - Approach/Landing phase</p>
            )}
            {altitudeFt >= 500 && altitudeFt < 1000 && (
              <p className="text-zinc-300">Approaching or departing</p>
            )}
            {altitudeFt >= 1000 && (
              <p className="text-zinc-300">In transit</p>
            )}
            {speedKt > 150 && (
              <p className="text-zinc-300">High speed flight</p>
            )}
            {speedKt < 50 && altitudeFt < 1000 && (
              <p className="text-zinc-300">Low speed - Possible landing/takeoff</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

