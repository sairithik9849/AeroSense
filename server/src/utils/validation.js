import { z } from 'zod';

export const StationSchema = z.object({
  station_id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().nullable().optional(),
  station_name: z.string().nullable().optional(),
  station_network: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
});

export const WeatherPointSchema = z.object({
  timestamp: z.string(),
  temperature: z.number().nullable(),
  wind_x: z.number().nullable(),
  wind_y: z.number().nullable(),
  dewpoint: z.number().nullable(),
  pressure: z.number().nullable(),
  precip: z.number().nullable(),
  // Optional METAR-specific fields
  wind_gust: z.number().nullable().optional(),
  wind_direction: z.number().nullable().optional(),
  visibility: z.number().nullable().optional(),
  source: z.enum(['METAR', 'WindBorne', 'hybrid']).optional(),
});

export const WeatherResponseSchema = z.object({
  points: z.array(WeatherPointSchema),
  // Optional metadata fields
  source: z.enum(['METAR', 'WindBorne', 'hybrid']).optional(),
  dataAge: z.number().optional(), // Age in minutes
  isRealTime: z.boolean().optional(),
  station: z.string().optional(),
});

export const FlightSchema = z.tuple([
  z.string(), // icao24
  z.string().nullable(), // callsign
  z.string(), // origin_country
  z.number().nullable(), // time_position
  z.number(), // last_contact
  z.number().nullable(), // longitude
  z.number().nullable(), // latitude
  z.number().nullable(), // baro_altitude
  z.boolean(), // on_ground
  z.number().nullable(), // velocity
  z.number().nullable(), // true_track
  z.number().nullable(), // vertical_rate
  z.array(z.number()).nullable(), // sensors
  z.number().nullable(), // geo_altitude
  z.string().nullable(), // squawk
  z.boolean(), // spi
  z.number(), // position_source
]);

export const OpenSkyResponseSchema = z.object({
  time: z.number(),
  states: z.array(FlightSchema).nullable(),
});
