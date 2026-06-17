import { X, Sparkles, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';
import RiskExplanation from './RiskExplanation';

export default function AnalysisPanel({ analysis, onClose }) {
  if (!analysis || !analysis.insights) {
    return null;
  }

  // Format the insights text - handle markdown-like formatting
  const formatInsights = (text) => {
    // Split by common markdown patterns
    const lines = text.split('\n');
    const formatted = [];
    let currentSection = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      // Detect headings (lines starting with #, **, or numbered sections)
      if (trimmed.match(/^#{1,3}\s/) || trimmed.match(/^\d+\.\s+\*\*/) || trimmed.match(/^\*\*.*\*\*$/)) {
        if (currentSection) {
          formatted.push(currentSection);
        }
        currentSection = {
          type: 'heading',
          content: trimmed.replace(/^#{1,3}\s/, '').replace(/\*\*/g, ''),
          level: trimmed.match(/^#+/)?.[0]?.length || 2,
        };
      } else if (trimmed.length > 0) {
        if (!currentSection) {
          currentSection = { type: 'paragraph', content: [] };
        }
        if (currentSection.type === 'paragraph') {
          currentSection.content.push(trimmed);
        } else {
          formatted.push(currentSection);
          currentSection = { type: 'paragraph', content: [trimmed] };
        }
      } else if (trimmed.length === 0 && currentSection) {
        // Empty line - close current section
        if (currentSection.type === 'paragraph' && currentSection.content.length > 0) {
          formatted.push(currentSection);
        }
        currentSection = null;
      }
    });

    if (currentSection) {
      formatted.push(currentSection);
    }

    return formatted.length > 0 ? formatted : [{ type: 'paragraph', content: [text] }];
  };

  const formattedInsights = formatInsights(analysis.insights);

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent/15 rounded-lg text-accent">
            <Sparkles size={16} />
          </div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            AI Analysis
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-3 rounded transition text-fg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Analysis Metadata */}
      {analysis.dataPointsAnalyzed && (
        <div className="mb-4 p-2 bg-surface-2 rounded text-xs text-fg-muted">
          Analyzed {analysis.dataPointsAnalyzed} data points
          {analysis.dateRange && (
            <span className="ml-2">
              • {new Date(analysis.dateRange.start).toLocaleDateString()} to{' '}
              {new Date(analysis.dateRange.end).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* AI Safety Level - Visual Badge */}
      {analysis.safetyLevel && (
        <div className="mb-4">
          <RiskExplanation 
            risk={analysis.safetyLevel}
            confidence={null}
            factors={analysis.keyInsights || []}
            showFactors={false}
            compact={true}
          />
        </div>
      )}

      {/* Insights Content */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {formattedInsights.map((section, index) => {
          if (section.type === 'heading') {
            const HeadingTag = section.level === 1 ? 'h2' : section.level === 2 ? 'h3' : 'h4';
            return (
              <HeadingTag
                key={index}
                className={clsx(
                  "font-bold text-foreground mt-4 mb-2",
                  section.level === 1 && "text-lg",
                  section.level === 2 && "text-base",
                  section.level === 3 && "text-sm"
                )}
              >
                {section.content}
              </HeadingTag>
            );
          } else {
            return (
              <div key={index} className="text-sm text-fg-muted leading-relaxed">
                {section.content.map((paragraph, pIndex) => (
                  <p key={pIndex} className="mb-2">
                    {paragraph}
                  </p>
                ))}
              </div>
            );
          }
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border text-[10px] text-fg-subtle text-center">
        Powered by Google Gemini AI
      </div>
    </div>
  );
}

