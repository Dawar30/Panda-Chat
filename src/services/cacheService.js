import redisClient, { isRedisReady } from "../../config/redis.js";

// ─── Default TTLs (seconds) ─────────────────────────────────────
export const TTL = {
  SHORT: 60,       // 1 minute  — volatile data (typing, temp states)
  MEDIUM: 120,     // 2 minutes — list queries (all users, all groups)
  LONG: 300,       // 5 minutes — single entity lookups
  EXTENDED: 600,   // 10 minutes — rarely changing data
};

// ─── Core Cache Operations ──────────────────────────────────────

/**
 * Get a cached value by key.
 * Returns null if not found or Redis is down.
 */
export const get = async (key) => {
  if (!isRedisReady()) return null;

  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`cacheService.get(${key}) failed:`, error.message);
    return null;
  }
};

/**
 * Set a cached value with TTL.
 */
export const set = async (key, value, ttlSeconds = TTL.MEDIUM) => {
  if (!isRedisReady()) return;

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`cacheService.set(${key}) failed:`, error.message);
  }
};

/**
 * Delete a specific cache key.
 */
export const del = async (key) => {
  if (!isRedisReady()) return;

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`cacheService.del(${key}) failed:`, error.message);
  }
};

/**
 * Cache-aside pattern: return cached data or call fetchFn, cache the result.
 *
 * @param {string} key - Redis key
 * @param {number} ttlSeconds - TTL in seconds
 * @param {Function} fetchFn - Async function that returns fresh data
 * @returns {Object} { data, source: "cache" | "db" }
 */
export const getOrSet = async (key, ttlSeconds, fetchFn) => {
  // Try cache first
  const cached = await get(key);
  if (cached !== null) {
    return { data: cached, source: "cache" };
  }

  // Cache miss — fetch from source
  const data = await fetchFn();

  // Write to cache (fire-and-forget)
  set(key, data, ttlSeconds).catch((error) => {
    console.error(`cacheService.getOrSet write(${key}) failed:`, error.message);
  });

  return { data, source: "db" };
};

/**
 * Invalidate all keys matching a pattern using SCAN.
 * Uses SCAN (not KEYS) to avoid blocking Redis at scale.
 *
 * @param {string} pattern - Redis glob pattern (e.g., "cache:user:*")
 */
export const invalidate = async (pattern) => {
  if (!isRedisReady()) return 0;

  try {
    let cursor = 0;
    let totalDeleted = 0;

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = result.cursor;

      if (result.keys.length > 0) {
        await redisClient.del(result.keys);
        totalDeleted += result.keys.length;
      }
    } while (cursor !== 0);

    return totalDeleted;
  } catch (error) {
    console.error(`cacheService.invalidate(${pattern}) failed:`, error.message);
    return 0;
  }
};

/**
 * Invalidate all keys that start with a given prefix.
 * Convenience wrapper around invalidate().
 */
export const invalidatePrefix = async (prefix) => {
  return invalidate(`${prefix}*`);
};

// ─── Pre-defined Cache Key Builders ─────────────────────────────

export const KEYS = {
  USER: (userId) => `cache:user:${userId}`,
  USERS_ALL: "cache:users:all",
  CONVERSATION: (id) => `cache:conversation:${id}`,
  CONVERSATIONS_ALL: "cache:conversations:all",
  CONVERSATIONS_USER: (userId) => `cache:conversations:user:${userId}`,
  GROUP: (id) => `cache:group:${id}`,
  GROUPS_ALL: "cache:groups:all",
  GROUP_MEMBERS: (groupId) => `cache:members:group:${groupId}`,
  MESSAGES_CONVERSATION: (conversationId) => `messages:conversation:${conversationId}`,
  MESSAGES_GROUP: (groupId) => `messages:group:${groupId}`,
  USER_GROUPS: (userId) => `cache:groups:user:${userId}`,
  MESSAGES_ALL: "messages:all",
};
