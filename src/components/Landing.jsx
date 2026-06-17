import React from 'react';
import { Wind, Plane, Globe, Clock, Sparkles, AlertTriangle, ArrowRight, Github, Database } from 'lucide-react';

export default function Landing({ onEnter }) {
  const features = [
    {
      icon: <Globe size={20} />,
      title: 'Interactive Map',
      description: 'Explore thousands of weather stations on a clustered globe.',
    },
    {
      icon: <Wind size={20} />,
      title: 'Live Weather',
      description: 'Real-time wind, temperature, and pressure from airport broadcasts.',
    },
    {
      icon: <Clock size={20} />,
      title: 'Time Travel',
      description: 'Scrub through historical wind snapshots over the last 24 hours.',
    },
    {
      icon: <Plane size={20} />,
      title: 'Nearby Flights',
      description: 'Track aircraft in range with live landing-risk assessment.',
    },
    {
      icon: <Sparkles size={20} />,
      title: 'AI Analysis',
      description: 'Smart weather insights and safety guidance powered by Gemini.',
    },
    {
      icon: <AlertTriangle size={20} />,
      title: 'Risk Assessment',
      description: 'Clear safe / caution / danger ratings based on conditions.',
    },
  ];

  const dataSources = [
    { name: 'METAR', description: 'Live airport weather broadcasts' },
    { name: 'WindBorne', description: 'Historical wind data & snapshots' },
    { name: 'OpenSky Network', description: 'Real-time aircraft tracking' },
    { name: 'Google Gemini', description: 'AI-powered weather insights' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in">
      {/* Ambient accent glow (single, restrained) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(59,130,246,0.16),transparent_70%)]"
      />

      <div className="relative min-h-screen flex flex-col items-center px-5 py-16 md:py-24">
        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium mb-7">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span>Live Aviation Weather Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-fg mb-5 tracking-tight text-balance">
            Aero<span className="text-accent">Sense</span>
          </h1>

          <p className="text-lg md:text-xl text-fg-muted mb-8 leading-relaxed text-pretty max-w-2xl mx-auto">
            Visualize live weather conditions, track nearby aircraft, and assess landing risk with
            AI-powered insights across thousands of stations worldwide.
          </p>

          <button onClick={onEnter} className="btn-primary group px-6 py-3.5 text-base shadow-[0_12px_40px_-12px_rgba(59,130,246,0.7)]">
            <span>Enter Application</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </header>

        {/* Features */}
        <section className="max-w-5xl mx-auto w-full mb-20">
          <div className="flex items-center gap-3 mb-7">
            <h2 className="eyebrow whitespace-nowrap">Core Features</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <article
                key={idx}
                className="card p-5 transition-colors hover:border-border-strong hover:bg-surface-3 animate-fade-in"
                style={{ animationDelay: `${0.15 + idx * 0.06}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-fg">{feature.title}</h3>
                </div>
                <p className="text-sm text-fg-muted leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section className="max-w-5xl mx-auto w-full mb-16">
          <div className="flex items-center gap-3 mb-7">
            <Database size={14} className="text-fg-subtle" />
            <h2 className="eyebrow whitespace-nowrap">Powered By</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {dataSources.map((source, idx) => (
              <div
                key={idx}
                className="card p-4 transition-colors hover:border-border-strong animate-fade-in"
                style={{ animationDelay: `${0.5 + idx * 0.06}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                <h3 className="font-semibold text-fg text-sm mb-1">{source.name}</h3>
                <p className="text-xs text-fg-subtle leading-relaxed">{source.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto w-full pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-fg-subtle text-sm">
            <p>© 2026 AeroSense. Built for aviation enthusiasts.</p>
            <a
              href="https://github.com/sairithik9849/AeroSense"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
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
