
export function setupMessageEmitters(io, userConnections) {
    return {
        notifyNewMessage: (receiverId, messageData) => {
            const socketId = userConnections.get(receiverId);
            if (socketId) {
                io.to(socketId).emit("message:new", messageData);
            }
        },
        notifyMessageSent: (senderId, messageData) => {
            const socketId = userConnections.get(senderId);
            if (socketId) {
                io.to(socketId).emit("message:sent", messageData);
            }
        },
        notifyGroupMessage: (groupId, messageData) => {
            io.to(groupId).emit("groupMessage", messageData);
        }
    };
}