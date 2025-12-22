# AeroSense

Real-time aviation weather and flight tracking. See live conditions at any airport, browse historical wind data, and check nearby aircraft — all in one interactive map.

## What It Does

- **Live Weather**: Real-time METAR data (wind, temperature, pressure) for any airport
- **Time Travel**: Slide through historical wind snapshots to see weather patterns
- **Nearby Flights**: See aircraft in your area with landing risk assessment
- **AI Analysis**: Smart insights about weather trends using Google Gemini
- **Interactive Map**: Clustered globe view with smooth zoom and exploration
- **Risk Assessment**: Quick safety ratings (red/yellow/green) based on wind & gusts


## Tech Stack

**Frontend**
- React 19 + Vite (fast dev server)
- Tailwind CSS (styling)
- Mapbox GL (interactive globe)
- Lucide Icons (UI icons)

**Backend**
- Node.js + Express (lightweight API)
- Routes for weather, flights, stations, and AI analysis

**Data APIs**
- **METAR**: Real-time airport weather broadcasts
- **WindBorne**: Historical wind snapshots and station grid
- **OpenSky**: Live aircraft positions and flight data
- **Google Gemini**: AI-powered analysis and insights


## How It Works

1. **Pick a Station**: Click any airport on the globe or search by name/code
2. **View Live Weather**: See real-time conditions from METAR data
3. **Time Travel**: Use the slider to explore past wind conditions (hourly snapshots)
4. **Check Aircraft**: See planes nearby with landing risk estimates
5. **Get Insights**: Optional AI analysis of weather patterns and safety

## Features

- **No Page Reloads**: Single-page app with smooth interactions
- **Compare View**: Side-by-side comparison of two time snapshots
- **Rate Limit Handling**: Graceful fallback when APIs are rate-limited
- **Offline-Ready**: Caching reduces external API calls
- **Responsive Design**: Works on desktop and tablet

## Limits & Notes

- OpenSky API has strict rate limits for free users; app shows retry windows
- METAR coverage varies by airport; falls back to WindBorne historical data
- Wind overlay visualizes conditions at selected timestamp
- Aircraft shown within 50 nm radius and below 16,400 ft altitude