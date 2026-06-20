import redisClient, { isRedisReady } from "../../config/redis.js";

// ─── Sliding Window Rate Limiter ────────────────────────────────
// Uses Redis Sorted Sets for precise sliding-window counting.
//
// Key pattern: ratelimit:{category}:{identifier}
// Each request adds a member with score = current timestamp.
// We remove entries outside the window, then count remaining.

const RATE_LIMIT_PREFIX = "ratelimit:";

/**
 * Check if a request should be rate-limited.
 *
 * @param {string} category - Rate limit category (e.g., "login", "api", "message_send")
 * @param {string} identifier - Unique identifier (e.g., IP, userId, email)
 * @param {number} windowSeconds - Time window in seconds
 * @param {number} maxRequests - Maximum allowed requests in the window
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export const checkRateLimit = async (category, identifier, windowSeconds, maxRequests) => {
  // If Redis is down, allow the request (fail open)
  if (!isRedisReady()) {
    return { allowed: true, remaining: maxRequests, retryAfterMs: 0 };
  }

  const key = `${RATE_LIMIT_PREFIX}${category}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // Use a pipeline for atomicity
    const results = await redisClient
      .multi()
      // Remove entries outside the window
      .zRemRangeByScore(key, 0, windowStart)
      // Count entries in the window
      .zCard(key)
      // Add the current request
      .zAdd(key, { score: now, value: `${now}:${Math.random().toString(36).slice(2, 8)}` })
      // Set TTL so the key auto-cleans
      .expire(key, windowSeconds)
      .exec();

    const currentCount = results[1]; // zCard result (before adding new entry)

    if (currentCount >= maxRequests) {
      // Get the oldest entry to calculate retry-after
      const oldest = await redisClient.zRange(key, 0, 0, { BY: "SCORE" });
      let retryAfterMs = 0;

      if (oldest.length > 0) {
        const oldestScore = await redisClient.zScore(key, oldest[0]);
        retryAfterMs = Math.max(0, (oldestScore + windowSeconds * 1000) - now);
      }

      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      retryAfterMs: 0,
    };
  } catch (error) {
    console.error(`rateLimiter.checkRateLimit(${category}:${identifier}) failed:`, error.message);
    // Fail open
    return { allowed: true, remaining: maxRequests, retryAfterMs: 0 };
  }
};

// ─── Express Middleware Factory ──────────────────────────────────

/**
 * Create an Express middleware that rate-limits requests.
 *
 * @param {string} category - Rate limit category
 * @param {number} windowSeconds - Time window
 * @param {number} maxRequests - Max requests per window
 * @param {Function} [identifierFn] - Custom function to extract identifier from req.
 *                                    Defaults to IP address.
 */
export const rateLimitMiddleware = (category, windowSeconds, maxRequests, identifierFn) => {
  return async (req, res, next) => {
    const identifier = identifierFn
      ? identifierFn(req)
      : req.ip || req.connection.remoteAddress || "unknown";

    const result = await checkRateLimit(category, identifier, windowSeconds, maxRequests);

    // Set rate-limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
      "X-RateLimit-Category": category,
    });

    if (!result.allowed) {
      res.set("Retry-After", Math.ceil(result.retryAfterMs / 1000).toString());

      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfterMs: result.retryAfterMs,
      });
    }

    next();
  };
};

// ─── Socket Event Rate Limiter ──────────────────────────────────

/**
 * Check rate limit for a socket event.
 * Returns { allowed, remaining, retryAfterMs }.
 *
 * @param {string} userId - The user ID as identifier
 * @param {string} category - Rate limit category
 * @param {number} windowSeconds - Time window
 * @param {number} maxRequests - Max events per window
 */
export const socketRateLimit = async (userId, category, windowSeconds, maxRequests) => {
  return checkRateLimit(category, userId, windowSeconds, maxRequests);
};

// ─── Pre-configured Middleware ──────────────────────────────────

/** Rate limit: 5 login attempts per 5 minutes per IP+email */
export const loginLimiter = rateLimitMiddleware("login", 300, 5, (req) => {
  const email = req.body?.email || "unknown";
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  return `${ip}:${email}`;
});

/** Rate limit: 3 signups per hour per IP */
export const signupLimiter = rateLimitMiddleware("signup", 3600, 3);

/** Rate limit: 100 API requests per minute per IP */
export const apiLimiter = rateLimitMiddleware("api", 60, 100);
