import React from 'react';
import { X, Wind, Plane, Database, Globe, Clock, Sparkles, MapPin, AlertTriangle, Zap } from 'lucide-react';

export default function About({ onClose }) {
  const features = [
    {
      icon: <Globe size={20} />,
      title: 'Interactive Map',
      description: 'Explore weather stations on a clustered globe. Click any station to see live conditions.',
      color: 'blue'
    },
    {
      icon: <Wind size={20} />,
      title: 'Live Weather',
      description: 'Get real-time wind speed, temperature, and pressure. Comes from METAR airport broadcasts.',
      color: 'cyan'
    },
    {
      icon: <Clock size={20} />,
      title: 'Time Travel',
      description: 'Slide through historical wind snapshots to see how conditions changed over time.',
      color: 'purple'
    },
    {
      icon: <Plane size={20} />,
      title: 'Nearby Flights',
      description: 'See aircraft in your area. Check if they\'d be safe to land based on current wind.',
      color: 'amber'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'AI Analysis',
      description: 'Get smart insights about weather patterns and safety using Google Gemini.',
      color: 'violet'
    },
    {
      icon: <AlertTriangle size={20} />,
      title: 'Risk Assessment',
      description: 'Quick red/yellow/green ratings for landing safety based on wind & gusts.',
      color: 'red'
    }
  ];

  const colorMap = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400'
  };

  const techStack = [
    {
      category: 'Frontend',
      items: ['React', 'Vite', 'Tailwind CSS', 'Mapbox GL'],
      description: 'Fast, responsive single-page app with interactive globe'
    },
    {
      category: 'Backend',
      items: ['Node.js', 'Express'],
      description: 'Lightweight API server that glues all data sources together'
    },
    {
      category: 'Data APIs',
      items: ['METAR', 'WindBorne', 'OpenSky', 'Gemini'],
      description: 'Real-time weather, historical wind, live aircraft, and AI insights'
    }
  ];

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between bg-linear-to-r from-blue-500/10 to-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AeroSense</h2>
              <p className="text-xs text-zinc-400">Live weather & flight tracking for your area</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Features Grid */}
          <div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-4">Core Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, idx) => (
                <div key={idx} className={`border rounded-lg p-4 transition-all hover:shadow-lg ${colorMap[feature.color]}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 bg-black/30 rounded-lg mt-0.5">
                      {feature.icon}
                    </div>
                    <h4 className="font-semibold text-white text-sm">{feature.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How Features Work */}
          <div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-4">How It Works</h3>
            <div className="space-y-3">
              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/20 rounded text-blue-400 mt-0.5 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">1. Pick a Station</p>
                    <p className="text-xs text-zinc-400">Click any station on the map to load its weather data and see nearby aircraft.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded text-cyan-400 mt-0.5 shrink-0">
                    <Wind size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">2. View Live Conditions</p>
                    <p className="text-xs text-zinc-400">See real-time wind speed, temperature, and pressure pulled from live airport METAR data. The wind overlay on the map shows the local wind field.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded text-purple-400 mt-0.5 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">3. Time Travel (Optional)</p>
                    <p className="text-xs text-zinc-400">Use the time slider to look back at past wind conditions. Helps you understand weather patterns and trends over hours or days.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded text-amber-400 mt-0.5 shrink-0">
                    <Plane size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">4. Check Aircraft</p>
                    <p className="text-xs text-zinc-400">See planes nearby with their altitude and distance. The app estimates if they could safely land based on current wind conditions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-4">Technology</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {techStack.map((section, idx) => (
                <div key={idx} className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white text-sm mb-2">{section.category}</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {section.items.map((item, i) => (
                      <span key={i} className="bg-zinc-700/50 text-zinc-300 text-xs px-2.5 py-1 rounded-full font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400">{section.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-4">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="font-semibold text-blue-300 text-sm mb-1">METAR</p>
                <p className="text-xs text-blue-200/80">Real-time airport weather broadcasts. Wind, temp, pressure.</p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <p className="font-semibold text-cyan-300 text-sm mb-1">WindBorne</p>
                <p className="text-xs text-cyan-200/80">Historical wind data and station grid. Used for time travel.</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="font-semibold text-amber-300 text-sm mb-1">OpenSky</p>
                <p className="text-xs text-amber-200/80">Live aircraft positions and flight data. Public API.</p>
              </div>
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                <p className="font-semibold text-violet-300 text-sm mb-1">Google Gemini</p>
                <p className="text-xs text-violet-200/80">AI-powered analysis of weather trends and safety insights.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/30 text-xs text-zinc-500 text-center">
          Built with React, Express, and love for aviation weather.
        </div>
      </div>
    </div>
  );
}
