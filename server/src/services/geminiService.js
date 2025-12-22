import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCache, setCache } from '../utils/cache.js';
import process from 'node:process';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Analyzes station weather data using Gemini AI
 * @param {Object} stationData - Station information (name, id, location)
 * @param {Array} weatherPoints - All historical weather data points
 * @param {Object} currentData - Current weather data point
 * @returns {Object} - Analysis insights from Gemini
 */
export const analyzeStationData = async (stationData, weatherPoints, currentData) => {
  // Use versioned cache key to invalidate old format
  const cacheKey = `gemini:analysis:${stationData.id}`;
  
  // Check cache first (cache for 1 hour)
  const cached = await getCache(cacheKey);
  if (cached && cached.summary) {
    return cached;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    // Use gemini-2.5-flash (latest model) with JSON response format
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    // Format weather data for analysis
    const dataSummary = {
      station: {
        name: stationData.name || stationData.id,
        id: stationData.id,
        location: stationData.lat && stationData.lng 
          ? { lat: stationData.lat, lng: stationData.lng }
          : null,
      },
      totalDataPoints: weatherPoints.length,
      dateRange: weatherPoints.length > 0 ? {
        start: weatherPoints[0].timestamp,
        end: weatherPoints[weatherPoints.length - 1].timestamp,
      } : null,
      currentConditions: currentData ? {
        temperature: currentData.temperature,
        windSpeed: currentData.wind_x && currentData.wind_y 
          ? Math.hypot(currentData.wind_x, currentData.wind_y).toFixed(1)
          : null,
        windDirection: currentData.wind_direction || null,
        dataAge: currentData.dataAge || null,
      } : null,
      sampleDataPoints: weatherPoints.slice(0, 20).map(pt => ({
        timestamp: pt.timestamp,
        temperature: pt.temperature,
        windSpeed: pt.wind_x && pt.wind_y 
          ? Math.hypot(pt.wind_x, pt.wind_y).toFixed(1)
          : null,
        windX: pt.wind_x,
        windY: pt.wind_y,
        pressure: pt.pressure,
        dewpoint: pt.dewpoint,
      })),
      windDataAvailable: weatherPoints.filter(pt => pt.wind_x !== null && pt.wind_y !== null).length,
    };

    // Create comprehensive prompt for Gemini requesting structured JSON output
    const prompt = `You are an aviation weather analyst. Analyze the following weather station data and provide structured insights.

STATION INFORMATION:
- Name: ${dataSummary.station.name}
- ID: ${dataSummary.station.id}
${dataSummary.station.location ? `- Location: ${dataSummary.station.location.lat}°N, ${dataSummary.station.location.lng}°E` : ''}

DATA OVERVIEW:
- Total data points: ${dataSummary.totalDataPoints}
${dataSummary.dateRange ? `- Date range: ${dataSummary.dateRange.start} to ${dataSummary.dateRange.end}` : ''}
- Wind data available: ${dataSummary.windDataAvailable} out of ${dataSummary.totalDataPoints} points

CURRENT CONDITIONS:
${dataSummary.currentConditions ? `
- Temperature: ${dataSummary.currentConditions.temperature}°F
- Wind Speed: ${dataSummary.currentConditions.windSpeed || 'N/A'} knots
- Wind Direction: ${dataSummary.currentConditions.windDirection || 'N/A'}°
- Data Age: ${dataSummary.currentConditions.dataAge || 'N/A'} minutes
` : 'No current data available'}

SAMPLE DATA POINTS (showing first 20 of ${dataSummary.totalDataPoints}):
${JSON.stringify(dataSummary.sampleDataPoints, null, 2)}

IMPORTANT: Respond with a valid JSON object only. Use this exact structure:

{
  "summary": {
    "windSpeed": <current wind speed in knots as number>,
    "windDirection": <current wind direction in degrees as number or null>,
    "temperature": <current temperature in Fahrenheit as number>,
    "safetyLevel": "<SAFE|CAUTION|DANGER>",
    "keyInsights": [
      "<one-line insight 1>",
      "<one-line insight 2>",
      "<one-line insight 3>",
      "<one-line insight 4>"
    ]
  },
  "details": {
    "windPatterns": "<2-3 paragraph analysis of wind speed and direction trends, patterns, gusts, anomalies>",
    "temperatureTrends": "<2-3 paragraph analysis of temperature variations and significant changes>",
    "safetyAssessment": "<2-3 paragraph assessment of landing safety trends, considering multiple factors (wind, visibility, data age)>",
    "anomalies": "<2-3 paragraph description of unusual weather patterns, sudden changes, or concerning conditions>",
    "recommendations": "<2-3 paragraph actionable recommendations for pilots, including best landing times, conditions to watch, and safety considerations>"
  }
}

Risk Assessment Criteria (Unified Aviation Standards):
- Wind Speed: <15kt = SAFE, 15-25kt = CAUTION, >25kt = DANGER
- Wind Gusts: Gusts >5kt above base wind increase risk
- Visibility: ≥3 SM = OK, 1-3 SM = REDUCED, <1 SM = POOR (increases risk)
- Data Age: <30 min = RECENT, 30-60 min = AGING, >60 min = STALE (reduces confidence)
- Combined Risk Score: Sum of individual factors determines final safety level

Determine safetyLevel by considering wind speed, gusts, visibility, and data age.
SAFE (Score 0): Ideal conditions, <15kt wind, good visibility, fresh data
CAUTION (Score 1-3): Some concerning factors, 15-25kt wind OR reduced visibility OR aging data
DANGER (Score ≥4): Multiple risk factors, >25kt wind OR poor visibility OR stale data with moderate winds

Provide 3-4 concise key insights (one sentence each) that pilots should know immediately.
Be thorough but concise in detailed sections. Focus on actionable insights for aviation safety.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // With responseMimeType: 'application/json', response.text() returns JSON string
    // IMPORTANT: response.text() can only be called once, so we store it immediately
    let responseText = '';
    try {
      // Store response text immediately - can only be called once
      responseText = response.text();
    } catch (e) {
      console.warn('Failed to extract response text from Gemini:', e.message);
      responseText = '';
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
      
      // Validate structure
      if (!parsedData.summary || !parsedData.details) {
        throw new Error('Invalid JSON structure: missing summary or details');
      }
    } catch {
      
      // Fallback: create structured format from available data with actual content
      const currentWindSpeed = dataSummary.currentConditions?.windSpeed ? parseFloat(dataSummary.currentConditions.windSpeed) : null;
      const currentWindDir = dataSummary.currentConditions?.windDirection || null;
      const currentTemp = dataSummary.currentConditions?.temperature || null;
      
      parsedData = {
        summary: {
          windSpeed: currentWindSpeed,
          windDirection: currentWindDir,
          temperature: currentTemp,
          safetyLevel: currentWindSpeed 
            ? (currentWindSpeed < 15 ? 'SAFE' 
              : currentWindSpeed <= 25 ? 'CAUTION' 
              : 'DANGER')
            : 'SAFE',
          keyInsights: [
            currentWindSpeed ? `Current wind: ${currentWindSpeed.toFixed(1)} knots${currentWindDir ? ` from ${currentWindDir}°` : ''}` : 'Wind data available',
            currentTemp ? `Temperature: ${currentTemp.toFixed(1)}°F` : 'Temperature data available',
            `Analyzed ${dataSummary.totalDataPoints} data points`,
            'Review detailed sections for comprehensive analysis'
          ]
        },
        details: {
          windPatterns: responseText || 'Wind pattern analysis based on historical data. Review trends and patterns in the data points provided.',
          temperatureTrends: responseText || 'Temperature trend analysis based on historical data. Monitor for significant variations.',
          safetyAssessment: responseText || `Landing safety assessment: Current conditions indicate ${currentWindSpeed ? (currentWindSpeed < 15 ? 'SAFE' : currentWindSpeed <= 25 ? 'CAUTION' : 'DANGER') : 'moderate'} conditions for landing.`,
          anomalies: responseText || 'Review historical data for unusual weather patterns or sudden changes.',
          recommendations: responseText || 'Recommendations: Monitor current conditions and review historical trends before landing.'
        }
      };
    }

    // Structure the analysis response
    const analysis = {
      stationId: stationData.id,
      stationName: stationData.name || stationData.id,
      timestamp: new Date().toISOString(),
      summary: {
        windSpeed: parsedData.summary?.windSpeed ?? (dataSummary.currentConditions?.windSpeed ? parseFloat(dataSummary.currentConditions.windSpeed) : null),
        windDirection: parsedData.summary?.windDirection ?? dataSummary.currentConditions?.windDirection ?? null,
        temperature: parsedData.summary?.temperature ?? dataSummary.currentConditions?.temperature ?? null,
        safetyLevel: parsedData.summary?.safetyLevel || 'SAFE',
        keyInsights: parsedData.summary?.keyInsights || []
      },
      details: {
        windPatterns: parsedData.details?.windPatterns || '',
        temperatureTrends: parsedData.details?.temperatureTrends || '',
        safetyAssessment: parsedData.details?.safetyAssessment || '',
        anomalies: parsedData.details?.anomalies || '',
        recommendations: parsedData.details?.recommendations || ''
      },
      dataPointsAnalyzed: dataSummary.totalDataPoints,
      dateRange: dataSummary.dateRange,
    };

    // Cache for 1 hour
    await setCache(cacheKey, analysis, 3600);

    return analysis;
  } catch (error) {
    console.error('Gemini analysis error:', error.message);
    throw new Error(`Failed to analyze station data: ${error.message}`);
  }
};

