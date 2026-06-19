import jwt from "jsonwebtoken";
import * as sessionService from "../../services/sessionService.js";

export function setupSocketMiddleware(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token ||
            socket.handshake.headers.cookie?.split("token=")[1]?.split(";")[0];

        if (!token) {
            return next(new Error("Authentication error: Token not provided"));
        }

        try {
            // Check if the token has been blacklisted
            const blacklisted = await sessionService.isBlacklisted(token);
            if (blacklisted) {
                return next(new Error("Authentication error: Token has been revoked"));
            }

            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            socket.user = decoded;
            next();
        } catch (error) {
            return next(new Error("Authentication error: Invalid token"));
        }
    });
}