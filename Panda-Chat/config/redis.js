import { createClient } from "redis";

// ─── Retry Strategy ─────────────────────────────────────────────
// Exponential backoff: 100ms → 200ms → 400ms → ... capped at 30s
const retryStrategy = (retries) => {
  const delay = Math.min(100 * Math.pow(2, retries), 30_000);
  console.log(`Redis retry #${retries + 1} in ${delay}ms`);
  return delay;
};

const redisOptions = {
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: retryStrategy,
    connectTimeout: 10_000,
  },
};

// ─── Three Separate Connections ──────────────────────────────────
// 1. General-purpose commands (GET, SET, INCR, ZADD, etc.)
const redisClient = createClient(redisOptions);

// 2. Publishing to Pub/Sub channels
const redisPub = createClient(redisOptions);

// 3. Subscribing to Pub/Sub channels (dedicated — once subscribed, can't run commands)
const redisSub = createClient(redisOptions);

// ─── Event Handlers ─────────────────────────────────────────────
const connections = [
  { name: "RedisClient", client: redisClient },
  { name: "RedisPub", client: redisPub },
  { name: "RedisSub", client: redisSub },
];

for (const { name, client } of connections) {
  client.on("error", (err) => {
    console.error(`${name} Error:`, err.message);
  });

  client.on("connect", () => {
    console.log(`${name} connected`);
  });

  client.on("reconnecting", () => {
    console.log(`${name} reconnecting...`);
  });

  client.on("ready", () => {
    console.log(`${name} ready`);
  });
}

// ─── Connect All ────────────────────────────────────────────────
try {
  await Promise.all([
    redisClient.connect(),
    redisPub.connect(),
    redisSub.connect(),
  ]);
  console.log("All Redis connections established");
} catch (error) {
  console.error("Redis connection failed. Continuing without Redis.", error.message);
}

// ─── Helpers ────────────────────────────────────────────────────
export const isRedisReady = () =>
  redisClient.isOpen && redisPub.isOpen && redisSub.isOpen;

/**
 * Gracefully close all Redis connections.
 * Call this on SIGTERM / SIGINT before process exit.
 */
export const gracefulShutdown = async () => {
  console.log("Shutting down Redis connections...");
  const results = await Promise.allSettled([
    redisClient.isOpen ? redisClient.quit() : Promise.resolve(),
    redisPub.isOpen ? redisPub.quit() : Promise.resolve(),
    redisSub.isOpen ? redisSub.quit() : Promise.resolve(),
  ]);

  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(`Failed to close ${connections[i].name}:`, result.reason?.message);
    }
  }
  console.log("All Redis connections closed");
};

export { redisPub, redisSub };
export default redisClient;