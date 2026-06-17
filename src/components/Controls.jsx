import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Wind, Clock, Sparkles, Loader2, X, Thermometer, AlertTriangle, CheckCircle, ChevronDown, Maximize2, Columns, BookOpen, Info, Github, Home, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import About from './About';
import { getApiEndpoint } from '../utils/api';

// Shared markdown renderers (compact + comfortable variants)
const compactMarkdown = {
    p: ({ ...props }) => <p className="mb-2" {...props} />,
    ul: ({ ...props }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-1" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-1" {...props} />,
    li: ({ ...props }) => <li className="mb-1" {...props} />,
    strong: ({ ...props }) => <strong className="font-semibold text-fg" {...props} />,
    em: ({ ...props }) => <em className="italic" {...props} />,
    code: ({ ...props }) => <code className="bg-surface-3 px-1 py-0.5 rounded text-accent font-mono text-[10px]" {...props} />,
};

const comfortableMarkdown = {
    h1: ({ ...props }) => <h1 className="text-xl font-bold text-fg mt-4 mb-3" {...props} />,
    h2: ({ ...props }) => <h2 className="text-lg font-bold text-fg mt-4 mb-2" {...props} />,
    h3: ({ ...props }) => <h3 className="text-base font-bold text-fg mt-3 mb-2" {...props} />,
    p: ({ ...props }) => <p className="mb-3" {...props} />,
    ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props} />,
    li: ({ ...props }) => <li className="mb-1" {...props} />,
    strong: ({ ...props }) => <strong className="font-semibold text-fg" {...props} />,
    em: ({ ...props }) => <em className="italic" {...props} />,
    code: ({ ...props }) => <code className="bg-surface-3 px-2 py-1 rounded text-accent font-mono text-xs" {...props} />,
    blockquote: ({ ...props }) => <blockquote className="border-l-2 border-accent/50 pl-4 italic text-fg-muted my-3" {...props} />,
};

// Expandable Section Component
function ExpandableSection({ title, icon, content, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!content || content.trim() === '') {
        return null;
    }

    return (
        <div className="card overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-surface-3 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="text-fg-subtle">{icon}</div>
                    <span className="eyebrow">{title}</span>
                </div>
                <ChevronDown size={14} className={`text-fg-subtle transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-3 pb-3 pt-2 border-t border-border">
                    <div className="text-xs text-fg-muted leading-relaxed">
                        <ReactMarkdown components={compactMarkdown}>{content}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Controls({
    mapRef,
    searchQuery,
    setSearchQuery,
    stations = [],
    onSelect,
    weatherData,
    timeIndex,
    setTimeIndex,
    windAnimationPaused,
    setWindAnimationPaused,
    selectedStation,
    compareEnabled,
    setCompareEnabled,
    compareIndexA,
    setCompareIndexA,
    compareIndexB,
    setCompareIndexB,
    demoEligible,
    useDemoData,
    onToggleDemoMode,
    onReturnToLanding,
    onResetAll
}) {
    const [results, setResults] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [shortcutLabel, setShortcutLabel] = useState('Ctrl K');
    const searchInputRef = useRef(null);

    useEffect(() => {
        const isMac = typeof navigator !== 'undefined' && /mac|ipod|iphone|ipad/i.test(navigator.userAgent);
        setShortcutLabel(isMac ? 'Cmd K' : 'Ctrl K');

        const handleShortcut = (e) => {
            const key = e.key?.toLowerCase();
            const isShortcut = (isMac && e.metaKey && key === 'k') || (!isMac && e.ctrlKey && key === 'k');
            if (isShortcut) {
                e.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    // Clear analysis when station changes
    useEffect(() => {
        setAnalysis(null);
        setShowAnalysis(false);
        setAnalysisError(null);
    }, [selectedStation?.id]);

    // Filter Search Results
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        const sanitizedQuery = searchQuery.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

        if (!sanitizedQuery) {
            setResults([]);
            return;
        }

        const filtered = stations.filter(s =>
            (s.station_name && s.station_name.toLowerCase().includes(sanitizedQuery.toLowerCase())) ||
            (s.station_id && s.station_id.toLowerCase().includes(sanitizedQuery.toLowerCase()))
        ).slice(0, 5);

        setResults(filtered);
    }, [searchQuery, stations]);

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '---';
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const runAnalysis = async () => {
        if (showAnalysis && analysis) {
            setShowAnalysis(false);
            return;
        }
        if (analysis) {
            setShowAnalysis(true);
            return;
        }

        setAnalysisLoading(true);
        setAnalysisError(null);
        try {
            const demoQuery = useDemoData ? '&demo=true' : '';
            const res = await fetch(getApiEndpoint(`/api/analyze?station=${selectedStation.id}${demoQuery}`));
            if (res.ok) {
                const data = await res.json();
                setAnalysis(data);
                setShowAnalysis(true);
            } else {
                const error = await res.json().catch(() => ({}));
                setAnalysisError(error.error || 'Analysis could not be completed. Please try again.');
            }
        } catch {
            setAnalysisError('Failed to reach the analysis service. Please try again.');
        } finally {
            setAnalysisLoading(false);
        }
    };

    const currentPoint = weatherData?.points?.[timeIndex];
    const maxIndex = weatherData?.points ? weatherData.points.length - 1 : 0;
    const analysisDisabled = analysisLoading || !weatherData?.points || weatherData.points.length === 0;

    const renderAnalysisBody = (variant) => {
        const compact = variant === 'compact';
        return (
            <div className={compact ? 'space-y-3' : 'space-y-4'}>
                {analysis.dataPointsAnalyzed && (
                    <div className={`text-[10px] text-fg-subtle ${compact ? '' : 'pb-2 border-b border-border'}`}>
                        Analyzed {analysis.dataPointsAnalyzed} data points
                        {analysis.dateRange && (
                            <span className="ml-2">
                                • {new Date(analysis.dateRange.start).toLocaleDateString()} to{' '}
                                {new Date(analysis.dateRange.end).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                )}

                {!analysis.summary && analysis.insights && (
                    <div className={`${compact ? 'max-h-96 overflow-y-auto pr-2 text-xs' : 'text-sm'} text-fg-muted leading-relaxed`}>
                        <ReactMarkdown components={compact ? compactMarkdown : comfortableMarkdown}>
                            {analysis.insights}
                        </ReactMarkdown>
                    </div>
                )}

                {analysis.summary?.keyInsights?.length > 0 && (
                    <div className="rounded-xl border border-accent/30 bg-accent/[0.07] p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-accent" />
                            <span className="eyebrow text-accent/90">Key Insights</span>
                        </div>
                        <ul className="space-y-1.5">
                            {(compact ? analysis.summary.keyInsights.slice(0, 4) : analysis.summary.keyInsights).map((insight, idx) => (
                                <li key={idx} className={`${compact ? 'text-[11px]' : 'text-sm'} text-fg-muted flex items-start gap-2`}>
                                    <span className="text-accent mt-0.5">•</span>
                                    <span>{insight}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {analysis.details && (
                    <div className={`space-y-2 ${compact ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                        <ExpandableSection title="Wind Patterns" icon={<Wind size={14} />} content={analysis.details.windPatterns} defaultOpen={!compact} />
                        <ExpandableSection title="Temperature Trends" icon={<Thermometer size={14} />} content={analysis.details.temperatureTrends} defaultOpen={!compact} />
                        <ExpandableSection title="Safety Assessment" icon={<CheckCircle size={14} />} content={analysis.details.safetyAssessment} defaultOpen={!compact} />
                        <ExpandableSection title="Weather Anomalies" icon={<AlertTriangle size={14} />} content={analysis.details.anomalies} defaultOpen={!compact} />
                        <ExpandableSection title="Recommendations" icon={<Info size={14} />} content={analysis.details.recommendations} defaultOpen={!compact} />
                    </div>
                )}

                <div className="pt-2 border-t border-border text-[10px] text-fg-subtle text-center">
                    Powered by Google Gemini
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="absolute top-3 left-3 right-3 md:right-auto md:w-[26rem] z-50 flex flex-col gap-3 font-sans max-h-[calc(100vh-1.5rem)] overflow-y-auto no-scrollbar">

                {/* Header: Title + Actions */}
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (mapRef?.current) {
                                mapRef.current.flyTo({ center: [-95, 40], zoom: 3, duration: 1500 });
                            }
                            onResetAll?.();
                        }}
                        className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity"
                        title="Reset to world view"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 shrink-0">
                            <Wind size={18} className="text-accent" />
                        </div>
                        <h1 className="text-xl font-bold text-fg tracking-tight truncate">
                            Aero<span className="text-accent">Sense</span>
                        </h1>
                    </button>
                    <div className="flex items-center gap-1.5">
                        {demoEligible && (
                            <button
                                onClick={onToggleDemoMode}
                                className={`icon-btn ${useDemoData ? 'border-caution/60 bg-caution/15 text-caution hover:text-caution' : ''}`}
                                title={useDemoData ? 'Disable demo mode' : 'Use demo data'}
                                aria-pressed={useDemoData}
                            >
                                <Database size={17} />
                            </button>
                        )}
                        <button onClick={onReturnToLanding} className="icon-btn" title="Return to landing page">
                            <Home size={17} />
                        </button>
                        <a
                            href="https://github.com/sairithik9849/AeroSense"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            title="View on GitHub"
                        >
                            <Github size={17} />
                        </a>
                        <button onClick={() => setShowAbout(true)} className="icon-btn" title="About AeroSense">
                            <BookOpen size={17} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <div className="relative panel rounded-xl overflow-hidden transition-colors group-focus-within:border-accent/60">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-fg-subtle group-focus-within:text-accent transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search stations or station IDs"
                            aria-label="Search weather stations"
                            className="w-full bg-transparent text-fg text-sm md:text-[15px] pl-11 pr-20 py-3.5 focus:outline-none placeholder:text-fg-subtle"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center">
                            <kbd className="px-2 py-1 text-[10px] font-medium leading-none rounded-md border border-border bg-surface-2 text-fg-subtle select-none">
                                {shortcutLabel}
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Search Results */}
                {results.length > 0 && (
                    <div className="panel overflow-hidden max-h-64 overflow-y-auto no-scrollbar animate-panel-in">
                        {results.map((station) => (
                            <button
                                key={station.station_id}
                                onClick={() => onSelect(station)}
                                className="w-full text-left px-3.5 py-3 hover:bg-surface-3 transition-colors flex items-center gap-3 border-b border-border last:border-0"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                                    <MapPin size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm text-fg truncate">{station.station_name || "Unknown Station"}</p>
                                    <p className="text-xs text-fg-subtle font-mono">{station.station_id}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Time Travel + Analysis */}
                {weatherData && (
                    <div className="panel p-4 animate-panel-in">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-fg-muted">
                                    <Clock size={16} />
                                </div>
                                <div className="leading-tight">
                                    <p className="eyebrow">Historical View</p>
                                    <p className="font-mono text-sm font-semibold text-fg flex gap-2">
                                        {formatDate(currentPoint?.timestamp)}
                                        <span className="text-fg-subtle">·</span>
                                        {formatTime(currentPoint?.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setWindAnimationPaused(!windAnimationPaused)}
                                    className={`icon-btn ${!windAnimationPaused ? 'border-accent/50 bg-accent/15 text-accent hover:text-accent' : ''}`}
                                    title={windAnimationPaused ? 'Resume wind animation' : 'Pause wind animation'}
                                    aria-pressed={!windAnimationPaused}
                                >
                                    <Wind size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const next = !compareEnabled;
                                        setCompareEnabled(next);
                                        setWindAnimationPaused(!next ? true : false);
                                    }}
                                    className={`icon-btn ${compareEnabled ? 'border-safe/50 bg-safe/15 text-safe hover:text-safe' : ''}`}
                                    title={compareEnabled ? 'Disable compare view' : 'Enable compare view'}
                                    aria-pressed={compareEnabled}
                                >
                                    <Columns size={16} />
                                </button>
                            </div>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max={maxIndex}
                            value={timeIndex}
                            onChange={(e) => setTimeIndex(Number(e.target.value))}
                            aria-label="Select historical time"
                            className="slider w-full"
                        />
                        <div className="flex justify-between text-[10px] text-fg-subtle font-mono mt-1.5">
                            <span>Start</span>
                            <span>Now</span>
                        </div>

                        {/* Compare pickers */}
                        {compareEnabled && weatherData?.points && weatherData.points.length > 1 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Compare A', idx: compareIndexA, set: setCompareIndexA, cls: 'slider-safe' },
                                    { label: 'Compare B', idx: compareIndexB, set: setCompareIndexB, cls: 'slider-caution' },
                                ].map((item) => (
                                    <div key={item.label}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="eyebrow">{item.label}</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-fg-muted mb-1.5">
                                            {formatDate(weatherData.points?.[item.idx]?.timestamp)} · {formatTime(weatherData.points?.[item.idx]?.timestamp)}
                                        </p>
                                        <input
                                            type="range"
                                            min="0"
                                            max={maxIndex}
                                            value={Math.min(Math.max(0, item.idx ?? 0), maxIndex)}
                                            onChange={(e) => item.set(Number(e.target.value))}
                                            aria-label={item.label}
                                            className={`slider ${item.cls} w-full`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Analysis Section */}
                        {selectedStation && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-fg-muted">
                                            <Sparkles size={15} />
                                        </div>
                                        <h3 className="eyebrow">AI Analysis</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {analysis && (
                                            <button
                                                onClick={() => setShowAnalysisModal(true)}
                                                className="icon-btn"
                                                title="Open in larger window"
                                            >
                                                <Maximize2 size={15} />
                                            </button>
                                        )}
                                        <button
                                            onClick={runAnalysis}
                                            disabled={analysisDisabled}
                                            className={showAnalysis && analysis ? 'btn-secondary !py-2' : 'btn-primary !py-2'}
                                            title={showAnalysis && analysis ? 'Hide analysis' : 'Analyze station data with AI'}
                                        >
                                            {analysisLoading ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" />
                                                    <span className="text-xs">Analyzing</span>
                                                </>
                                            ) : showAnalysis && analysis ? (
                                                <>
                                                    <X size={15} />
                                                    <span className="text-xs">Hide</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={15} />
                                                    <span className="text-xs">Analyze</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {analysisError && (
                                    <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        <span>{analysisError}</span>
                                    </div>
                                )}

                                {showAnalysis && analysis && (
                                    <div className="mt-3">
                                        {renderAnalysisBody('compact')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Analysis Modal */}
            {showAnalysisModal && analysis && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowAnalysisModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="AI weather analysis"
                >
                    <div
                        className="panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/20">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-fg">AI Weather Analysis</h2>
                                    {selectedStation && (
                                        <p className="text-xs text-fg-subtle">{selectedStation.name || selectedStation.id}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setShowAnalysisModal(false)} className="icon-btn" aria-label="Close analysis">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {renderAnalysisBody('comfortable')}
                        </div>
                    </div>
                </div>
            )}

            {/* About Modal */}
            {showAbout && <About onClose={() => setShowAbout(false)} />}
        </>
    );
}
