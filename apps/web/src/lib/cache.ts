import { Redis } from '@upstash/redis';

// ═══════════════════════════════════════════════════
// REDIS CACHE HELPERS
// Lazy-initialized to avoid crashes when Redis is not configured
// ═══════════════════════════════════════════════════

let _redis: Redis | null = null;
let _redisChecked = false;

function getRedis(): Redis | null {
  if (_redisChecked) return _redis;
  _redisChecked = true;
  try {
    _redis = Redis.fromEnv();
  } catch (err) {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'Redis not configured, caching disabled',
      error: err instanceof Error ? err.message : 'unknown',
    }));
    _redis = null;
  }
  return _redis;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const v = await redis.get<T>(key);
      return v ?? null;
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', action: 'cache.get', key, error: err instanceof Error ? err.message : 'unknown' }));
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number) {
    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', action: 'cache.set', key, error: err instanceof Error ? err.message : 'unknown' }));
    }
  },

  async del(...keys: string[]) {
    const redis = getRedis();
    if (!redis || !keys.length) return;
    try {
      await redis.del(...keys);
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', action: 'cache.del', keys, error: err instanceof Error ? err.message : 'unknown' }));
    }
  },
};

// ═══════════════════════════════════════════════════
// CACHE KEY NAMESPACE
// ═══════════════════════════════════════════════════

export const CacheKeys = {
  featured:      ()              => 'components:featured',
  popular:       ()              => 'components:popular',
  categories:    ()              => 'categories:all',
  component:     (id: string)    => `component:${id}`,
  search:        (q: string)     => `search:${Buffer.from(q).toString('base64').slice(0, 64)}`,
  componentSource: (id: string)  => `component:source:${id}`,
};

// ═══════════════════════════════════════════════════
// CACHE TTL CONSTANTS (seconds)
// ═══════════════════════════════════════════════════

export const CacheTTL = {
  FEATURED:    5 * 60,     // 5 min
  POPULAR:     5 * 60,     // 5 min
  COMPONENT:   60 * 60,    // 60 min
  CATEGORIES:  30 * 60,    // 30 min
  SEARCH:      2 * 60,     // 2 min
  AI_SOURCE:   10 * 60,    // 10 min
};
