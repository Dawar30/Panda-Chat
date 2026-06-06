import cloudinary from "../../../config/cloudinary.js";
import Message from "../../model/messages.model.js";
import User from "../../model/user.model.js";

export function setupMessageListeners(socket, io, userConnections, emitters) {
    let typingTargetId = null;

    const getConversationId = (firstUserId, secondUserId) => {
        const sortedIds = [firstUserId, secondUserId]
            .map((value) => value.toString())
            .sort();

        return sortedIds.join("_");
    };

    const emitToUser = (userId, eventName, payload) => {
        const socketId = userConnections.get(userId);
        if (socketId) {
            io.to(socketId).emit(eventName, payload);
        }
        io.to(userId).emit(eventName, payload);
    };

    socket.on("message:send", async (data = {}, callback = () => {}) => {
        try {
            const receiverId = data.receiverId;
            const text = typeof data.text === "string" ? data.text.trim() : "";
            const fileSource = data.file;

            if (!receiverId) {
                callback({ success: false, error: "receiverId is required" });
                return;
            }

            if (!text) {
                callback({ success: false, error: "text is required" });
                return;
            }

            const conversationId = getConversationId(socket.user.userId, receiverId);

            let file = null;

            if (fileSource) {
                const uploaded = await cloudinary.uploader.upload(fileSource, {
                    folder: "chat-files"
                });

                file = {
                    public_id: uploaded.public_id,
                    url: uploaded.secure_url
                };
            }

            const newMessage = await Message.create({
                sender: socket.user.userId,
                receiver: receiverId,
                conversationId,
                message: text,
                file,
                isGroup: false
            });

            emitToUser(receiverId, "message:new", newMessage);

            callback({
                success: true,
                message: newMessage
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    });

    socket.on("messages:get", async (data = {}, callback = () => {}) => {
        try {
            const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : "";
            const conversationId = typeof data.conversationId === "string" ? data.conversationId.trim() : "";

            const resolvedConversationId = conversationId || (receiverId ? getConversationId(socket.user.userId, receiverId) : "");

            if (!resolvedConversationId) {
                callback({ success: false, error: "receiverId or conversationId is required" });
                return;
            }

            const messages = await Message.find({ conversationId: resolvedConversationId }).sort({ createdAt: -1 });

            callback({
                success: true,
                messages
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    });

    socket.on("message:update", async (data = {}, callback = () => {}) => {
        try {
            const messageId = typeof data.messageId === "string" ? data.messageId.trim() : "";
            const text = typeof data.text === "string" ? data.text.trim() : "";

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            if (!text) {
                callback({ success: false, error: "text is required" });
                return;
            }

            const updated = await Message.findByIdAndUpdate(
                messageId,
                {
                    message: text,
                    edited: true
                },
                { new: true }
            );

            if (!updated) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            io.emit("message:updated", updated);

            callback({
                success: true,
                message: updated
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on("message:delete", async (data = {}, callback = () => {}) => {
        try {
            const messageId = typeof data.messageId === "string" ? data.messageId.trim() : "";

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            const message = await Message.findById(messageId);
            if (!message) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            if (message.file?.public_id) {
                await cloudinary.uploader.destroy(message.file.public_id);
            }

            await Message.findByIdAndDelete(messageId);

            io.emit("message:deleted", { messageId });

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on("message:read", async (data = {}, callback = () => {}) => {
        try {
            const messageId = typeof data.messageId === "string" ? data.messageId.trim() : "";

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            const updated = await Message.findByIdAndUpdate(
                messageId,
                { isRead: true },
                { new: true }
            );

            if (!updated) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            io.to(updated.sender.toString()).emit("message:read:update", {
                messageId: updated._id
            });

            callback({ success: true, message: updated });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on("conversations:get", async (_, callback = () => {}) => {
        try {
            const userId = socket.user.userId.toString();
            const messages = await Message.find({
                conversationId: { $exists: true, $ne: null },
                $or: [{ sender: userId }, { receiver: userId }]
            })
                .sort({ createdAt: -1 })
                .populate("sender", "name avatar")
                .populate("receiver", "name avatar");

            const conversationsMap = new Map();

            for (const message of messages) {
                if (!message.conversationId || conversationsMap.has(message.conversationId)) {
                    continue;
                }

                const otherParticipant = message.sender?._id?.toString() === userId ? message.receiver : message.sender;

                conversationsMap.set(message.conversationId, {
                    conversationId: message.conversationId,
                    lastMessage: message,
                    participants: [message.sender, message.receiver],
                    otherParticipant
                });
            }

            callback({
                success: true,
                conversations: [...conversationsMap.values()]
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on("typing:start", (data = {}) => {
        const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : "";
        if (!receiverId) {
            return;
        }

        typingTargetId = receiverId;
        emitToUser(receiverId, "typing:start", {
            userId: socket.user.userId
        });
    });

    socket.on("typing:stop", (data = {}) => {
        const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : typingTargetId;
        if (!receiverId) {
            return;
        }

        emitToUser(receiverId, "typing:stop", {
            userId: socket.user.userId
        });

        if (typingTargetId === receiverId) {
            typingTargetId = null;
        }
    });

    socket.on("users:get", async (_, callback = () => {}) => {
        try {
            const users = await User.find().select("name avatar");

            callback({
                success: true,
                users
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    });

    socket.on("joinRoom", (groupId) => {
        if (groupId) socket.join(groupId);
        console.log(`User ${socket.user.userId} joined room ${groupId}`);
    });

    socket.on("leaveRoom", (groupId) => {
        if (groupId) socket.leave(groupId);
        console.log(`User ${socket.user.userId} left room ${groupId}`);

    });
}
