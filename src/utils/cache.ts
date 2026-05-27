import redis, { isRedisEnabled } from '../config/redis.js';

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!isRedisEnabled) return null;
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

export const setCache = async (key: string, value: any, ttl: number = 3600): Promise<void> => {
  if (!isRedisEnabled) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isRedisEnabled) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};
