import { Info, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { getRiskExplanation, getConfidenceExplanation } from '../utils/aviation';
import { getRiskStyle } from '../lib/utils';
import { clsx } from 'clsx';
import { useState } from 'react';

/**
 * RiskExplanation Component
 * Displays risk assessment with expandable details showing contributing factors.
 * Uses the shared getRiskStyle() tokens so status colors match everywhere.
 */
export default function RiskExplanation({
  risk,
  confidence = null,
  factors = [],
  showFactors = false,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(showFactors);
  const explanation = getRiskExplanation(risk);
  const style = getRiskStyle(risk);

  const getRiskIcon = () => {
    const size = compact ? 14 : 16;
    switch (risk) {
      case 'SAFE':
      case 'LANDED':
        return <CheckCircle size={size} />;
      case 'CAUTION':
        return <AlertTriangle size={size} />;
      case 'DANGER':
        return <XCircle size={size} />;
      default:
        return <HelpCircle size={size} />;
    }
  };

  return (
    <div className={clsx('space-y-2', compact && 'text-sm')}>
      {/* Risk Level Badge */}
      <div className={clsx('rounded-lg border px-3 py-2.5', style.cardBg, style.cardBorder, style.text)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0">{getRiskIcon()}</span>
            <div>
              <div className="font-semibold tracking-tight flex items-center gap-2">
                {risk}
                {confidence && (
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                    {confidence} confidence
                  </span>
                )}
              </div>
              {!compact && (
                <div className="text-xs mt-0.5 text-fg-muted">{explanation.description}</div>
              )}
            </div>
          </div>

          {factors.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-foreground/10 transition-colors shrink-0"
              title={expanded ? 'Hide details' : 'Show details'}
              aria-label={expanded ? 'Hide contributing factors' : 'Show contributing factors'}
            >
              <Info size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Factors Section */}
      {expanded && factors.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-lg p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
            Contributing Factors
          </div>
          <ul className="space-y-1.5">
            {factors.map((factor, index) => (
              <li key={index} className="text-xs text-fg-muted flex items-start gap-2">
                <span className={clsx('mt-1.5 h-1 w-1 rounded-full shrink-0', style.dot)} />
                <span>{factor}</span>
              </li>
            ))}
          </ul>

          {confidence && (
            <div className="mt-3 pt-2.5 border-t border-border">
              <div className="text-xs text-fg-muted">
                <span className="font-semibold text-foreground">Confidence:</span>{' '}
                {getConfidenceExplanation(confidence)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Action (if not compact and not expanded) */}
      {!compact && !expanded && explanation.action && (
        <div className="text-xs text-fg-subtle italic px-0.5">{explanation.action}</div>
      )}
    </div>
  );
}
