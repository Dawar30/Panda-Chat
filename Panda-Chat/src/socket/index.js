import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { setupSocketMiddleware } from "./middleware/auth.js";
import { setupMessageEmitters } from "./emitters/messageEmitter.js";
import { setupMessageListeners } from "./listners/messageListener.js";
import { isRedisReady } from "../../config/redis.js";
import * as presenceService from "../services/presenceService.js";
import { initSubscriptions } from "../services/pubsubService.js";
import { setupGroupMessageListeners } from "./listners/messageListener.js";

export function initSockets(server) {
    const io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        // ── Performance tuning for 1M users ──
        pingInterval: 25_000,
        pingTimeout: 20_000,
        maxHttpBufferSize: 1e6, // 1MB max message size
        connectTimeout: 45_000,
    });

    // ── Attach Redis Adapter for Multi-Server Scaling ────────
    // The adapter uses its own dedicated pub/sub pair (separate from app pub/sub)
    if (isRedisReady()) {
        try {
            const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
            const adapterPub = createClient({ url: redisUrl });
            const adapterSub = adapterPub.duplicate();

            Promise.all([adapterPub.connect(), adapterSub.connect()])
                .then(() => {
                    io.adapter(createAdapter(adapterPub, adapterSub));
                    console.log("Socket.IO Redis adapter attached — multi-server ready");
                })
                .catch((err) => {
                    console.error("Socket.IO Redis adapter failed:", err.message);
                });
        } catch (error) {
            console.error("Socket.IO Redis adapter setup error:", error.message);
        }
    }

    // Local map: userId → socketId (this server only — needed for pub/sub handlers)
    const userConnections = new Map();

    // Start stale presence cleanup interval
    const cleanupIntervalId = presenceService.startCleanupInterval();

    // ── Initialize Pub/Sub subscriptions ─────────────────────
    initSubscriptions(io, userConnections);

    const broadcastOnlineUsers = async () => {
        try {
            const users = await presenceService.getOnlineUsers();
            io.emit("users:online", users);
        } catch (error) {
            console.error("broadcastOnlineUsers failed:", error.message);
        }
    };

    setupSocketMiddleware(io);

    const emitters = setupMessageEmitters(io, userConnections);

    io.on("connection", async (socket) => {
        const userId = socket.user.userId.toString();
        console.log(`User connected: ${userId}`);

        // Track connection locally
        userConnections.set(userId, socket.id);
        socket.join(userId);

        // Set presence in Redis (heartbeat-based)
        await presenceService.setOnline(userId, socket.id);

        // Start heartbeat interval for this socket
        const heartbeatIntervalId = presenceService.startHeartbeat(userId);

        broadcastOnlineUsers();

        // ── Presence Events ──────────────────────────────────
        socket.on("status:set", async (data = {}, callback = () => {}) => {
            const status = typeof data.status === "string" ? data.status.trim() : "";
            if (!["online", "away", "busy"].includes(status)) {
                callback({ success: false, error: "Invalid status. Use: online, away, busy" });
                return;
            }

            const updated = await presenceService.setStatus(userId, status);
            callback({ success: updated });
        });

        socket.on("presence:get", async (data = {}, callback = () => {}) => {
            const targetId = typeof data.userId === "string" ? data.userId.trim() : "";
            if (!targetId) {
                callback({ success: false, error: "userId is required" });
                return;
            }

            const presence = await presenceService.getPresence(targetId);
            const lastSeen = presence ? null : await presenceService.getLastSeen(targetId);

            callback({
                success: true,
                userId: targetId,
                isOnline: !!presence,
                status: presence?.status || "offline",
                lastSeen,
            });
        });

        // ── Setup All Message Listeners ──────────────────────
        setupMessageListeners(socket, io, userConnections, null, emitters);

        // ── Setup All Group Message Listeners ──────────────────────
        setupGroupMessageListeners(socket, io, userConnections, null, emitters);

        // ── Disconnect ───────────────────────────────────────
        socket.on("disconnect", async () => {
            userConnections.delete(userId);

            // Stop heartbeat
            clearInterval(heartbeatIntervalId);

            // Mark offline in Redis
            await presenceService.setOffline(userId);

            broadcastOnlineUsers();
        });
    });

    // Return cleanup function for graceful shutdown
    return {
        io,
        emitters,
        shutdown: () => {
            clearInterval(cleanupIntervalId);
        },
    };
}