import { Server } from "socket.io";
import { setupSocketMiddleware } from "./middleware/auth.js";
import { setupMessageEmitters } from "./emitters/messageEmitter.js";
import { setupMessageListeners } from "./listners/messageListener.js";

export function initSockets(server) {
    const io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    const userConnections = new Map();
    const onlineUsers = new Map();

    const broadcastOnlineUsers = () => {
        io.emit("users:online", [...onlineUsers.keys()]);
    };

    setupSocketMiddleware(io);

    const emitters = setupMessageEmitters(io, userConnections);

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.userId}`);
        userConnections.set(socket.user.userId, socket.id);
        onlineUsers.set(socket.user.userId, socket.id);
        socket.join(socket.user.userId);
        broadcastOnlineUsers();

        setupMessageListeners(socket, io, userConnections, emitters);

        socket.on("disconnect", () => {
            userConnections.delete(socket.user.userId);
            onlineUsers.delete(socket.user.userId);
            broadcastOnlineUsers();
        });
    });

    return { io, emitters };
}