import redisConnection from '../../../config/redis.js';
import logger from '../../../config/logger.js';

class ResponseCache {
  constructor({ prefix = 'cricbuzz:public-cache:' } = {}) {
    this.store = new Map();
    this.prefix = prefix;
  }

  buildKey(req) {
    return `${this.prefix}${req.originalUrl}`;
  }

  getMemory(key) {
    const cached = this.store.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    if (cached) this.store.delete(key);
    return null;
  }

  setMemory(key, body, statusCode, ttlSeconds) {
    this.store.set(key, {
      body,
      statusCode,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getRedis(key) {
    const client = await redisConnection.getClient();
    if (!client) return null;

    const raw = await client.get(key);
    if (!raw) return null;

    return JSON.parse(raw);
  }

  async setRedis(key, body, statusCode, ttlSeconds) {
    const client = await redisConnection.getClient();
    if (!client) return false;

    await client.set(
      key,
      JSON.stringify({ body, statusCode }),
      { EX: ttlSeconds }
    );

    return true;
  }

  async get(key) {
    try {
      const redisCached = await this.getRedis(key);
      if (redisCached) return redisCached;
    } catch (error) {
      logger.warn(`Redis cache read failed for ${key}`);
    }

    return this.getMemory(key);
  }

  async set(key, body, statusCode, ttlSeconds) {
    this.setMemory(key, body, statusCode, ttlSeconds);

    try {
      await this.setRedis(key, body, statusCode, ttlSeconds);
    } catch (error) {
      logger.warn(`Redis cache write failed for ${key}`);
    }
  }

  middleware(ttlSeconds, options = {}) {
    return async (req, res, next) => {
      if (req.method !== 'GET') return next();
      if (options.shouldBypass?.(req)) return next();

      const key = this.buildKey(req);
      const cached = await this.get(key);

      if (cached) {
        return res.status(cached.statusCode).json(cached.body);
      }

      const originalJson = res.json.bind(res);

      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          void this.set(key, body, res.statusCode, ttlSeconds);
        }

        return originalJson(body);
      };

      return next();
    };
  }

  async clear() {
    this.store.clear();

    try {
      const client = await redisConnection.getClient();
      if (!client) return;

      const keys = [];
      for await (const key of client.scanIterator({ MATCH: `${this.prefix}*`, COUNT: 100 })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.warn('Redis cache clear failed');
    }
  }
}

const responseCache = new ResponseCache();

const responseCacheMiddleware = responseCache.middleware.bind(responseCache);

export { ResponseCache, responseCache };
export default responseCacheMiddleware;
