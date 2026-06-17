import React, { useState, useEffect } from 'react';
import {
  Wind,
  Plane,
  Globe,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Github,
  Navigation,
} from 'lucide-react';

export default function Landing({ onEnter }) {
  const [scrolled, setScrolled] = useState(false);

  const features = [
    {
      icon: <Globe size={22} />,
      title: 'Interactive Map',
      description: 'Explore thousands of weather stations on a clustered, zoomable globe.',
    },
    {
      icon: <Wind size={22} />,
      title: 'Live Weather',
      description: 'Real-time wind, temperature, and pressure straight from airport broadcasts.',
    },
    {
      icon: <Clock size={22} />,
      title: 'Time Travel',
      description: 'Scrub through historical wind snapshots across the last 24 hours.',
    },
    {
      icon: <Plane size={22} />,
      title: 'Nearby Flights',
      description: 'Track aircraft in range with live, condition-aware landing-risk scoring.',
    },
    {
      icon: <Sparkles size={22} />,
      title: 'AI Analysis',
      description: 'Smart weather insights and safety guidance powered by Gemini.',
    },
    {
      icon: <AlertTriangle size={22} />,
      title: 'Risk Assessment',
      description: 'Clear safe / caution / danger ratings derived from live conditions.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Weather Stations' },
    { value: '24h', label: 'Historical Replay' },
    { value: 'Live', label: 'Flight Tracking' },
    { value: 'AI', label: 'Risk Insights' },
  ];

  const dataSources = [
    { name: 'METAR', description: 'Live airport weather broadcasts' },
    { name: 'WindBorne', description: 'Historical wind data & snapshots' },
    { name: 'OpenSky Network', description: 'Real-time aircraft tracking' },
    { name: 'Google Gemini', description: 'AI-powered weather insights' },
  ];

  const handleScroll = (e) => {
    setScrolled(e.currentTarget.scrollTop > 24);
  };

  // Respect reduced motion is handled globally; just mount animation here.
  useEffect(() => {
    const t = setTimeout(() => {}, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onScroll={handleScroll}
      className="fixed inset-0 z-50 bg-background overflow-y-auto overflow-x-hidden animate-fade-in"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Floating glass nav */}
      {/* ---------------------------------------------------------------- */}
      <nav
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.9)]">
              <Navigation size={17} className="-rotate-45" />
            </div>
            <span className="text-lg font-bold tracking-tight text-fg">
              Aero<span className="text-accent">Sense</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/sairithik9849/AeroSense"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              aria-label="View AeroSense on GitHub"
            >
              <Github size={17} />
            </a>
            <button onClick={onEnter} className="btn-primary">
              <span>Launch App</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------------------- */}
      {/* Hero */}
      {/* ---------------------------------------------------------------- */}
      <header className="relative min-h-[100svh] flex flex-col">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/hero-atmosphere.png"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center"
          />
          {/* Readability gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/30 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative flex-1 flex items-center">
          <div className="max-w-6xl mx-auto w-full px-5 pt-28 pb-10">
            <div className="max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium mb-7 animate-fade-in"
                style={{ opacity: 0, animationFillMode: 'forwards' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span>Live Aviation Weather Intelligence</span>
              </div>

              <h1
                className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-fg tracking-tight text-balance leading-[1.02] animate-fade-in"
                style={{ animationDelay: '0.08s', opacity: 0, animationFillMode: 'forwards' }}
              >
                See the sky
                <br />
                <span className="text-accent">before you fly.</span>
              </h1>

              <p
                className="text-lg md:text-xl text-fg-muted mt-6 leading-relaxed text-pretty max-w-xl animate-fade-in"
                style={{ animationDelay: '0.16s', opacity: 0, animationFillMode: 'forwards' }}
              >
                Visualize live weather, track nearby aircraft, and assess landing risk with
                AI-powered insights across thousands of stations worldwide.
              </p>

              <div
                className="flex flex-wrap items-center gap-3 mt-9 animate-fade-in"
                style={{ animationDelay: '0.24s', opacity: 0, animationFillMode: 'forwards' }}
              >
                <button
                  onClick={onEnter}
                  className="btn-primary group px-6 py-3.5 text-base shadow-[0_16px_48px_-16px_rgba(59,130,246,0.8)]"
                >
                  <span>Enter Application</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href="https://github.com/sairithik9849/AeroSense"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3.5 text-base"
                >
                  <Github size={18} />
                  <span>View Source</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip pinned to bottom of hero */}
        <div className="relative">
          <div className="max-w-6xl mx-auto w-full px-5 pb-10">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border panel animate-fade-in"
              style={{ animationDelay: '0.32s', opacity: 0, animationFillMode: 'forwards' }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="bg-surface/90 px-5 py-5 text-center sm:text-left">
                  <div className="font-mono text-2xl md:text-3xl font-bold text-fg">{stat.value}</div>
                  <div className="text-xs text-fg-subtle mt-1 uppercase tracking-[0.08em] font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Oversized wordmark divider */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative overflow-hidden border-y border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-5 py-8 flex items-center justify-center">
          <span className="select-none whitespace-nowrap text-[18vw] md:text-[12vw] font-extrabold leading-none tracking-tighter text-fg/[0.04]">
            AEROSENSE
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Features */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto w-full px-5 py-20 md:py-28">
        <div className="max-w-2xl mb-12">
          <h2 className="eyebrow mb-3">Core Features</h2>
          <p className="text-3xl md:text-4xl font-bold text-fg tracking-tight text-balance">
            Everything you need to read the weather like a pilot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, idx) => (
            <article
              key={idx}
              className="group card p-6 transition-all duration-200 hover:border-accent/40 hover:bg-surface-3 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${0.05 + idx * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20 mb-4 transition-colors group-hover:bg-accent group-hover:text-white">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-fg text-lg mb-1.5">{feature.title}</h3>
              <p className="text-sm text-fg-muted leading-relaxed">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Data sources */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border bg-surface/30">
        <div className="max-w-6xl mx-auto w-full px-5 py-20 md:py-24">
          <div className="grid md:grid-cols-[1fr_1.6fr] gap-10 md:gap-16 items-start">
            <div>
              <h2 className="eyebrow mb-3">Powered By</h2>
              <p className="text-2xl md:text-3xl font-bold text-fg tracking-tight text-balance">
                Trusted aviation &amp; weather data, unified.
              </p>
              <p className="text-fg-muted mt-4 leading-relaxed">
                AeroSense fuses live broadcasts, historical wind models, and flight telemetry into a
                single real-time picture.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dataSources.map((source, idx) => (
                <div
                  key={idx}
                  className="card p-5 transition-colors hover:border-border-strong animate-fade-in"
                  style={{ animationDelay: `${0.05 + idx * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
                >
                  <h3 className="font-mono font-semibold text-fg mb-1.5">{source.name}</h3>
                  <p className="text-sm text-fg-subtle leading-relaxed">{source.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_120%_at_50%_100%,rgba(59,130,246,0.18),transparent_70%)]"
        />
        <div className="relative max-w-3xl mx-auto w-full px-5 py-24 md:py-28 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-fg tracking-tight text-balance">
            Ready to take off?
          </h2>
          <p className="text-fg-muted mt-4 text-lg leading-relaxed max-w-xl mx-auto">
            Jump into the live map and start exploring conditions anywhere on the planet.
          </p>
          <button
            onClick={onEnter}
            className="btn-primary group mt-8 px-7 py-4 text-base shadow-[0_16px_48px_-16px_rgba(59,130,246,0.8)]"
          >
            <span>Enter Application</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto w-full px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-fg-subtle text-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 border border-border text-accent">
              <Navigation size={14} className="-rotate-45" />
            </div>
            <p>© 2026 AeroSense. Built for aviation enthusiasts.</p>
          </div>
          <a
            href="https://github.com/sairithik9849/AeroSense"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-fg-muted hover:text-fg transition-colors"
          >
            <Github size={16} />
            <span>View on GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
