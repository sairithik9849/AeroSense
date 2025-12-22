import { Redis } from "@upstash/redis";
import process from 'node:process';

let redis = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  console.warn("⚠️ Redis not configured. Using in-memory cache (not suitable for production serverless).");
}

const memoryCache = new Map();

export const getCache = async (key) => {
  if (redis) {
    return await redis.get(key);
  }
  const item = memoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
};

export const setCache = async (key, data, ttlSeconds) => {
  if (redis) {
    await redis.set(key, data, { ex: ttlSeconds });
  } else {
    memoryCache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }
};
