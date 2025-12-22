import { useRef, useEffect } from 'react';

export default function WindOverlay({ weatherData, timeIndex, width, height, paused = false, zoomLevel = 10, minZoomForAnimation = 8, suspendRendering = false }) {
    const canvasRef = useRef(null);

    // Zoom threshold - disable animation when zoomed out (configurable via props)
    const MIN_ZOOM_FOR_ANIMATION = minZoomForAnimation;

    // Particle System Configuration - optimized for performance
    const PARTICLE_COUNT = 40; // Further reduced for zoom interaction performance
    const PARTICLE_LIFETIME = 60; // Shorter lifetime
    const MAX_TRAIL_LENGTH = 15; // Limit trail length for performance

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Handle Resize
        canvas.width = width;
        canvas.height = height;

        // If paused or temporarily suspended (e.g., during map fly-to), clear and return
        if (paused || suspendRendering) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        // Disable animation when zoomed out too far
        if (zoomLevel < MIN_ZOOM_FOR_ANIMATION) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        // Get wind data for the selected time point
        // For historical view: use the point at timeIndex (WindBorne data)
        // For current/latest view: prefer 'current' field (real-time METAR) if available, otherwise use latest point
        const points = weatherData?.points || [];
        const isValidIndex = timeIndex >= 0 && timeIndex < points.length;
        const isAtLatest = isValidIndex && timeIndex === points.length - 1;
        
        const currentSample = isValidIndex 
            ? (isAtLatest && weatherData?.current 
                ? weatherData.current  // Use real-time METAR data when at latest point
                : points[timeIndex])    // Use historical WindBorne data for historical view
            : null;

        // If no data or invalid index, clear and return
        if (!currentSample) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        // Determine data source for logging
        const dataSource = currentSample.source || (isAtLatest && weatherData?.current ? 'METAR' : 'WindBorne');
        
        // Check if wind data is available for this time point
        // WindBorne API provides wind_x and wind_y directly in their response
        // Many historical points may have null wind values (especially older WindBorne data)
        if (currentSample.wind_x == null || currentSample.wind_y == null) {
            // Clear overlay - no wind data available for this time point
            ctx.clearRect(0, 0, width, height);
            // Log when WindBorne data is missing wind values
            if (dataSource === 'WindBorne' && !isAtLatest) {
                console.debug(`WindBorne data point at index ${timeIndex} has null wind values`);
            }
            return;
        }

        // Log data source for debugging
        if (dataSource === 'WindBorne') {
            console.debug(`Using WindBorne wind data for historical point at index ${timeIndex}`);
        }

        // Parse Wind Vector components (in knots)
        // 
        // Coordinate System:
        // - wind_x: East component (positive = wind blowing TO the east)
        // - wind_y: North component (positive = wind blowing TO the north)
        // 
        // Important: METAR wind direction is where wind is FROM (meteorological convention)
        // Example: Wind FROM north (0°) means wind blowing TO south
        //   - This results in: wind_x = 0, wind_y = negative (southward)
        // 
        // Backend conversion (aviationWeatherService.js):
        //   direction (FROM) → radians = ((direction - 90) * π) / 180
        //   wind_x = speed * cos(radians)
        //   wind_y = speed * sin(radians)
        const wx = currentSample.wind_x;
        const wy = currentSample.wind_y;

        // Verify wind direction calculation (for debugging)
        // Convert components back to direction to verify accuracy
        // const calculatedSpeed = Math.hypot(wx, wy);
        // atan2 gives direction TO (where wind is blowing), not FROM
        // To get FROM direction: add 180° (or reverse the vector)
        // const directionTo = (Math.atan2(wy, wx) * 180 / Math.PI + 360) % 360;
        // const directionFrom = (directionTo + 180) % 360; // Reverse to get FROM direction
        
        // Scale factor: visible speed (adjusts particle movement speed for visualization)
        // Higher values = faster particle movement = stronger wind visualization
        // const speedScale = 2.0;
        
        // Calculate wind speed for dynamic scaling (optional enhancement)
        // const windSpeed = calculatedSpeed;
        // Could adjust speedScale based on windSpeed for better visualization
        // const dynamicSpeedScale = Math.min(3.0, Math.max(1.0, windSpeed / 10));

        // Initialize particles with trail tracking for better flow visualization
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                age: Math.random() * PARTICLE_LIFETIME,
                trail: [] // Limited trail for performance
            });
        }

        let animationId;
        let lastFrameTime = 0;
        const TARGET_FPS = 30; // Limit to 30fps for performance
        const FRAME_INTERVAL = 1000 / TARGET_FPS;

        const render = (currentTime) => {
            // Throttle to target FPS for performance
            if (currentTime - lastFrameTime < FRAME_INTERVAL) {
                animationId = requestAnimationFrame(render);
                return;
            }
            lastFrameTime = currentTime;

            ctx.clearRect(0, 0, width, height);

            // Calculate wind speed for dynamic visualization
            const windSpeed = Math.hypot(wx, wy);
            
            // Dynamic speed scale based on wind speed
            const dynamicSpeedScale = Math.min(2.5, Math.max(0.5, windSpeed / 12));
            
            // Pre-calculate wind color (avoid recalculating per particle)
            let mainColor; //, fadeColor;
            if (windSpeed < 15) {
                mainColor = 'rgba(100, 200, 255, 0.6)';
                // fadeColor = 'rgba(100, 200, 255, 0.1)';
            } else if (windSpeed < 25) {
                mainColor = 'rgba(255, 200, 80, 0.6)';
                // fadeColor = 'rgba(255, 200, 80, 0.1)';
            } else {
                mainColor = 'rgba(255, 100, 100, 0.7)';
                // fadeColor = 'rgba(255, 100, 100, 0.1)';
            }
            
            const baseLineWidth = Math.max(1.5, 2 + (windSpeed / 30) * 1.5);

            // Batch drawing for performance
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            particles.forEach(p => {
                // Move particles
                p.x += wx * dynamicSpeedScale;
                p.y += -wy * dynamicSpeedScale;
                p.age++;

                // Add to trail (less frequently for performance)
                if (p.trail.length === 0 || 
                    Math.hypot(p.x - p.trail[p.trail.length - 1].x, 
                               p.y - p.trail[p.trail.length - 1].y) > 3) {
                    p.trail.push({ x: p.x, y: p.y });
                    if (p.trail.length > MAX_TRAIL_LENGTH) {
                        p.trail.shift();
                    }
                }

                // Reset if OOB or expired
                if (p.age > PARTICLE_LIFETIME || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
                    p.x = Math.random() * width;
                    p.y = Math.random() * height;
                    p.age = 0;
                    p.trail = [];
                }

                // Draw simplified trail as single path for performance
                if (p.trail.length > 1) {
                    const opacity = 0.6 * (1 - p.age / PARTICLE_LIFETIME);
                    
                    // Draw as a single polyline instead of individual segments
                    ctx.strokeStyle = mainColor.replace('0.6)', opacity.toFixed(2) + ')').replace('0.7)', opacity.toFixed(2) + ')');
                    ctx.lineWidth = baseLineWidth;
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    }
                    ctx.stroke();

                    // Draw head dot (simple circle at current position)
                    ctx.fillStyle = mainColor;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, baseLineWidth * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            animationId = requestAnimationFrame(render);
        };

        render(0);

        return () => cancelAnimationFrame(animationId);
    }, [weatherData, timeIndex, width, height, paused, zoomLevel, MIN_ZOOM_FOR_ANIMATION]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-30 opacity-60 mix-blend-screen"
        />
    );
}
