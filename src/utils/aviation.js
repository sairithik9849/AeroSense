// src/utils/aviation.js

// Converts vectors (u, v) to Speed (knots) and Direction (degrees)
export const getWindData = (wind_x, wind_y) => {
  if (wind_x === null || wind_y === null) return null;
  
  // 1. Magnitude (Speed) - Input is directly in Knots (per user confirmation)
  const speed = Math.hypot(wind_x, wind_y);

  // 2. Direction (0-360 degrees)
  // Math.atan2 returns radians. We convert to degrees.
  let dir = (Math.atan2(wind_y, wind_x) * 180) / Math.PI;
  dir = (dir + 360) % 360; // Normalize to 0-360

  return { speed, dir };
};

// Decides the risk level based on wind speed
// @deprecated Use calculateLandingSafety() for comprehensive weather assessment
export const getRiskLevel = (speed, options = {}) => {
  const { dataAge = null, windGust = null } = options;
  
  // Adjust thresholds based on data freshness
  // Older data is less reliable, so be more conservative
  let speedThreshold = speed;
  if (dataAge !== null && dataAge > 30) {
    // If data is > 30 min old, reduce threshold by 20% (be more cautious)
    speedThreshold = speed * 1.2;
  }
  
  // Consider wind gusts if available
  const effectiveSpeed = windGust && windGust > speed ? windGust : speedThreshold;
  
  if (effectiveSpeed > 25) return 'DANGER';   // > 25 knots is scary
  if (effectiveSpeed > 15) return 'CAUTION';  // > 15 knots needs attention
  return 'SAFE';                     // < 15 knots is fine
};

/**
 * Calculates landing safety assessment considering multiple factors
 * @param {Object} weatherPoint - Weather data point with wind, visibility, etc.
 * @param {Object} options - Additional options
 * @returns {Object} - Safety assessment with risk level and details
 */
export const calculateLandingSafety = (weatherPoint) => {
  if (!weatherPoint) {
    return {
      risk: 'UNKNOWN',
      confidence: 'low',
      factors: ['No weather data available'],
    };
  }

  const wind = getWindData(weatherPoint.wind_x, weatherPoint.wind_y);
  const dataAge = weatherPoint.dataAge !== undefined ? weatherPoint.dataAge : null;
  const windGust = weatherPoint.wind_gust || null;
  const visibility = weatherPoint.visibility || null;
  
  const factors = [];
  let riskScore = 0; // Lower is better, 0 = safe
  
  // Wind speed factor (most important)
  if (wind && wind.speed !== null) {
    const effectiveSpeed = windGust && windGust > wind.speed ? windGust : wind.speed;
    
    if (effectiveSpeed > 25) {
      riskScore += 3;
      // Show base wind + gust distinction if gusts are higher
      if (windGust && windGust > wind.speed) {
        factors.push(`Base wind: ${wind.speed.toFixed(1)} kt, Gusts: ${windGust.toFixed(1)} kt (HIGH)`);
      } else {
        factors.push(`High wind speed: ${effectiveSpeed.toFixed(1)} kt`);
      }
    } else if (effectiveSpeed > 15) {
      riskScore += 1;
      // Show base wind + gust distinction if gusts are higher
      if (windGust && windGust > wind.speed) {
        factors.push(`Base wind: ${wind.speed.toFixed(1)} kt, Gusts: ${windGust.toFixed(1)} kt`);
      } else {
        factors.push(`Moderate wind speed: ${effectiveSpeed.toFixed(1)} kt`);
      }
    } else {
      factors.push(`Wind speed OK: ${effectiveSpeed.toFixed(1)} kt`);
    }
    
    // Wind gusts add extra risk - only mention if we haven't already covered it above
    if (windGust && windGust > wind.speed + 5) {
      // Skip if we already mentioned gusts in the wind speed factor
      if (!(effectiveSpeed > 15)) {
        riskScore += 1;
        factors.push(`Significant wind gusts: ${windGust.toFixed(1)} kt`);
      }
    }
  } else {
    riskScore += 1;
    factors.push('Wind data unavailable');
  }
  
  // Visibility factor
  if (visibility !== null) {
    if (visibility < 1) {
      riskScore += 2;
      factors.push(`Poor visibility: ${visibility.toFixed(1)} SM`);
    } else if (visibility < 3) {
      riskScore += 1;
      factors.push(`Reduced visibility: ${visibility.toFixed(1)} SM`);
    } else {
      factors.push(`Visibility OK: ${visibility.toFixed(1)} SM`);
    }
  }
  
  // Data freshness factor
  if (dataAge !== null) {
    if (dataAge > 60) {
      riskScore += 2;
      factors.push(`Stale data: ${dataAge} min old`);
    } else if (dataAge > 30) {
      riskScore += 1;
      factors.push(`Data age: ${dataAge} min`);
    } else {
      factors.push(`Recent data: ${dataAge} min old`);
    }
  } else {
    riskScore += 1;
    factors.push('Data age unknown');
  }
  
  // Determine overall risk level
  let risk;
  let confidence;
  
  if (riskScore >= 4) {
    risk = 'DANGER';
    confidence = 'high';
  } else if (riskScore >= 2) {
    risk = 'CAUTION';
    confidence = dataAge !== null && dataAge < 30 ? 'high' : 'medium';
  } else if (riskScore === 1) {
    risk = 'CAUTION';
    confidence = 'low';
  } else {
    risk = 'SAFE';
    confidence = dataAge !== null && dataAge < 30 ? 'high' : 'medium';
  }
  
  return {
    risk,
    confidence,
    factors,
    riskScore,
    windSpeed: wind?.speed || null,
    windGust,
    visibility,
    dataAge,
  };
};

/**
 * Calculates flight-specific risk assessment combining operational status and weather
 * @param {Object} flight - Flight object with altitude, velocity, lat, lng, heading
 * @param {Object} weatherData - Current weather conditions at the location (optional)
 * @returns {Object} - Flight risk assessment with risk level, factors, and details
 */
export const calculateFlightRisk = (flight, weatherData = null) => {
  if (!flight) {
    return {
      risk: 'UNKNOWN',
      confidence: 'low',
      factors: ['No flight data available'],
      flightStatus: 'UNKNOWN',
    };
  }

  const altitudeFt = flight.altitude * 3.28; // Convert meters to feet
  const speedKt = flight.velocity ? flight.velocity * 1.944 : 0; // Convert m/s to knots
  
  const factors = [];
  let operationalRisk = 'SAFE';
  let flightStatus = 'NORMAL';
  
  // Altitude at or below 0 means plane has landed (or bad data)
  if (flight.altitude <= 0) {
    flightStatus = 'LANDED';
    operationalRisk = 'LANDED';
    factors.push('Aircraft on ground');
  } 
  // Very low altitude (< 500ft) is critical
  else if (altitudeFt < 500) {
    flightStatus = 'CRITICAL';
    operationalRisk = 'DANGER';
    factors.push(`Critical altitude: ${altitudeFt.toFixed(0)} ft`);
  }
  // Low altitude (< 1000ft) 
  else if (altitudeFt < 1000) {
    flightStatus = 'LOW';
    
    // High speed at low altitude increases risk
    if (speedKt > 100) {
      operationalRisk = 'CAUTION';
      factors.push(`Low altitude with high speed: ${altitudeFt.toFixed(0)} ft at ${speedKt.toFixed(0)} kt`);
    } else {
      operationalRisk = 'CAUTION';
      factors.push(`Low altitude: ${altitudeFt.toFixed(0)} ft`);
    }
  } else {
    flightStatus = 'NORMAL';
    factors.push(`Normal altitude: ${altitudeFt.toFixed(0)} ft`);
  }
  
  // If weather data is provided, combine operational and weather risk
  let weatherRisk = null;
  let weatherAssessment = null;
  let combinedRisk = operationalRisk;
  let confidence = 'medium';
  
  if (weatherData && operationalRisk !== 'LANDED') {
    weatherAssessment = calculateLandingSafety(weatherData);
    weatherRisk = weatherAssessment.risk;
    confidence = weatherAssessment.confidence;
    
    // Combined risk is the maximum of operational and weather risk
    const riskLevels = { 'SAFE': 0, 'CAUTION': 1, 'DANGER': 2 };
    const opLevel = riskLevels[operationalRisk] || 0;
    const wxLevel = riskLevels[weatherRisk] || 0;
    
    // Take the higher risk level
    if (wxLevel > opLevel) {
      combinedRisk = weatherRisk;
      factors.push(`Weather conditions: ${weatherRisk}`);
    }
    
    // Special case: Low altitude + High winds = Always DANGER
    if (altitudeFt < 1000 && weatherAssessment.windSpeed > 25) {
      combinedRisk = 'DANGER';
      if (!factors.some(f => f.includes('High winds at low altitude'))) {
        factors.push('High winds at low altitude - extreme danger');
      }
    }
    // Low altitude + Moderate winds = At least CAUTION
    else if (altitudeFt < 1000 && weatherAssessment.windSpeed > 15) {
      if (combinedRisk === 'SAFE') {
        combinedRisk = 'CAUTION';
        factors.push('Moderate winds at low altitude');
      }
    }
    
    // Poor visibility during approach increases risk
    if (weatherAssessment.visibility !== null && weatherAssessment.visibility < 1 && altitudeFt < 1000) {
      if (combinedRisk === 'SAFE') {
        combinedRisk = 'CAUTION';
      } else if (combinedRisk === 'CAUTION') {
        combinedRisk = 'DANGER';
      }
      factors.push('Poor visibility during approach');
    }
  }
  
  return {
    risk: combinedRisk,
    operationalRisk,
    weatherRisk,
    confidence,
    factors,
    flightStatus,
    altitude: altitudeFt,
    speed: speedKt,
    weatherAssessment,
  };
};

/**
 * Get user-friendly explanation for risk levels
 * @param {string} riskLevel - SAFE, CAUTION, or DANGER
 * @returns {Object} - Explanation with title, description, and action
 */
export const getRiskExplanation = (riskLevel) => {
  const explanations = {
    'SAFE': {
      title: 'Safe Conditions',
      description: 'Weather and operational conditions are favorable for flight operations.',
      action: 'Normal operations may proceed with standard precautions.',
      color: 'emerald',
    },
    'CAUTION': {
      title: 'Caution Required',
      description: 'Conditions require increased awareness and may challenge less experienced pilots.',
      action: 'Evaluate individual factors carefully. Consider delaying non-essential flights.',
      color: 'yellow',
    },
    'DANGER': {
      title: 'Dangerous Conditions',
      description: 'Conditions pose significant risks to flight operations.',
      action: 'Avoid flight operations unless absolutely necessary and properly equipped.',
      color: 'red',
    },
    'LANDED': {
      title: 'Aircraft on Ground',
      description: 'Aircraft is on the ground or at ground level.',
      action: 'No flight risk assessment applicable.',
      color: 'gray',
    },
    'UNKNOWN': {
      title: 'Unknown Conditions',
      description: 'Insufficient data to make a reliable assessment.',
      action: 'Exercise extreme caution. Obtain current weather information.',
      color: 'gray',
    },
  };
  
  return explanations[riskLevel] || explanations['UNKNOWN'];
};

/**
 * Get user-friendly explanation for confidence levels
 * @param {string} confidence - low, medium, or high
 * @returns {string} - Human-readable explanation
 */
export const getConfidenceExplanation = (confidence) => {
  const explanations = {
    'high': 'Based on recent, complete data',
    'medium': 'Based on aging data or partial information',
    'low': 'Based on limited or stale data - use caution',
  };
  
  return explanations[confidence] || 'Unknown confidence level';
};

/**
 * Calculate the bearing from one point to another
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} - Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;
  
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
};

/**
 * Calculate the distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} - Distance in nautical miles
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 3440.065; // Earth's radius in nautical miles
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Determine if a flight is approaching a station (heading towards it)
 * @param {Object} flight - Flight object with lat, lng, track (heading in degrees)
 * @param {Object} station - Station object with lat, lng
 * @param {Object} options - Optional parameters
 * @returns {Object} - { isApproaching, bearingToStation, angleDifference, distance, eta }
 */
export const isFlightApproaching = (flight, station, options = {}) => {
  const {
    maxAngleDifference = 45, // Max deviation from direct heading (degrees)
    maxDistance = 100, // Max distance to consider (nautical miles)
    minAltitude = 500, // Min altitude in feet (exclude landed planes)
  } = options;
  
  // Validate inputs
  if (!flight || !station || 
      flight.lat == null || flight.lng == null || 
      station.lat == null || station.lng == null) {
    return { isApproaching: false, reason: 'Invalid data' };
  }
  
  // Convert altitude to feet if needed
  const altitudeFt = flight.altitude * 3.28; // meters to feet
  
  // Exclude landed or very low altitude flights
  if (altitudeFt < minAltitude) {
    return { isApproaching: false, reason: 'Too low/landed', altitude: altitudeFt };
  }
  
  // Calculate bearing from flight to station
  const bearingToStation = calculateBearing(
    flight.lat, flight.lng,
    station.lat, station.lng
  );
  
  // Calculate distance to station
  const distance = calculateDistance(
    flight.lat, flight.lng,
    station.lat, station.lng
  );
  
  // If too far, not relevant
  if (distance > maxDistance) {
    return { isApproaching: false, reason: 'Too far', distance };
  }
  
  // Get flight's current heading/track
  const flightTrack = flight.track !== null && flight.track !== undefined 
    ? flight.track 
    : null;
  
  // If no track data, we can't determine if approaching
  if (flightTrack === null) {
    return { isApproaching: false, reason: 'No heading data', distance, bearingToStation };
  }
  
  // Calculate angle difference between flight heading and bearing to station
  let angleDifference = Math.abs(flightTrack - bearingToStation);
  if (angleDifference > 180) {
    angleDifference = 360 - angleDifference;
  }
  
  // Dynamic angle tolerance: stricter when further away
  // Close flights (< 10nm) can have wider tolerance (approach maneuvering)
  // Far flights (> 30nm) need very precise heading
  let effectiveMaxAngle = maxAngleDifference;
  if (distance > 30) {
    effectiveMaxAngle = Math.min(maxAngleDifference, 15); // Very strict for distant flights
  } else if (distance > 15) {
    effectiveMaxAngle = Math.min(maxAngleDifference, 20); // Moderate for mid-range
  }
  // Close flights use the provided maxAngleDifference
  
  // Is the flight heading towards the station?
  const isApproaching = angleDifference <= effectiveMaxAngle;
  
  // Calculate ETA if approaching (rough estimate)
  let eta = null;
  if (isApproaching && flight.velocity) {
    const speedKt = flight.velocity * 1.944; // m/s to knots
    if (speedKt > 0) {
      eta = (distance / speedKt) * 60; // minutes
    }
  }
  
  return {
    isApproaching,
    bearingToStation,
    angleDifference,
    distance,
    eta,
    altitude: altitudeFt,
    reason: isApproaching ? 'Heading towards station' : 'Not heading towards station',
  };
};

/**
 * Filter flights to only those approaching a station
 * @param {Array} flights - Array of flight objects
 * @param {Object} station - Station object with lat, lng
 * @param {Object} options - Filter options (maxAngleDifference, maxDistance, minAltitude)
 * @returns {Array} - Filtered flights with approach data attached
 */
export const filterApproachingFlights = (flights, station, options = {}) => {
  if (!flights || !station) return [];
  
  return flights
    .map(flight => {
      const approachData = isFlightApproaching(flight, station, options);
      return {
        ...flight,
        approachData,
      };
    })
    .filter(flight => flight.approachData.isApproaching)
    .sort((a, b) => {
      // Sort by distance (closest first)
      return (a.approachData.distance || 999) - (b.approachData.distance || 999);
    });
};