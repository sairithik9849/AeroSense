import * as windborneService from '../services/windborneService.js';

export const getAllStations = async (req, res, next) => {
  try {
    console.log('Received request for all stations');
    const stations = await windborneService.getStations();
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.json(stations);
  } catch (error) {
    next(error);
  }
};
