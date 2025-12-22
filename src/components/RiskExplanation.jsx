import { Info, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { getRiskExplanation, getConfidenceExplanation } from '../utils/aviation';
import { clsx } from 'clsx';
import { useState } from 'react';

/**
 * RiskExplanation Component
 * Displays risk assessment with expandable details showing contributing factors
 */
export default function RiskExplanation({ 
  risk, 
  confidence = null, 
  factors = [], 
  showFactors = false,
  compact = false 
}) {
  const [expanded, setExpanded] = useState(showFactors);
  const explanation = getRiskExplanation(risk);
  
  const getRiskIcon = () => {
    switch (risk) {
      case 'SAFE':
        return <CheckCircle size={compact ? 14 : 16} />;
      case 'CAUTION':
        return <AlertTriangle size={compact ? 14 : 16} />;
      case 'DANGER':
        return <XCircle size={compact ? 14 : 16} />;
      case 'LANDED':
        return <CheckCircle size={compact ? 14 : 16} />;
      default:
        return <HelpCircle size={compact ? 14 : 16} />;
    }
  };
  
  const getRiskColorClasses = () => {
    const baseClasses = "px-3 py-2 rounded border";
    switch (risk) {
      case 'SAFE':
        return `${baseClasses} bg-emerald-500/10 text-emerald-500 border-emerald-500/20`;
      case 'CAUTION':
        return `${baseClasses} bg-yellow-500/10 text-yellow-500 border-yellow-500/20`;
      case 'DANGER':
        return `${baseClasses} bg-red-500/10 text-red-500 border-red-500/20`;
      case 'LANDED':
        return `${baseClasses} bg-gray-500/10 text-gray-400 border-gray-500/20`;
      default:
        return `${baseClasses} bg-gray-500/10 text-gray-400 border-gray-500/20`;
    }
  };

  return (
    <div className={clsx("space-y-2", compact && "text-sm")}>
      {/* Risk Level Badge */}
      <div className={getRiskColorClasses()}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getRiskIcon()}
            <div>
              <div className="font-bold">
                {risk}
                {confidence && (
                  <span className="ml-2 text-xs font-normal opacity-70">
                    ({confidence} confidence)
                  </span>
                )}
              </div>
              {!compact && (
                <div className={clsx("text-xs mt-0.5 opacity-80")}>
                  {explanation.description}
                </div>
              )}
            </div>
          </div>
          
          {factors.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title={expanded ? "Hide details" : "Show details"}
            >
              <Info size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Factors Section */}
      {expanded && factors.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            Contributing Factors:
          </div>
          <ul className="space-y-1">
            {factors.map((factor, index) => (
              <li key={index} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-slate-600 mt-0.5">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
          
          {confidence && (
            <div className="mt-3 pt-2 border-t border-slate-700">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Confidence:</span>{' '}
                {getConfidenceExplanation(confidence)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Action (if not compact and not expanded) */}
      {!compact && !expanded && explanation.action && (
        <div className="text-xs text-slate-400 italic">
          {explanation.action}
        </div>
      )}
    </div>
  );
}
