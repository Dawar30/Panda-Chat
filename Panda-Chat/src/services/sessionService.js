import crypto from "crypto";
import redisClient, { isRedisReady } from "../../config/redis.js";

// ─── Redis Key Patterns ─────────────────────────────────────────
// blacklist:{tokenHash}   → "1"  (TTL = remaining JWT lifetime)
// session:{userId}        → Hash { token, ip, userAgent, loginAt }

const BLACKLIST_PREFIX = "blacklist:";
const SESSION_PREFIX = "session:";

/**
 * Hash a JWT token to create a short, fixed-length key.
 * We don't store the full token in Redis — just a SHA-256 hash.
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// ─── Token Blacklist ────────────────────────────────────────────

/**
 * Add a JWT token to the blacklist.
 * The TTL should match the remaining lifetime of the token
 * so the blacklist entry auto-expires when the token would have expired anyway.
 *
 * @param {string} token - The JWT token to blacklist
 * @param {number} ttlSeconds - Remaining lifetime of the token in seconds
 */
export const blacklistToken = async (token, ttlSeconds) => {
  if (!isRedisReady()) return;

  try {
    const key = `${BLACKLIST_PREFIX}${hashToken(token)}`;
    await redisClient.setEx(key, Math.max(ttlSeconds, 1), "1");
  } catch (error) {
    console.error("sessionService.blacklistToken failed:", error.message);
  }
};

/**
 * Check if a JWT token has been blacklisted.
 *
 * @param {string} token - The JWT token to check
 * @returns {boolean} true if blacklisted
 */
export const isBlacklisted = async (token) => {
  if (!isRedisReady()) return false; // Fail open if Redis is down

  try {
    const key = `${BLACKLIST_PREFIX}${hashToken(token)}`;
    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    console.error("sessionService.isBlacklisted failed:", error.message);
    return false; // Fail open — don't lock users out if Redis has issues
  }
};

// ─── Session Storage ────────────────────────────────────────────

/**
 * Store session data for a user.
 * Useful for tracking active sessions, device info, etc.
 *
 * @param {string} userId
 * @param {Object} sessionData - { token, ip, userAgent, ... }
 * @param {number} ttlSeconds - Session TTL (default: 4 hours matching JWT)
 */
export const storeSession = async (userId, sessionData, ttlSeconds = 14_400) => {
  if (!isRedisReady()) return;

  try {
    const key = `${SESSION_PREFIX}${userId}`;
    const data = {
      ...sessionData,
      loginAt: new Date().toISOString(),
    };

    // Store as hash fields
    await redisClient.hSet(key, Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ));
    await redisClient.expire(key, ttlSeconds);
  } catch (error) {
    console.error("sessionService.storeSession failed:", error.message);
  }
};

/**
 * Retrieve session data for a user.
 */
export const getSession = async (userId) => {
  if (!isRedisReady()) return null;

  try {
    const key = `${SESSION_PREFIX}${userId}`;
    const data = await redisClient.hGetAll(key);
    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error("sessionService.getSession failed:", error.message);
    return null;
  }
};

/**
 * Delete session data for a user.
 */
export const deleteSession = async (userId) => {
  if (!isRedisReady()) return;

  try {
    await redisClient.del(`${SESSION_PREFIX}${userId}`);
  } catch (error) {
    console.error("sessionService.deleteSession failed:", error.message);
  }
};
