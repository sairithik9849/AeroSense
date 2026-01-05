import React from 'react';
import { Wind, Plane, Globe, Clock, Sparkles, AlertTriangle, ArrowRight, Github, Database, Zap } from 'lucide-react';

export default function Landing({ onEnter }) {
  const features = [
    {
      icon: <Globe size={24} />,
      title: 'Interactive Map',
      description: 'Explore weather stations on a clustered globe',
      color: 'blue'
    },
    {
      icon: <Wind size={24} />,
      title: 'Live Weather',
      description: 'Real-time wind, temperature, and pressure data',
      color: 'cyan'
    },
    {
      icon: <Clock size={24} />,
      title: 'Time Travel',
      description: 'View historical wind snapshots over time',
      color: 'purple'
    },
    {
      icon: <Plane size={24} />,
      title: 'Nearby Flights',
      description: 'Track aircraft with landing risk assessment',
      color: 'amber'
    },
    {
      icon: <Sparkles size={24} />,
      title: 'AI Analysis',
      description: 'Smart weather insights powered by Gemini',
      color: 'violet'
    },
    {
      icon: <AlertTriangle size={24} />,
      title: 'Risk Assessment',
      description: 'Quick safety ratings based on conditions',
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

  const dataSources = [
    {
      name: 'METAR',
      description: 'Live airport weather broadcasts',
      icon: <Wind size={18} />
    },
    {
      name: 'WindBorne',
      description: 'Historical wind data & snapshots',
      icon: <Clock size={18} />
    },
    {
      name: 'OpenSky Network',
      description: 'Real-time aircraft tracking',
      icon: <Plane size={18} />
    },
    {
      name: 'Google Gemini',
      description: 'AI-powered weather insights',
      icon: <Sparkles size={18} />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-br from-zinc-950 via-zinc-900 to-blue-950 overflow-y-auto animate-fade-in">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6 text-blue-400 text-sm font-medium">
            <Wind size={16} className="animate-pulse" />
            <span>Live Aviation Weather Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Aero<span className="text-blue-400">Sense</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-300 mb-4 leading-relaxed">
            Real-time weather tracking and flight monitoring
          </p>
          
          <p className="text-base text-zinc-400 max-w-2xl mx-auto mb-12">
            Visualize live weather conditions, track nearby aircraft, and assess landing risks with AI-powered insights across thousands of stations worldwide.
          </p>

          {/* CTA Button */}
          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105"
          >
            <span>Enter Application</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto w-full mb-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Core Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in ${colorMap[feature.color]}`}
                style={{ animationDelay: `${0.2 + idx * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-black/30 rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="max-w-4xl mx-auto w-full mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-full mb-4">
              <Database size={16} className="text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Powered By</span>
            </div>
            <p className="text-zinc-400 text-sm">Real-time data from trusted aviation and weather APIs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dataSources.map((source, idx) => (
              <div
                key={idx}
                className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all animate-fade-in"
                style={{ animationDelay: `${0.8 + idx * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  {source.icon}
                  <h3 className="font-semibold text-white text-sm">{source.name}</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{source.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="max-w-4xl mx-auto w-full pt-8 border-t border-zinc-800 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-zinc-400 text-sm">
            <p>© 2026 AeroSense. Built for aviation enthusiasts.</p>
            
            <a
              href="https://github.com/sairithik9849/AeroSense"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors text-white"
            >
              <Github size={16} />
              <span>View on GitHub</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
