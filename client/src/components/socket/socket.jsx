import { io } from "socket.io-client";
import { logout } from "@/utils/auth";

// Remove /api from URL for socket.io connection
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Debug socket connection events
socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
  console.error("Error message:", error.message);
  console.error("Error description:", error.description);
  console.error("Error context:", error.context);

  // If connection error is due to authentication, trigger logout
  if (error.message === "Invalid token" || error.message === "Authentication failed") {
    logout();
  }
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);

  // If disconnected due to authentication failure, trigger logout
  if (reason === "auth error" || reason === "unauthorized") {
    logout();
  }
});

socket.on("auth_error", (error) => {
  console.error("Socket authentication error:", error);
  logout();
});

export default socket;