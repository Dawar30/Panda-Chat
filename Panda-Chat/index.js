import express from "express"
import http from "http"
import DBconnection from "./config/db.js"
import userRoutes from "./src/routes/user.routes.js"
import messageRoutes from "./src/routes/messages.routes.js"
import groupRoutes from "./src/routes/group.routes.js"
import conversationRoutes from "./src/routes/conversation.routes.js"
import conversationMemberRoutes from "./src/routes/conversationMember.routes.js"
import groupMemberRoutes from "./src/routes/groupMember.routes.js"
import contactRoutes from "./src/routes/contact.routes.js"
import cookieParser from "cookie-parser"
import { initSockets } from "./src/socket/index.js"
import { gracefulShutdown as redisShutdown } from "./config/redis.js"
import { apiLimiter } from "./src/middleware/rateLimiter.js"


DBconnection()

const app = express()
// add check to handle 5000,3000 ports
const port = process.env.PORT || 5000

if (port === 5000 || port === 3000) {
  console.log(`App is running on multiple ports ${port}`);
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json())
app.use(cookieParser())

// Global API rate limiter: 100 requests/minute per IP
app.use("/api", apiLimiter)

const server = http.createServer(app)

// initialize socket.io with the HTTP server
const { io, emitters, shutdown: socketShutdown } = initSockets(server)

// Middleware to make emitters available in controllers
app.use((req, res, next) => {
  req.ioEmitters = emitters;
  next();
});

// Routes
app.use("/api/user", userRoutes)
app.use("/api/message", messageRoutes)
app.use("/api/group", groupRoutes)
app.use("/api/conversation", conversationRoutes)
app.use("/api/conversation-member", conversationMemberRoutes)
app.use("/api/group-member", groupMemberRoutes)
app.use("/api/contact", contactRoutes)

// ─── Graceful Shutdown ──────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(() => {
    console.log("HTTP server closed");
  });

  // 2. Close Socket.IO
  try {
    socketShutdown();
    io.close();
    console.log("Socket.IO closed");
  } catch (err) {
    console.error("Socket.IO shutdown error:", err.message);
  }

  // 3. Close all Redis connections
  await redisShutdown();

  console.log("Graceful shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

//logger implementation can be added here
server.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`)
})
