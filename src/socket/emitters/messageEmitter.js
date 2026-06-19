export function setupMessageEmitters(io, userConnections) {
    return {
        // ── 1-on-1 Message Emitters ──────────────────────────
        notifyNewMessage: (receiverId, messageData) => {
            const socketId = userConnections.get(receiverId);
            if (socketId) {
                io.to(socketId).emit("message:new", messageData);
            }
            io.to(receiverId).emit("message:new", messageData);
        },

        notifyMessageSent: (senderId, messageData) => {
            const socketId = userConnections.get(senderId);
            if (socketId) {
                io.to(socketId).emit("message:sent", messageData);
            }
            io.to(senderId).emit("message:sent", messageData);
        },

        // ── Group Creation & Management ──────────────────────
        notifyGroupCreated: (memberId, groupData) => {
            const socketId = userConnections.get(memberId);
            if (socketId) {
                io.to(socketId).emit("group:created", groupData);
            }
            io.to(memberId).emit("group:created", groupData);
        },

        notifyGroupMemberAdded: (groupId, payload) => {
            io.to(groupId).emit("group:member:added", payload);
        },

        notifyGroupMemberRemoved: (groupId, payload) => {
            io.to(groupId).emit("group:member:removed", payload);
        },

        notifyGroupDeleted: (groupId, payload) => {
            io.emit("group:deleted", payload);
        },

        // ── Group Messaging ──────────────────────────────────
        notifyGroupMessage: (groupId, messageData) => {
            io.to(groupId).emit("group:message:new", messageData);
        },

        notifyGroupMessageUpdate: (groupId, messageData) => {
            io.to(groupId).emit("group:message:updated", messageData);
        },

        notifyGroupMessageDelete: (groupId, messageId) => {
            io.to(groupId).emit("group:message:deleted", { messageId });
        },

        notifyGroupMessageRead: (groupId, readData) => {
            io.to(groupId).emit("group:message:read:update", readData);
        },

        // ── Group Presence ───────────────────────────────────
        notifyGroupTypingStart: (groupId, userData) => {
            io.to(groupId).emit("group:typing:start", userData);
        },

        notifyGroupTypingStop: (groupId, userData) => {
            io.to(groupId).emit("group:typing:stop", userData);
        },

        // ── Reply Emitters ────────────────────────────────────
        notifyNewMessageReply: (receiverId, messageData) => {
            const socketId = userConnections.get(receiverId);
            if (socketId) {
                io.to(socketId).emit("message:reply", messageData);
            }
            io.to(receiverId).emit("message:reply", messageData);
        },

        notifyGroupMessageReply: (groupId, messageData) => {
            io.to(groupId).emit("group:message:reply", messageData);
        },
    };
}