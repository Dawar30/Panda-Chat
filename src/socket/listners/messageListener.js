import cloudinary from "../../../config/cloudinary.js";
import Message from "../../model/messages.model.js";
import User from "../../model/user.model.js";

export function setupMessageListeners(socket, io, userConnections, onlineUsers, emitters) {
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

    socket.on("isOnline", (data = {}, callback = () => {}) => {
        const targetUserId = typeof data.userId === "string"
            ? data.userId.trim()
            : typeof data.receiverId === "string"
                ? data.receiverId.trim()
                : "";

        if (!targetUserId) {
            callback({
                success: false,
                error: "userId is required"
            });
            return;
        }

        callback({
            success: true,
            userId: targetUserId,
            isOnline: onlineUsers.has(targetUserId)
        });
    });

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
                senderId: socket.user.userId,
                conversationId,
                type: fileSource ? "document" : "text",
                content: text,
                file: file || undefined
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

            const messages = await Message.aggregate([
                {
                    $match: {
                        conversationId: resolvedConversationId
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                }
            ]);

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
                    content: text,
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

            const updated = await Message.findById(messageId);

            if (!updated) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            io.to(updated.senderId.toString()).emit("message:read:update", {
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
            const conversations = await Message.aggregate([
                {
                    $match: {
                        conversationId: { $exists: true, $ne: null }
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: "$conversationId",
                        lastMessage: { $first: "$$ROOT" }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "lastMessage.senderId",
                        foreignField: "_id",
                        as: "sender"
                    }
                },
                {
                    $unwind: {
                        path: "$sender",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 0,
                        conversationId: "$_id",
                        lastMessage: {
                            $mergeObjects: [
                                "$lastMessage",
                                {
                                    senderId: {
                                        _id: "$sender._id",
                                        name: "$sender.name",
                                        avatar: "$sender.avatar"
                                    }
                                }
                            ]
                        },
                        senderId: {
                            _id: "$sender._id",
                            name: "$sender.name",
                            avatar: "$sender.avatar"
                        }
                    }
                }
            ]);

            const withParticipant = conversations.map((conversation) => ({
                ...conversation,
                otherParticipant: conversation.senderId?._id?.toString() === userId
                    ? null
                    : conversation.senderId
            }));

            callback({
                success: true,
                conversations: withParticipant
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
