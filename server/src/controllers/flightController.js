import * as openskyService from '../services/openskyService.js';

export const getFlights = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Lat/Lng required' });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  console.log(`[FlightController] Fetching flights for lat=${latNum}, lng=${lngNum}`);

  try {
    const flights = await openskyService.getFlights(latNum, lngNum);
    res.json(flights);
  } catch (error) {
    // Handle rate limit errors specially
    if (error.type === 'RATE_LIMITED') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds: error.retryAfterSeconds,
        message: error.message
      });
    }
    
    // Return proper HTTP status codes for all errors
    const statusCode = error.statusCode || 500;
    const errorResponse = {
      error: error.message || 'Failed to fetch flights',
      statusCode: statusCode
    };
    
    if (statusCode === 500) {
      console.error('[FlightController] Server error:', error.message);
    }
    
    return res.status(statusCode).json(errorResponse);
  }
};
