import jwt from "jsonwebtoken";

export function setupSocketMiddleware(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token ||
            socket.handshake.headers.cookie?.split("token=")[1]?.split(";")[0];

        if (!token) {
            return next(new Error("Authentication error: Token not provided"));
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            socket.user = decoded;
            next();
        } catch (error) {
            return next(new Error("Authentication error: Invalid token"));
        }
    });
}