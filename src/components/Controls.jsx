import React, { useState, useEffect } from 'react';
import { Search, MapPin, Wind, Plane, Clock, Sparkles, Loader2, X, Thermometer, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Maximize2, Columns, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import About from './About';
import { getApiEndpoint } from '../utils/api';

// Expandable Section Component
function ExpandableSection({ title, icon, content, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!content || content.trim() === '') {
        return null;
    }

    return (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg overflow-hidden transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="text-zinc-400">{icon}</div>
                    <span className="text-xs font-semibold text-zinc-300 uppercase">{title}</span>
                </div>
                <div className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown size={14} className="text-zinc-400" />
                </div>
            </button>
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-500px opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-3 pb-3 pt-2 border-t border-zinc-700/50">
                    <div className="text-xs text-zinc-300 leading-relaxed">
                        <ReactMarkdown
                            components={{
                                p: ({...props}) => <p className="mb-2" {...props} />,
                                ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2" {...props} />,
                                ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2" {...props} />,
                                li: ({...props}) => <li className="mb-1" {...props} />,
                                strong: ({...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
                                em: ({...props}) => <em className="italic" {...props} />,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
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
    onResetAll
}) {
    const [results, setResults] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    // Clear analysis when station changes
    useEffect(() => {
        setAnalysis(null);
        setShowAnalysis(false);
    }, [selectedStation?.id]);

    // Filter Search Results
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        // Sanitize search input - remove dangerous characters but allow alphanumeric, spaces, hyphens
        const sanitizedQuery = searchQuery.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
        
        if (!sanitizedQuery) {
            setResults([]);
            return;
        }

        const filtered = stations.filter(s =>
            (s.station_name && s.station_name.toLowerCase().includes(sanitizedQuery.toLowerCase())) ||
            (s.station_id && s.station_id.toLowerCase().includes(sanitizedQuery.toLowerCase()))
        ).slice(0, 5); // Limit to 5 results

        setResults(filtered);
    }, [searchQuery, stations]);

    // No playback: user selects discrete timestamps or uses slider

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '---';
        const date = new Date(isoString);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Calculate current point info if available
    const currentPoint = weatherData?.points?.[timeIndex];
    const maxIndex = weatherData?.points ? weatherData.points.length - 1 : 0;

    return (
        <>
        <div className="absolute top-2 left-2 right-2 md:right-auto md:w-96 z-50 flex flex-col gap-2 md:gap-3 font-sans max-h-[90vh] overflow-y-auto">

            {/* Header: Title + About Button */}
            <div className="flex items-center justify-between px-1 gap-2">
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Reset everything simultaneously
                        if (mapRef?.current) {
                            mapRef.current.flyTo({
                                center: [-95, 40],
                                zoom: 3,
                                duration: 1500
                            });
                        }
                        onResetAll?.();
                    }}
                    className="flex items-center gap-2 md:gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
                    title="Reset to world view"
                >
                    <div className="p-1 md:p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30 shrink-0">
                        <Wind size={16} className="md:hidden text-blue-400" />
                        <Wind size={18} className="hidden md:block text-blue-400" />
                    </div>
                    <h1 className="text-lg md:text-xl font-bold bg-linear-to-r from-blue-100 to-blue-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight truncate">
                        AeroSense
                    </h1>
                </button>
                <button
                    onClick={() => setShowAbout(true)}
                    className="p-2 rounded-lg border border-zinc-700/60 bg-zinc-900/90 backdrop-blur-md text-zinc-400 hover:text-blue-300 hover:border-blue-500/50 transition-all shrink-0"
                    title="Learn more about AeroSense"
                >
                    <BookOpen size={16} className="md:hidden" />
                    <BookOpen size={18} className="hidden md:block" />
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                    <Search size={16} className="md:hidden" />
                    <Search size={18} className="hidden md:block" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 text-white text-sm md:text-base pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 rounded-lg md:rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-500 hover:bg-zinc-900 hover:border-zinc-600/80"
                />
                {/* Search icon background accent */}
                <div className="absolute inset-y-0 left-0 w-9 md:w-10 bg-linear-to-r from-blue-500/5 to-transparent rounded-l-lg md:rounded-l-xl pointer-events-none group-focus-within:from-blue-500/10 transition-colors" />
            </div>

            {/* Time Travel Controls (Optimized for Visibility) */}
            {weatherData && (
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <div className="p-1.5 bg-purple-500/20 rounded text-purple-400">
                                <Clock size={16} />
                            </div>
                            <div className="leading-tight">
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wide">Historical View</p>
                                <p className="font-mono text-sm font-bold text-white flex gap-2">
                                    {formatDate(currentPoint?.timestamp)}
                                    <span className="text-zinc-500">|</span>
                                    {formatTime(currentPoint?.timestamp)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Wind Animation Toggle Button */}
                            <button
                                onClick={() => setWindAnimationPaused(!windAnimationPaused)}
                                className={`p-2 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                                    windAnimationPaused
                                        ? 'bg-zinc-800/50 text-zinc-400 border-zinc-600/50'
                                        : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                }`}
                                title={windAnimationPaused ? 'Resume wind animation' : 'Pause wind animation'}
                            >
                                <Wind size={16} />
                            </button>

                            {/* Compare Toggle */}
                            <button
                                onClick={() => {
                                    const next = !compareEnabled;
                                    setCompareEnabled(next);
                                    // Auto start/stop wind animation with compare toggle
                                    setWindAnimationPaused(!next ? true : false);
                                }}
                                className={`p-2 rounded-full border transition-all hover:scale-105 active:scale-95 ${compareEnabled
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                    : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/50'
                                }`}
                                title={compareEnabled ? 'Disable compare view' : 'Enable compare view'}
                            >
                                <Columns size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="relative h-6 flex items-center">
                        <input
                            type="range"
                            min="0"
                            max={maxIndex}
                            value={timeIndex}
                            onChange={(e) => {
                                setTimeIndex(Number(e.target.value));
                            }}
                            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                    {/* Compare pickers */}
                    {compareEnabled && weatherData?.points && weatherData.points.length > 1 && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase text-zinc-500 font-bold">Compare A</span>
                                    <span className="text-[10px] font-mono text-zinc-400">
                                        {formatDate(weatherData.points?.[compareIndexA]?.timestamp)}
                                        {' '}|{' '}
                                        {formatTime(weatherData.points?.[compareIndexA]?.timestamp)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxIndex}
                                    value={Math.min(Math.max(0, compareIndexA ?? 0), maxIndex)}
                                    onChange={(e) => setCompareIndexA(Number(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase text-zinc-500 font-bold">Compare B</span>
                                    <span className="text-[10px] font-mono text-zinc-400">
                                        {formatDate(weatherData.points?.[compareIndexB]?.timestamp)}
                                        {' '}|{' '}
                                        {formatTime(weatherData.points?.[compareIndexB]?.timestamp)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxIndex}
                                    value={Math.min(Math.max(0, compareIndexB ?? 0), maxIndex)}
                                    onChange={(e) => setCompareIndexB(Number(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                        <span>Start</span>
                        <span>Now</span>
                    </div>

                    {/* Analysis Section - Show when station is selected */}
                    {selectedStation && (
                        <div className="mt-4 pt-4 border-t border-zinc-700/50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-500/20 rounded text-purple-400">
                                        <Sparkles size={14} />
                                    </div>
                                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                                        AI Analysis
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {analysis && (
                                        <button
                                            onClick={() => setShowAnalysisModal(true)}
                                            className="p-1.5 rounded border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all"
                                            title="Open in larger window"
                                        >
                                            <Maximize2 size={14} />
                                        </button>
                                    )}
                                    <button
                                    onClick={async () => {
                                        if (showAnalysis && analysis) {
                                            setShowAnalysis(false);
                                            return;
                                        }
                                        
                                        if (analysis) {
                                            setShowAnalysis(true);
                                            return;
                                        }

                                        setAnalysisLoading(true);
                                        try {
                                            const res = await fetch(getApiEndpoint(`/api/analyze?station=${selectedStation.id}`));
                                            if (res.ok) {
                                                const data = await res.json();
                                                setAnalysis(data);
                                                setShowAnalysis(true);
                                            } else {
                                                const error = await res.json();
                                                alert(`Analysis failed: ${error.error || 'Unknown error'}`);
                                            }
                                        } catch {
                                            alert('Failed to analyze station data. Please try again.');
                                        } finally {
                                            setAnalysisLoading(false);
                                        }
                                    }}
                                    disabled={analysisLoading || !weatherData?.points || weatherData.points.length === 0}
                                    className={`px-3 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                                        showAnalysis && analysis
                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                                            : analysisLoading || !weatherData?.points || weatherData.points.length === 0
                                            ? 'bg-zinc-700/50 text-zinc-500 border-zinc-600/50 cursor-not-allowed'
                                            : 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30'
                                    }`}
                                    title={showAnalysis && analysis ? "Hide analysis" : analysisLoading ? "Loading analysis..." : "Analyze station data with AI"}
                                >
                                    {analysisLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-xs font-semibold\">Analyzing...</span>
                                        </>
                                    ) : showAnalysis && analysis ? (
                                        <>
                                            <X size={16} />
                                            <span className="text-xs">Hide</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span className="text-xs">Analyze</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            </div>

                            {showAnalysis && analysis && (
                                <div className="mt-3 space-y-3">
                                    {/* Analysis Metadata */}
                                    {analysis.dataPointsAnalyzed && (
                                        <div className="text-[10px] text-zinc-500">
                                            Analyzed {analysis.dataPointsAnalyzed} data points
                                            {analysis.dateRange && (
                                                <span className="ml-2">
                                                    • {new Date(analysis.dateRange.start).toLocaleDateString()} to{' '}
                                                    {new Date(analysis.dateRange.end).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Backward compatibility: Show old format if summary doesn't exist */}
                                    {!analysis.summary && analysis.insights && (
                                        <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar text-xs text-zinc-300 leading-relaxed">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({...props}) => <h1 className="text-base font-bold text-zinc-200 mt-3 mb-2" {...props} />,
                                                    h2: ({...props}) => <h2 className="text-sm font-bold text-zinc-200 mt-3 mb-2" {...props} />,
                                                    h3: ({...props}) => <h3 className="text-xs font-bold text-zinc-200 mt-2 mb-1" {...props} />,
                                                    p: ({...props}) => <p className="mb-2" {...props} />,
                                                    ul: ({...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                                    ol: ({...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                                    li: ({...props}) => <li className="ml-2" {...props} />,
                                                    strong: ({...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
                                                    em: ({...props}) => <em className="italic" {...props} />,
                                                    code: ({...props}) => <code className="bg-zinc-800 px-1 py-0.5 rounded text-purple-400 font-mono text-[10px]" {...props} />,
                                                    blockquote: ({...props}) => <blockquote className="border-l-2 border-purple-500/50 pl-2 italic text-zinc-400" {...props} />,
                                                }}
                                            >
                                                {analysis.insights}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    {/* Key Insights Card */}
                                    {analysis.summary && analysis.summary.keyInsights && analysis.summary.keyInsights.length > 0 && (
                                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles size={14} className="text-purple-400" />
                                                <span className="text-xs font-semibold text-zinc-300 uppercase">Key Insights</span>
                                            </div>
                                            <ul className="space-y-1.5">
                                                {analysis.summary.keyInsights.slice(0, 4).map((insight, idx) => (
                                                    <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                                                        <span className="text-purple-400 mt-0.5">•</span>
                                                        <span>{insight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Expandable Details Sections */}
                                    {analysis.details && (
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            <ExpandableSection
                                                title="Wind Patterns"
                                                icon={<Wind size={14} />}
                                                content={analysis.details.windPatterns}
                                                defaultOpen={false}
                                            />
                                            <ExpandableSection
                                                title="Temperature Trends"
                                                icon={<Thermometer size={14} />}
                                                content={analysis.details.temperatureTrends}
                                                defaultOpen={false}
                                            />
                                            <ExpandableSection
                                                title="Safety Assessment"
                                                icon={<CheckCircle size={14} />}
                                                content={analysis.details.safetyAssessment}
                                                defaultOpen={false}
                                            />
                                            <ExpandableSection
                                                title="Weather Anomalies"
                                                icon={<AlertTriangle size={14} />}
                                                content={analysis.details.anomalies}
                                                defaultOpen={false}
                                            />
                                            <ExpandableSection
                                                title="Recommendations"
                                                icon={<Info size={14} />}
                                                content={analysis.details.recommendations}
                                                defaultOpen={false}
                                            />
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="pt-2 border-t border-zinc-800 text-[9px] text-zinc-600 text-center">
                                        Powered by Google Gemini AI
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-lg md:rounded-xl shadow-2xl overflow-hidden max-h-48 md:max-h-64 overflow-y-auto custom-scrollbar">
                    {results.map((station) => (
                        <button
                            key={station.station_id}
                            onClick={() => onSelect(station)}
                            className="w-full text-left px-3 md:px-4 py-2 md:py-3 hover:bg-zinc-800/50 transition flex items-center gap-2 md:gap-3 border-b border-zinc-800 last:border-0"
                        >
                            <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-full text-blue-400 shrink-0">
                                <MapPin size={14} className="md:hidden" />
                                <MapPin size={16} className="hidden md:block" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs md:text-sm text-zinc-200 truncate">{station.station_name || "Unknown Station"}</p>
                                <p className="text-[10px] md:text-xs text-zinc-500 font-mono">{station.station_id}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

        </div>

        {/* Analysis Modal - Outside main Controls div for proper z-index */}
        {showAnalysisModal && analysis && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Modal Header */}
                    <div className="p-4 border-b border-zinc-700 flex items-center justify-between bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">AI Analysis</h2>
                                {selectedStation && (
                                    <p className="text-xs text-zinc-400">{selectedStation.name || selectedStation.id}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAnalysisModal(false)}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {/* Analysis Metadata */}
                        {analysis.dataPointsAnalyzed && (
                            <div className="text-xs text-zinc-500 pb-2 border-b border-zinc-800">
                                Analyzed {analysis.dataPointsAnalyzed} data points
                                {analysis.dateRange && (
                                    <span className="ml-2">
                                        • {new Date(analysis.dateRange.start).toLocaleDateString()} to{' '}
                                        {new Date(analysis.dateRange.end).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Backward compatibility: Show old format if summary doesn't exist */}
                        {!analysis.summary && analysis.insights && (
                            <div className="text-sm text-zinc-300 leading-relaxed">
                                <ReactMarkdown
                                    components={{
                                        h1: ({...props}) => <h1 className="text-xl font-bold text-zinc-200 mt-4 mb-3" {...props} />,
                                        h2: ({...props}) => <h2 className="text-lg font-bold text-zinc-200 mt-4 mb-2" {...props} />,
                                        h3: ({...props}) => <h3 className="text-base font-bold text-zinc-200 mt-3 mb-2" {...props} />,
                                        p: ({...props}) => <p className="mb-3" {...props} />,
                                        ul: ({...props}) => <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props} />,
                                        ol: ({...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props} />,
                                        li: ({...props}) => <li className="mb-1" {...props} />,
                                        strong: ({...props}) => <strong className="font-semibold text-zinc-200" {...props} />,
                                        em: ({...props}) => <em className="italic" {...props} />,
                                        code: ({...props}) => <code className="bg-zinc-800 px-2 py-1 rounded text-purple-400 font-mono text-xs" {...props} />,
                                        blockquote: ({...props}) => <blockquote className="border-l-2 border-purple-500/50 pl-4 italic text-zinc-400 my-3" {...props} />,
                                    }}
                                >
                                    {analysis.insights}
                                </ReactMarkdown>
                            </div>
                        )}

                        {/* Key Insights Card */}
                        {analysis.summary && analysis.summary.keyInsights && analysis.summary.keyInsights.length > 0 && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={16} className="text-purple-400" />
                                    <span className="text-sm font-semibold text-zinc-300 uppercase">Key Insights</span>
                                </div>
                                <ul className="space-y-2">
                                    {analysis.summary.keyInsights.map((insight, idx) => (
                                        <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                                            <span className="text-purple-400 mt-1">•</span>
                                            <span>{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Expandable Details Sections */}
                        {analysis.details && (
                            <div className="space-y-3">
                                <ExpandableSection
                                    title="Wind Patterns"
                                    icon={<Wind size={16} />}
                                    content={analysis.details.windPatterns}
                                    defaultOpen={true}
                                />
                                <ExpandableSection
                                    title="Temperature Trends"
                                    icon={<Thermometer size={16} />}
                                    content={analysis.details.temperatureTrends}
                                    defaultOpen={true}
                                />
                                <ExpandableSection
                                    title="Safety Assessment"
                                    icon={<CheckCircle size={16} />}
                                    content={analysis.details.safetyAssessment}
                                    defaultOpen={true}
                                />
                                <ExpandableSection
                                    title="Weather Anomalies"
                                    icon={<AlertTriangle size={16} />}
                                    content={analysis.details.anomalies}
                                    defaultOpen={true}
                                />
                                <ExpandableSection
                                    title="Recommendations"
                                    icon={<Info size={16} />}
                                    content={analysis.details.recommendations}
                                    defaultOpen={true}
                                />
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-800/30 text-xs text-zinc-600 text-center">
                        Powered by Google Gemini AI
                    </div>
                </div>
            </div>
        )}

        {/* About Modal */}
        {showAbout && (
            <About onClose={() => setShowAbout(false)} />
        )}
        </>
    );
}
