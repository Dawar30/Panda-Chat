import redisClient, { isRedisReady } from "../../config/redis.js";

// ─── Redis Key Patterns ─────────────────────────────────────────
// presence:{userId}    → Hash { socketId, serverId, status, lastHeartbeat }  TTL 60s
// presence:online      → Sorted Set (score = timestamp)
// lastseen:{userId}    → String (ISO timestamp)

const PRESENCE_KEY_PREFIX = "presence:";
const ONLINE_SET_KEY = "presence:online";
const LAST_SEEN_PREFIX = "lastseen:";
const PRESENCE_TTL = 60;         // seconds — hash expires if no heartbeat
const STALE_THRESHOLD = 90_000;  // ms — entries older than this are stale

/**
 * Generate a unique server ID for this process instance.
 * Used to identify which server a user is connected to.
 */
const SERVER_ID = `server:${process.pid}:${Date.now()}`;

// ─── Core Presence Operations ───────────────────────────────────

/**
 * Mark a user as online with full presence metadata.
 */
export const setOnline = async (userId, socketId) => {
  if (!isRedisReady()) return;

  const now = Date.now();
  const userKey = `${PRESENCE_KEY_PREFIX}${userId}`;

  try {
    await Promise.all([
      // Store presence hash with TTL
      redisClient.hSet(userKey, {
        socketId,
        serverId: SERVER_ID,
        status: "online",
        lastHeartbeat: now.toString(),
      }),
      redisClient.expire(userKey, PRESENCE_TTL),

      // Add to online sorted set (score = timestamp for stale detection)
      redisClient.zAdd(ONLINE_SET_KEY, { score: now, value: userId }),
    ]);
  } catch (error) {
    console.error("presenceService.setOnline failed:", error.message);
  }
};

/**
 * Mark a user as offline — remove all presence data.
 */
export const setOffline = async (userId) => {
  if (!isRedisReady()) return;

  const userKey = `${PRESENCE_KEY_PREFIX}${userId}`;

  try {
    await Promise.all([
      redisClient.del(userKey),
      redisClient.zRem(ONLINE_SET_KEY, userId),
    ]);

    // Update last seen timestamp
    await updateLastSeen(userId);
  } catch (error) {
    console.error("presenceService.setOffline failed:", error.message);
  }
};

/**
 * Refresh heartbeat — extend TTL and update sorted set score.
 * Called every 30s from each connected socket.
 */
export const heartbeat = async (userId) => {
  if (!isRedisReady()) return;

  const now = Date.now();
  const userKey = `${PRESENCE_KEY_PREFIX}${userId}`;

  try {
    const exists = await redisClient.exists(userKey);
    if (!exists) return;

    await Promise.all([
      redisClient.hSet(userKey, "lastHeartbeat", now.toString()),
      redisClient.expire(userKey, PRESENCE_TTL),
      redisClient.zAdd(ONLINE_SET_KEY, { score: now, value: userId }),
    ]);
  } catch (error) {
    console.error("presenceService.heartbeat failed:", error.message);
  }
};

/**
 * Change user status (online, away, busy).
 */
export const setStatus = async (userId, status) => {
  if (!isRedisReady()) return;

  const userKey = `${PRESENCE_KEY_PREFIX}${userId}`;

  try {
    const exists = await redisClient.exists(userKey);
    if (!exists) return false;

    await redisClient.hSet(userKey, "status", status);
    return true;
  } catch (error) {
    console.error("presenceService.setStatus failed:", error.message);
    return false;
  }
};

/**
 * Check if a specific user is online.
 */
export const isOnline = async (userId) => {
  if (!isRedisReady()) return false;

  try {
    return await redisClient.exists(`${PRESENCE_KEY_PREFIX}${userId}`) === 1;
  } catch (error) {
    console.error("presenceService.isOnline failed:", error.message);
    return false;
  }
};

/**
 * Get user presence details (status, socketId, serverId).
 */
export const getPresence = async (userId) => {
  if (!isRedisReady()) return null;

  try {
    const data = await redisClient.hGetAll(`${PRESENCE_KEY_PREFIX}${userId}`);
    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error("presenceService.getPresence failed:", error.message);
    return null;
  }
};

/**
 * Get all online user IDs from the sorted set.
 */
export const getOnlineUsers = async () => {
  if (!isRedisReady()) return [];

  try {
    return await redisClient.zRange(ONLINE_SET_KEY, 0, -1);
  } catch (error) {
    console.error("presenceService.getOnlineUsers failed:", error.message);
    return [];
  }
};

/**
 * Get the count of online users — O(1) via ZCARD.
 */
export const getOnlineCount = async () => {
  if (!isRedisReady()) return 0;

  try {
    return await redisClient.zCard(ONLINE_SET_KEY);
  } catch (error) {
    console.error("presenceService.getOnlineCount failed:", error.message);
    return 0;
  }
};

/**
 * Store the last-seen timestamp for a user going offline.
 */
export const updateLastSeen = async (userId) => {
  if (!isRedisReady()) return;

  try {
    await redisClient.set(
      `${LAST_SEEN_PREFIX}${userId}`,
      new Date().toISOString()
    );
  } catch (error) {
    console.error("presenceService.updateLastSeen failed:", error.message);
  }
};

/**
 * Retrieve the last-seen timestamp for a user.
 */
export const getLastSeen = async (userId) => {
  if (!isRedisReady()) return null;

  try {
    return await redisClient.get(`${LAST_SEEN_PREFIX}${userId}`);
  } catch (error) {
    console.error("presenceService.getLastSeen failed:", error.message);
    return null;
  }
};

/**
 * Clean up stale users whose heartbeat is older than STALE_THRESHOLD.
 * Should be called periodically (e.g., every 60s).
 */
export const cleanupStaleUsers = async () => {
  if (!isRedisReady()) return 0;

  try {
    const cutoff = Date.now() - STALE_THRESHOLD;
    // Remove all entries in the sorted set with score < cutoff
    const removed = await redisClient.zRemRangeByScore(ONLINE_SET_KEY, 0, cutoff);
    if (removed > 0) {
      console.log(`Cleaned up ${removed} stale presence entries`);
    }
    return removed;
  } catch (error) {
    console.error("presenceService.cleanupStaleUsers failed:", error.message);
    return 0;
  }
};

/**
 * Start a heartbeat interval for a socket connection.
 * Returns the interval ID for cleanup on disconnect.
 */
export const startHeartbeat = (userId) => {
  return setInterval(() => {
    heartbeat(userId);
  }, 30_000); // every 30 seconds
};

/**
 * Start periodic stale user cleanup.
 * Returns the interval ID.
 */
export const startCleanupInterval = () => {
  return setInterval(() => {
    cleanupStaleUsers();
  }, 60_000); // every 60 seconds
};
