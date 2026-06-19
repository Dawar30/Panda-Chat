import redisClient, { isRedisReady } from "../../config/redis.js";

// ─── Redis Key Pattern ──────────────────────────────────────────
// unread:{userId}:{conversationId} → integer counter

const UNREAD_PREFIX = "unread:";

/**
 * Build the Redis key for a user's unread count in a conversation.
 */
const buildKey = (userId, conversationId) =>
  `${UNREAD_PREFIX}${userId}:${conversationId}`;

/**
 * Increment the unread message count for a user in a conversation.
 * Called when a new message is sent and the receiver hasn't read it.
 */
export const increment = async (userId, conversationId) => {
  if (!isRedisReady()) return 0;

  try {
    return await redisClient.incr(buildKey(userId, conversationId));
  } catch (error) {
    console.error("unreadService.increment failed:", error.message);
    return 0;
  }
};

/**
 * Get the unread count for a specific user + conversation.
 */
export const getCount = async (userId, conversationId) => {
  if (!isRedisReady()) return 0;

  try {
    const count = await redisClient.get(buildKey(userId, conversationId));
    return parseInt(count, 10) || 0;
  } catch (error) {
    console.error("unreadService.getCount failed:", error.message);
    return 0;
  }
};

/**
 * Get all unread counts for a user across all conversations.
 * Returns a Map: conversationId → count
 *
 * Uses SCAN instead of KEYS for production safety (non-blocking).
 */
export const getAllCounts = async (userId) => {
  if (!isRedisReady()) return {};

  try {
    const pattern = `${UNREAD_PREFIX}${userId}:*`;
    const counts = {};
    let cursor = 0;

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = result.cursor;

      if (result.keys.length > 0) {
        // Batch GET all matched keys
        const values = await redisClient.mGet(result.keys);

        for (let i = 0; i < result.keys.length; i++) {
          // Extract conversationId from key: "unread:{userId}:{conversationId}"
          const conversationId = result.keys[i].split(":").slice(2).join(":");
          counts[conversationId] = parseInt(values[i], 10) || 0;
        }
      }
    } while (cursor !== 0);

    return counts;
  } catch (error) {
    console.error("unreadService.getAllCounts failed:", error.message);
    return {};
  }
};

/**
 * Reset (delete) the unread count when a user reads a conversation.
 */
export const reset = async (userId, conversationId) => {
  if (!isRedisReady()) return;

  try {
    await redisClient.del(buildKey(userId, conversationId));
  } catch (error) {
    console.error("unreadService.reset failed:", error.message);
  }
};

/**
 * Get the total unread count across ALL conversations for a user.
 * Uses SCAN + MGET for efficiency.
 */
export const getTotalUnread = async (userId) => {
  if (!isRedisReady()) return 0;

  try {
    const counts = await getAllCounts(userId);
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  } catch (error) {
    console.error("unreadService.getTotalUnread failed:", error.message);
    return 0;
  }
};
