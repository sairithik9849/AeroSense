import { X, Wind, Plane, Globe, Clock, Sparkles, MapPin, AlertTriangle, Zap } from 'lucide-react';

export default function About({ onClose }) {
  const features = [
    {
      icon: <Globe size={18} />,
      title: 'Interactive Map',
      description: 'Explore weather stations on a clustered globe. Click any station to see live conditions.',
    },
    {
      icon: <Wind size={18} />,
      title: 'Live Weather',
      description: 'Real-time wind speed, temperature, and pressure sourced from METAR airport broadcasts.',
    },
    {
      icon: <Clock size={18} />,
      title: 'Time Travel',
      description: 'Slide through historical wind snapshots to see how conditions changed over time.',
    },
    {
      icon: <Plane size={18} />,
      title: 'Nearby Flights',
      description: "See aircraft in your area and whether they'd be safe to land in current wind.",
    },
    {
      icon: <Sparkles size={18} />,
      title: 'AI Analysis',
      description: 'Smart insights about weather patterns and landing safety, powered by Google Gemini.',
    },
    {
      icon: <AlertTriangle size={18} />,
      title: 'Risk Assessment',
      description: 'Clear safe / caution / danger ratings for landing safety based on wind and gusts.',
    },
  ];

  const steps = [
    {
      icon: <MapPin size={16} />,
      title: '1. Pick a Station',
      description: 'Click any station on the map to load its weather data and see nearby aircraft.',
    },
    {
      icon: <Wind size={16} />,
      title: '2. View Live Conditions',
      description:
        'See real-time wind, temperature, and pressure pulled from live airport METAR data. The wind overlay shows the local wind field.',
    },
    {
      icon: <Clock size={16} />,
      title: '3. Time Travel (Optional)',
      description:
        'Use the time slider to look back at past wind conditions and understand patterns over hours or days.',
    },
    {
      icon: <Plane size={16} />,
      title: '4. Check Aircraft',
      description:
        'See nearby planes with altitude and distance. The app estimates if they could safely land in current wind.',
    },
  ];

  const techStack = [
    {
      category: 'Frontend',
      items: ['React', 'Vite', 'Tailwind CSS', 'Mapbox GL'],
      description: 'Fast, responsive single-page app with an interactive globe.',
    },
    {
      category: 'Backend',
      items: ['Node.js', 'Express'],
      description: 'Lightweight API server that glues all data sources together.',
    },
    {
      category: 'Caching & Storage',
      items: ['Upstash Redis'],
      description: 'Serverless Redis caching to reduce upstream API calls.',
    },
    {
      category: 'Data APIs',
      items: ['METAR', 'WindBorne', 'OpenSky', 'Gemini'],
      description: 'Real-time weather, historical wind, live aircraft, and AI insights.',
    },
  ];

  const dataSources = [
    { name: 'METAR', description: 'Real-time airport weather broadcasts — wind, temp, pressure.' },
    { name: 'WindBorne', description: 'Historical wind data and station grid. Powers time travel.' },
    { name: 'OpenSky', description: 'Live aircraft positions and flight data via public API.' },
    { name: 'Google Gemini', description: 'AI-powered analysis of weather trends and safety insights.' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-fade-in">
      <div className="panel rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Zap size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">AeroSense</h2>
              <p className="text-xs text-fg-muted">Live weather &amp; flight tracking for your area</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-3 rounded-lg transition text-fg-muted hover:text-foreground"
            aria-label="Close about dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-8 custom-scrollbar">
          {/* Features Grid */}
          <section>
            <h3 className="section-heading mb-4">Core Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((feature, idx) => (
                <div key={idx} className="card p-4 transition-colors hover:border-border-strong">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent shrink-0">
                      {feature.icon}
                    </span>
                    <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section>
            <h3 className="section-heading mb-4">How It Works</h3>
            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div key={idx} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-accent mt-0.5 shrink-0">
                      {step.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">{step.title}</p>
                      <p className="text-xs text-fg-muted leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section>
            <h3 className="section-heading mb-4">Technology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {techStack.map((section, idx) => (
                <div key={idx} className="card p-4">
                  <h4 className="font-semibold text-foreground text-sm mb-2.5">{section.category}</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {section.items.map((item, i) => (
                      <span
                        key={i}
                        className="bg-surface-3 text-fg-muted text-[11px] px-2 py-0.5 rounded-md font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">{section.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h3 className="section-heading mb-4">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {dataSources.map((source, idx) => (
                <div key={idx} className="card p-3.5">
                  <p className="font-semibold text-foreground text-sm mb-1">{source.name}</p>
                  <p className="text-xs text-fg-muted leading-relaxed">{source.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-2/50 text-xs text-fg-subtle text-center">
          Built with React, Express, and a love for aviation weather.
        </div>
      </div>
    </div>
  );
}
