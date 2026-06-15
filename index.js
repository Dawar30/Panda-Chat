import express from "express"
import http from "http"
import DBconnection from "./config/db.js"
import userRoutes from "./src/routes/user.routes.js"
import messageRoutes from "./src/routes/messages.routes.js"
import groupRoutes from "./src/routes/group.routes.js"
import conversationRoutes from "./src/routes/conversation.routes.js"
import conversationMemberRoutes from "./src/routes/conversationMember.routes.js"
import groupMemberRoutes from "./src/routes/groupMember.routes.js"
import cookieParser from "cookie-parser"
import { initSockets } from "./src/socket/index.js"




DBconnection()

const app = express()
const port = process.env.PORT || 5000

app.use(express.json())
app.use(cookieParser())


const server = http.createServer(app)

// initialize socket.io with the HTTP server
const io = initSockets(server)

// Middleware to make emitters available in controllers
const { emitters } = io;
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

//logger implementation can be added here
server.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`)
})
