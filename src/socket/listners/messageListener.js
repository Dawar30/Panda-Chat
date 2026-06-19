import mongoose from "mongoose";
import cloudinary from "../../../config/cloudinary.js";
import Group from "../../model/group.model.js";
import GroupMember from "../../model/groupMembers.model.js";
import Message from "../../model/messages.model.js";
import Conversation from "../../model/converstation.model.js";
import ConversationMember from "../../model/conversationMember.model.js";
import User from "../../model/user.model.js";
import * as cacheService from "../../services/cacheService.js";
import * as presenceService from "../../services/presenceService.js";
import * as unreadService from "../../services/unreadService.js";
import { publish, CHANNELS } from "../../services/pubsubService.js";
import { socketRateLimit } from "../../middleware/rateLimiter.js";

const MESSAGE_CACHE_TTL = cacheService.TTL.SHORT; // 60s

// ─── Helper: get all member userIds for a group ─────────────────
const getGroupMemberIds = async (groupId) => {
    const members = await GroupMember.find({ groupId }).select("userId").lean();
    return members.map((m) => m.userId.toString());
};

// ─── Helper: find or create the Conversation tied to a group ────
const getOrCreateGroupConversation = async (groupId, memberIds) => {
    let conversation = await Conversation.findOne({ type: "group", groupId });

    if (!conversation) {
        conversation = await Conversation.create({
            type: "group",
            participants: memberIds,
            groupId,
        });

        // Create ConversationMember rows for each member
        const memberDocs = memberIds.map((userId) => ({
            conversationId: conversation._id,
            userId,
        }));
        await ConversationMember.insertMany(memberDocs, { ordered: false }).catch(() => {});
    }

    return conversation;
};

// ═══════════════════════════════════════════════════════════════════
// GROUP MESSAGE LISTENERS
// ═══════════════════════════════════════════════════════════════════

export function setupGroupMessageListeners(socket, io, userConnections, _unused, emitters) {
    let typingTargetGroupId = null;

    const getGroupCacheKey = (groupId) =>
        cacheService.KEYS.MESSAGES_GROUP(groupId);

    const getGroupMembersCacheKey = (groupId) =>
        cacheService.KEYS.GROUP_MEMBERS(groupId);

    const getGroupsCacheKey = (userId) =>
        cacheService.KEYS.USER_GROUPS(userId);

    // ── Create Group ─────────────────────────────────────────
    socket.on("group:create", async (data = {}, callback = () => { }) => {
        try {
            const { name, description, memberIds } = data;
            const creatorId = socket.user.userId.toString();

            if (!name || typeof name !== "string") {
                callback({ success: false, error: "Group name is required" });
                return;
            }

            // Ensure creator is in memberIds
            const allMemberIds = [...new Set([creatorId, ...(memberIds || [])])];

            if (allMemberIds.length < 2) {
                callback({ success: false, error: "Group must have at least 2 members" });
                return;
            }

            // 1. Create the Group document
            const group = await Group.create({
                name: name.trim(),
                description: description?.trim() || "",
                avatar: null,
                createdBy: creatorId,
                memberCount: allMemberIds.length,
            });

            // 2. Create GroupMember rows for each member
            const groupMemberDocs = allMemberIds.map((userId) => ({
                groupId: group._id,
                userId,
                role: userId === creatorId ? "admin" : "member",
            }));
            await GroupMember.insertMany(groupMemberDocs);

            // 3. Create a Conversation of type "group" linked to this group
            const conversation = await Conversation.create({
                type: "group",
                participants: allMemberIds,
                groupId: group._id,
            });

            // 4. Create ConversationMember rows
            const convMemberDocs = allMemberIds.map((userId) => ({
                conversationId: conversation._id,
                userId,
            }));
            await ConversationMember.insertMany(convMemberDocs);

            // Invalidate cache for all members
            for (const memberId of allMemberIds) {
                await cacheService.del(getGroupsCacheKey(memberId));
            }

            // Notify all members
            const groupPayload = { ...group.toObject(), conversationId: conversation._id };

            await publish(CHANNELS.GROUP_CREATED, {
                groupId: group._id.toString(),
                group: groupPayload,
                memberIds: allMemberIds,
            });

            allMemberIds.forEach((memberId) => {
                emitters.notifyGroupCreated(memberId, groupPayload);
            });

            callback({
                success: true,
                group: groupPayload,
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Add Member to Group ──────────────────────────────────
    socket.on("group:addMember", async (data = {}, callback = () => { }) => {
        try {
            const { groupId, memberId } = data;
            const userId = socket.user.userId.toString();

            if (!groupId || !memberId) {
                callback({ success: false, error: "groupId and memberId are required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            // Check if user is creator
            if (group.createdBy.toString() !== userId) {
                callback({ success: false, error: "Only group creator can add members" });
                return;
            }

            // Check if already a member
            const existingMember = await GroupMember.findOne({ groupId, userId: memberId });
            if (existingMember) {
                callback({ success: false, error: "User is already a member" });
                return;
            }

            // Add to GroupMembers
            await GroupMember.create({ groupId, userId: memberId, role: "member" });

            // Update memberCount
            group.memberCount = (group.memberCount || 0) + 1;
            await group.save();

            // Add to the group conversation's participants + ConversationMember
            const conversation = await Conversation.findOne({ type: "group", groupId });
            if (conversation) {
                conversation.participants.push(memberId);
                await conversation.save();
                await ConversationMember.create({
                    conversationId: conversation._id,
                    userId: memberId,
                }).catch(() => {}); // ignore duplicate key
            }

            // Invalidate caches
            await cacheService.del(getGroupMembersCacheKey(groupId));
            await cacheService.del(getGroupsCacheKey(memberId));

            const currentMemberIds = await getGroupMemberIds(groupId);

            // Notify
            await publish(CHANNELS.GROUP_MEMBER_ADDED, {
                groupId,
                newMemberId: memberId,
                group,
                memberIds: currentMemberIds,
            });

            emitters.notifyGroupMemberAdded(groupId, { groupId, newMemberId: memberId, group });

            callback({ success: true, group });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Remove Member from Group ─────────────────────────────
    socket.on("group:removeMember", async (data = {}, callback = () => { }) => {
        try {
            const { groupId, memberId } = data;
            const userId = socket.user.userId.toString();

            if (!groupId || !memberId) {
                callback({ success: false, error: "groupId and memberId are required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            // Check if user is creator or removing self
            if (group.createdBy.toString() !== userId && userId !== memberId) {
                callback({ success: false, error: "Unauthorized" });
                return;
            }

            // Remove from GroupMembers
            await GroupMember.deleteOne({ groupId, userId: memberId });

            // Update memberCount
            group.memberCount = Math.max(0, (group.memberCount || 1) - 1);
            await group.save();

            // Remove from conversation
            const conversation = await Conversation.findOne({ type: "group", groupId });
            if (conversation) {
                conversation.participants = conversation.participants.filter(
                    (p) => p.toString() !== memberId
                );
                await conversation.save();
                await ConversationMember.deleteOne({
                    conversationId: conversation._id,
                    userId: memberId,
                });
            }

            // Invalidate caches
            await cacheService.del(getGroupMembersCacheKey(groupId));
            await cacheService.del(getGroupsCacheKey(memberId));

            const currentMemberIds = await getGroupMemberIds(groupId);

            // Notify
            await publish(CHANNELS.GROUP_MEMBER_REMOVED, {
                groupId,
                removedMemberId: memberId,
                group,
                memberIds: currentMemberIds,
            });

            emitters.notifyGroupMemberRemoved(groupId, { groupId, removedMemberId: memberId, group });

            callback({ success: true, group });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Leave Group ──────────────────────────────────────────
    socket.on("group:leave", async (data = {}, callback = () => { }) => {
        try {
            const { groupId } = data;
            const userId = socket.user.userId.toString();

            if (!groupId) {
                callback({ success: false, error: "groupId is required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            const memberIds = await getGroupMemberIds(groupId);

            // If creator leaves, delete group entirely
            if (group.createdBy.toString() === userId) {
                // Delete all group members
                await GroupMember.deleteMany({ groupId });

                // Delete the group conversation + its members
                const conversation = await Conversation.findOne({ type: "group", groupId });
                if (conversation) {
                    await ConversationMember.deleteMany({ conversationId: conversation._id });
                    await Conversation.findByIdAndDelete(conversation._id);
                }

                await Group.findByIdAndDelete(groupId);

                // Notify all members
                await publish(CHANNELS.GROUP_DELETED, { groupId, memberIds });
                emitters.notifyGroupDeleted(groupId, { groupId });

                // Invalidate caches for all members
                for (const mid of memberIds) {
                    await cacheService.del(getGroupsCacheKey(mid));
                }
            } else {
                // Just remove this member
                await GroupMember.deleteOne({ groupId, userId });
                group.memberCount = Math.max(0, (group.memberCount || 1) - 1);
                await group.save();

                const conversation = await Conversation.findOne({ type: "group", groupId });
                if (conversation) {
                    conversation.participants = conversation.participants.filter(
                        (p) => p.toString() !== userId
                    );
                    await conversation.save();
                    await ConversationMember.deleteOne({
                        conversationId: conversation._id,
                        userId,
                    });
                }

                // Invalidate caches
                await cacheService.del(getGroupMembersCacheKey(groupId));
                await cacheService.del(getGroupsCacheKey(userId));

                const remainingMemberIds = await getGroupMemberIds(groupId);

                await publish(CHANNELS.GROUP_MEMBER_REMOVED, {
                    groupId,
                    removedMemberId: userId,
                    group,
                    memberIds: remainingMemberIds,
                });

                emitters.notifyGroupMemberRemoved(groupId, { groupId, removedMemberId: userId, group });
            }

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Send Group Message ───────────────────────────────────
    socket.on("group:message:send", async (data = {}, callback = () => { }) => {
        try {
            // Rate limit
            const rateResult = await socketRateLimit(
                socket.user.userId.toString(), "group_message_send", 10, 20
            );
            if (!rateResult.allowed) {
                callback({
                    success: false,
                    error: "Rate limit exceeded. Slow down.",
                    retryAfterMs: rateResult.retryAfterMs,
                });
                return;
            }

            const { groupId } = data;
            const text = typeof data.text === "string" ? data.text.trim() : "";
            const fileSource = data.file;

            if (!groupId) {
                callback({ success: false, error: "groupId is required" });
                return;
            }

            if (!text) {
                callback({ success: false, error: "text is required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            const userId = socket.user.userId.toString();

            // Verify membership via GroupMembers
            const isMember = await GroupMember.findOne({ groupId, userId });
            if (!isMember) {
                callback({ success: false, error: "You are not a member of this group" });
                return;
            }

            // Find or create the group conversation
            const memberIds = await getGroupMemberIds(groupId);
            const conversation = await getOrCreateGroupConversation(groupId, memberIds);

            let file = null;
            if (fileSource) {
                const uploaded = await cloudinary.uploader.upload(fileSource, {
                    folder: "group-chat-files",
                });
                file = {
                    public_id: uploaded.public_id,
                    url: uploaded.secure_url,
                };
            }

            // Create message with the real conversation ObjectId
            const newMessage = await Message.create({
                senderId: userId,
                conversationId: conversation._id,
                type: fileSource ? "document" : "text",
                content: text,
                file: file || undefined,
            });

            // Update conversation's lastMessage
            conversation.lastMessage = text;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // Invalidate group message cache
            await cacheService.del(getGroupCacheKey(groupId));

            // Publish via Pub/Sub
            await publish(CHANNELS.GROUP_MESSAGE_NEW, {
                groupId,
                message: newMessage,
                memberIds,
            });

            // Emit directly to group room
            emitters.notifyGroupMessage(groupId, newMessage);

            callback({ success: true, message: newMessage });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Reply to Group Message ────────────────────────────────
    socket.on("group:message:reply", async (data = {}, callback = () => { }) => {
        try {
            // Rate limit
            const rateResult = await socketRateLimit(
                socket.user.userId.toString(), "group_message_reply", 10, 20
            );
            if (!rateResult.allowed) {
                callback({
                    success: false,
                    error: "Rate limit exceeded. Slow down.",
                    retryAfterMs: rateResult.retryAfterMs,
                });
                return;
            }

            const { groupId, parentMessageId } = data;
            const text = typeof data.text === "string" ? data.text.trim() : "";
            const fileSource = data.file;

            if (!groupId) {
                callback({ success: false, error: "groupId is required" });
                return;
            }

            if (!parentMessageId) {
                callback({ success: false, error: "parentMessageId is required" });
                return;
            }

            if (!text) {
                callback({ success: false, error: "text is required" });
                return;
            }

            // Verify parent message exists
            const parentMessage = await Message.findById(parentMessageId);
            if (!parentMessage) {
                callback({ success: false, error: "Parent message not found" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            const userId = socket.user.userId.toString();

            // Verify membership
            const isMember = await GroupMember.findOne({ groupId, userId });
            if (!isMember) {
                callback({ success: false, error: "You are not a member of this group" });
                return;
            }

            const memberIds = await getGroupMemberIds(groupId);
            const conversation = await getOrCreateGroupConversation(groupId, memberIds);

            let file = null;
            if (fileSource) {
                const uploaded = await cloudinary.uploader.upload(fileSource, {
                    folder: "group-chat-files",
                });
                file = {
                    public_id: uploaded.public_id,
                    url: uploaded.secure_url,
                };
            }

            const newMessage = await Message.create({
                senderId: userId,
                conversationId: conversation._id,
                type: fileSource ? "document" : "text",
                content: text,
                file: file || undefined,
                parentMessageId,
            });

            conversation.lastMessage = text;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            await cacheService.del(getGroupCacheKey(groupId));

            // Populate parentMessageId for full client context
            const populatedMessage = await Message.findById(newMessage._id).populate("parentMessageId").lean();

            await publish(CHANNELS.GROUP_MESSAGE_REPLY, {
                groupId,
                message: populatedMessage,
                memberIds,
            });

            emitters.notifyGroupMessageReply(groupId, populatedMessage);

            callback({ success: true, message: populatedMessage });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Get Group Messages ───────────────────────────────────
    socket.on("group:messages:get", async (data = {}, callback = () => { }) => {
        try {
            const { groupId } = data;

            if (!groupId) {
                callback({ success: false, error: "groupId is required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            const userId = socket.user.userId.toString();
            const isMember = await GroupMember.findOne({ groupId, userId });
            if (!isMember) {
                callback({ success: false, error: "You are not a member of this group" });
                return;
            }

            // Find the group conversation to get its ObjectId
            const conversation = await Conversation.findOne({ type: "group", groupId });
            if (!conversation) {
                callback({ success: true, messages: [], source: "db" });
                return;
            }

            const cacheKey = getGroupCacheKey(groupId);

            const { data: messages, source } = await cacheService.getOrSet(
                cacheKey,
                MESSAGE_CACHE_TTL,
                async () => {
                    return Message.aggregate([
                        { $match: { conversationId: conversation._id } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "senderId",
                                foreignField: "_id",
                                as: "senderData",
                            },
                        },
                        { $unwind: { path: "$senderData", preserveNullAndEmptyArrays: true } },
                        { $sort: { createdAt: -1 } },
                    ]);
                }
            );

            callback({
                success: true,
                messages,
                source,
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Update Group Message ─────────────────────────────────
    socket.on("group:message:update", async (data = {}, callback = () => { }) => {
        try {
            const { messageId, text } = data;
            const userId = socket.user.userId.toString();

            if (!messageId || !text) {
                callback({ success: false, error: "messageId and text are required" });
                return;
            }

            const message = await Message.findById(messageId);
            if (!message) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            if (message.senderId.toString() !== userId) {
                callback({ success: false, error: "Only sender can edit message" });
                return;
            }

            const updated = await Message.findByIdAndUpdate(
                messageId,
                { content: text.trim(), edited: true },
                { new: true }
            );

            // Find which group this conversation belongs to, to invalidate the right cache
            const conversation = await Conversation.findById(message.conversationId);
            if (conversation?.groupId) {
                await cacheService.del(getGroupCacheKey(conversation.groupId.toString()));

                // Publish & emit
                await publish(CHANNELS.GROUP_MESSAGE_UPDATED, {
                    groupId: conversation.groupId.toString(),
                    message: updated,
                });

                io.to(conversation.groupId.toString()).emit("group:message:updated", updated);
            }

            callback({ success: true, message: updated });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Delete Group Message ─────────────────────────────────
    socket.on("group:message:delete", async (data = {}, callback = () => { }) => {
        try {
            const { messageId } = data;
            const userId = socket.user.userId.toString();

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            const message = await Message.findById(messageId);
            if (!message) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            if (message.senderId.toString() !== userId) {
                callback({ success: false, error: "Only sender can delete message" });
                return;
            }

            if (message.file?.public_id) {
                await cloudinary.uploader.destroy(message.file.public_id);
            }

            await Message.findByIdAndDelete(messageId);

            // Find which group this conversation belongs to
            const conversation = await Conversation.findById(message.conversationId);
            if (conversation?.groupId) {
                await cacheService.del(getGroupCacheKey(conversation.groupId.toString()));

                await publish(CHANNELS.GROUP_MESSAGE_DELETED, {
                    groupId: conversation.groupId.toString(),
                    messageId,
                });

                io.to(conversation.groupId.toString()).emit("group:message:deleted", { messageId });
            }

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Mark Group Message as Read ───────────────────────────
    socket.on("group:message:read", async (data = {}, callback = () => { }) => {
        try {
            const { messageId } = data;
            const userId = socket.user.userId.toString();

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            const message = await Message.findById(messageId);
            if (!message) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            // Update lastReadMessageId in ConversationMember
            await ConversationMember.findOneAndUpdate(
                { conversationId: message.conversationId, userId },
                { lastReadMessageId: message._id }
            );

            // Find the group to emit to the right room
            const conversation = await Conversation.findById(message.conversationId);
            const groupId = conversation?.groupId?.toString();

            if (groupId) {
                await publish(CHANNELS.GROUP_MESSAGE_READ, {
                    groupId,
                    messageId,
                    userId,
                });

                io.to(groupId).emit("group:message:read:update", {
                    messageId,
                    userId,
                });
            }

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Get User's Groups ────────────────────────────────────
    socket.on("groups:get", async (_, callback = () => { }) => {
        try {
            const userId = socket.user.userId.toString();
            const cacheKey = getGroupsCacheKey(userId);

            const { data: groups } = await cacheService.getOrSet(
                cacheKey,
                cacheService.TTL.MEDIUM,
                async () => {
                    // Find all groups the user belongs to via GroupMembers
                    const memberships = await GroupMember.find({ userId }).select("groupId").lean();
                    const groupIds = memberships.map((m) => m.groupId);

                    if (groupIds.length === 0) return [];

                    return Group.aggregate([
                        { $match: { _id: { $in: groupIds } } },
                        {
                            $lookup: {
                                from: "conversations",
                                let: { gId: "$_id" },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$groupId", "$$gId"] } } },
                                ],
                                as: "conversation",
                            },
                        },
                        { $unwind: { path: "$conversation", preserveNullAndEmptyArrays: true } },
                        { $sort: { "conversation.lastMessageAt": -1 } },
                        {
                            $project: {
                                name: 1,
                                description: 1,
                                avatar: 1,
                                createdBy: 1,
                                memberCount: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                conversationId: "$conversation._id",
                                lastMessage: "$conversation.lastMessage",
                                lastMessageAt: "$conversation.lastMessageAt",
                            },
                        },
                    ]);
                }
            );

            callback({ success: true, groups });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Group Typing Indicators ──────────────────────────────
    socket.on("group:typing:start", async (data = {}) => {
        const { groupId } = data;
        if (!groupId) return;

        typingTargetGroupId = groupId;

        await publish(CHANNELS.GROUP_TYPING, {
            groupId,
            userId: socket.user.userId.toString(),
            action: "start",
        });

        io.to(groupId).emit("group:typing:start", {
            userId: socket.user.userId,
            groupId,
        });
    });

    socket.on("group:typing:stop", async (data = {}) => {
        const { groupId } = data;
        if (!groupId) return;

        await publish(CHANNELS.GROUP_TYPING, {
            groupId,
            userId: socket.user.userId.toString(),
            action: "stop",
        });

        io.to(groupId).emit("group:typing:stop", {
            userId: socket.user.userId,
            groupId,
        });

        if (typingTargetGroupId === groupId) {
            typingTargetGroupId = null;
        }
    });

    // ── Join Group Room ─────────────────────────────────────
    socket.on("group:join", async (data = {}, callback = () => { }) => {
        try {
            const { groupId } = data;
            const userId = socket.user.userId.toString();

            if (!groupId) {
                callback({ success: false, error: "groupId is required" });
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                callback({ success: false, error: "Group not found" });
                return;
            }

            const isMember = await GroupMember.findOne({ groupId, userId });
            if (!isMember) {
                callback({ success: false, error: "You are not a member of this group" });
                return;
            }

            socket.join(groupId);
            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Leave Group Room (socket room, not group membership) ─
    socket.on("group:room:leave", (data = {}) => {
        const { groupId } = data;
        if (groupId) {
            socket.leave(groupId);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════
// DIRECT MESSAGE LISTENERS
// ═══════════════════════════════════════════════════════════════════

export function setupMessageListeners(socket, io, userConnections, _unused, emitters) {
    let typingTargetId = null;

    const getConversationCacheKey = (conversationId) =>
        cacheService.KEYS.MESSAGES_CONVERSATION(conversationId);

    const emitToUser = (userId, eventName, payload) => {
        const socketId = userConnections.get(userId);
        if (socketId) {
            io.to(socketId).emit(eventName, payload);
        }
        io.to(userId).emit(eventName, payload);
    };

    // ── Helper: find or create a private conversation ────────
    const getOrCreatePrivateConversation = async (userIdA, userIdB) => {
        // Look for an existing private conversation between these two users
        let conversation = await Conversation.findOne({
            type: "private",
            participants: { $all: [userIdA, userIdB] },
            groupId: null,
        });

        if (!conversation) {
            conversation = await Conversation.create({
                type: "private",
                participants: [userIdA, userIdB],
                groupId: null,
            });

            // Create ConversationMember rows for both users
            await ConversationMember.insertMany([
                { conversationId: conversation._id, userId: userIdA },
                { conversationId: conversation._id, userId: userIdB },
            ]).catch(() => {}); // ignore duplicate key errors
        }

        return conversation;
    };

    // ── Check Online Status ──────────────────────────────────
    socket.on("isOnline", async (data = {}, callback = () => { }) => {
        const targetUserId = typeof data.userId === "string"
            ? data.userId.trim()
            : typeof data.receiverId === "string"
                ? data.receiverId.trim()
                : "";

        if (!targetUserId) {
            callback({ success: false, error: "userId is required" });
            return;
        }

        try {
            const online = await presenceService.isOnline(targetUserId);
            const lastSeen = online ? null : await presenceService.getLastSeen(targetUserId);

            callback({
                success: true,
                userId: targetUserId,
                isOnline: online,
                lastSeen,
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Send Message (with rate limiting & unread counters) ──
    socket.on("message:send", async (data = {}, callback = () => { }) => {
        try {
            // ── Rate Limit Check ─────────────────────────────
            const rateResult = await socketRateLimit(
                socket.user.userId.toString(), "message_send", 10, 20
            );
            if (!rateResult.allowed) {
                callback({
                    success: false,
                    error: "Rate limit exceeded. Slow down.",
                    retryAfterMs: rateResult.retryAfterMs,
                });
                return;
            }

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

            const senderId = socket.user.userId.toString();

            // Find or create the private conversation
            const conversation = await getOrCreatePrivateConversation(senderId, receiverId);

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

            // Create message with real ObjectId conversationId
            const newMessage = await Message.create({
                senderId,
                conversationId: conversation._id,
                type: fileSource ? "document" : "text",
                content: text,
                file: file || undefined
            });

            // Update conversation's lastMessage
            conversation.lastMessage = text;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // ── Invalidate message cache ─────────────────────
            await cacheService.del(getConversationCacheKey(conversation._id.toString()));

            // ── Increment unread counter for receiver ────────
            await unreadService.increment(receiverId, conversation._id.toString());

            // ── Publish via Pub/Sub (reaches all servers) ────
            await publish(CHANNELS.MESSAGE_NEW, {
                receiverId,
                message: newMessage,
            });

            // ── Also emit directly (for same-server delivery)
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

    // ── Reply to Private Message ─────────────────────────────
    socket.on("message:reply", async (data = {}, callback = () => { }) => {
        try {
            // ── Rate Limit Check ─────────────────────────────
            const rateResult = await socketRateLimit(
                socket.user.userId.toString(), "message_reply", 10, 20
            );
            if (!rateResult.allowed) {
                callback({
                    success: false,
                    error: "Rate limit exceeded. Slow down.",
                    retryAfterMs: rateResult.retryAfterMs,
                });
                return;
            }

            const { receiverId, parentMessageId } = data;
            const text = typeof data.text === "string" ? data.text.trim() : "";
            const fileSource = data.file;

            if (!receiverId) {
                callback({ success: false, error: "receiverId is required" });
                return;
            }

            if (!parentMessageId) {
                callback({ success: false, error: "parentMessageId is required" });
                return;
            }

            if (!text) {
                callback({ success: false, error: "text is required" });
                return;
            }

            // Verify parent message exists
            const parentMessage = await Message.findById(parentMessageId);
            if (!parentMessage) {
                callback({ success: false, error: "Parent message not found" });
                return;
            }

            const senderId = socket.user.userId.toString();

            // Find or create the private conversation
            const conversation = await getOrCreatePrivateConversation(senderId, receiverId);

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
                senderId,
                conversationId: conversation._id,
                type: fileSource ? "document" : "text",
                content: text,
                file: file || undefined,
                parentMessageId,
            });

            conversation.lastMessage = text;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            await cacheService.del(getConversationCacheKey(conversation._id.toString()));
            await unreadService.increment(receiverId, conversation._id.toString());

            const populatedMessage = await Message.findById(newMessage._id).populate("parentMessageId").lean();

            await publish(CHANNELS.MESSAGE_REPLY, {
                receiverId,
                message: populatedMessage,
            });

            emitters.notifyNewMessageReply(receiverId, populatedMessage);

            callback({
                success: true,
                message: populatedMessage
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    });

    // ── Get Messages (with Redis caching) ────────────────────
    socket.on("messages:get", async (data = {}, callback = () => { }) => {
        try {
            const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : "";
            const conversationId = typeof data.conversationId === "string" ? data.conversationId.trim() : "";

            let resolvedConversationId = conversationId;

            // If only receiverId is provided, look up the conversation
            if (!resolvedConversationId && receiverId) {
                const conversation = await Conversation.findOne({
                    type: "private",
                    participants: { $all: [socket.user.userId.toString(), receiverId] },
                    groupId: null,
                });
                resolvedConversationId = conversation?._id?.toString() || "";
            }

            if (!resolvedConversationId) {
                callback({ success: false, error: "receiverId or conversationId is required" });
                return;
            }

            const cacheKey = getConversationCacheKey(resolvedConversationId);

            // ── Cache-aside pattern ──────────────────────────
            const { data: messages, source } = await cacheService.getOrSet(
                cacheKey,
                MESSAGE_CACHE_TTL,
                async () => {
                    return Message.aggregate([
                        { $match: { conversationId: new mongoose.Types.ObjectId(resolvedConversationId) } },
                        { $sort: { createdAt: -1 } },
                    ]);
                }
            );

            callback({
                success: true,
                messages,
                source,
            });
        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    });

    // ── Update Message ───────────────────────────────────────
    socket.on("message:update", async (data = {}, callback = () => { }) => {
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
                { content: text, edited: true },
                { new: true }
            );

            if (!updated) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            // Invalidate cache
            if (updated?.conversationId) {
                await cacheService.del(
                    getConversationCacheKey(updated.conversationId.toString())
                );
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

    // ── Delete Message ───────────────────────────────────────
    socket.on("message:delete", async (data = {}, callback = () => { }) => {
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

            // Invalidate cache
            if (message?.conversationId) {
                await cacheService.del(
                    getConversationCacheKey(message.conversationId.toString())
                );
            }

            io.emit("message:deleted", { messageId });

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Read Receipt (with unread counter reset + Pub/Sub) ───
    socket.on("message:read", async (data = {}, callback = () => { }) => {
        try {
            const messageId = typeof data.messageId === "string" ? data.messageId.trim() : "";
            const conversationId = typeof data.conversationId === "string" ? data.conversationId.trim() : "";

            if (!messageId) {
                callback({ success: false, error: "messageId is required" });
                return;
            }

            const message = await Message.findById(messageId);

            if (!message) {
                callback({ success: false, error: "Message not found" });
                return;
            }

            const userId = socket.user.userId.toString();
            const resolvedConversationId = conversationId || message.conversationId?.toString();

            // Update lastReadMessageId in ConversationMember
            if (resolvedConversationId) {
                await ConversationMember.findOneAndUpdate(
                    { conversationId: resolvedConversationId, userId },
                    { lastReadMessageId: message._id }
                );

                // Reset unread counter for this conversation
                await unreadService.reset(userId, resolvedConversationId);
            }

            // Notify the sender via Pub/Sub (cross-server)
            await publish(CHANNELS.READ_RECEIPT, {
                senderId: message.senderId.toString(),
                messageId: message._id.toString(),
            });

            // Also emit directly
            io.to(message.senderId.toString()).emit("message:read:update", {
                messageId: message._id
            });

            callback({ success: true, message });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Get Unread Counts ────────────────────────────────────
    socket.on("unread:get", async (_, callback = () => { }) => {
        try {
            const userId = socket.user.userId.toString();
            const counts = await unreadService.getAllCounts(userId);
            const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

            callback({
                success: true,
                counts,
                total,
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Get Conversations ────────────────────────────────────
    socket.on("conversations:get", async (_, callback = () => { }) => {
        try {
            const userId = socket.user.userId.toString();
            const userObjectId = new mongoose.Types.ObjectId(userId);

            const conversations = await Conversation.aggregate([
                {
                    $match: {
                        participants: userObjectId,
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "participants",
                        foreignField: "_id",
                        as: "participantDetails"
                    }
                },
                {
                    $lookup: {
                        from: "groups",
                        localField: "groupId",
                        foreignField: "_id",
                        as: "group"
                    }
                },
                {
                    $unwind: {
                        path: "$group",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { lastMessageAt: -1 }
                },
                {
                    $project: {
                        type: 1,
                        lastMessage: 1,
                        lastMessageAt: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        groupId: 1,
                        group: {
                            _id: "$group._id",
                            name: "$group.name",
                            description: "$group.description",
                            avatar: "$group.avatar"
                        },
                        participants: {
                            $map: {
                                input: "$participantDetails",
                                as: "p",
                                in: {
                                    _id: "$$p._id",
                                    name: "$$p.name",
                                    username: "$$p.username",
                                    avatar: "$$p.avatar"
                                }
                            }
                        },
                        otherParticipant: {
                            $cond: {
                                if: { $eq: ["$type", "private"] },
                                then: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$participantDetails",
                                                as: "p",
                                                cond: { $ne: ["$$p._id", userObjectId] }
                                            }
                                        },
                                        0
                                    ]
                                },
                                else: null
                            }
                        }
                    }
                }
            ]);

            callback({
                success: true,
                conversations
            });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Typing Indicators (via Pub/Sub) ──────────────────────
    socket.on("typing:start", async (data = {}) => {
        const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : "";
        if (!receiverId) return;

        typingTargetId = receiverId;

        // Publish to Pub/Sub for cross-server delivery
        await publish(CHANNELS.TYPING, {
            userId: socket.user.userId.toString(),
            targetId: receiverId,
            action: "start",
        });

        // Also emit directly for same-server
        emitToUser(receiverId, "typing:start", {
            userId: socket.user.userId
        });
    });

    socket.on("typing:stop", async (data = {}) => {
        const receiverId = typeof data.receiverId === "string" ? data.receiverId.trim() : typingTargetId;
        if (!receiverId) return;

        await publish(CHANNELS.TYPING, {
            userId: socket.user.userId.toString(),
            targetId: receiverId,
            action: "stop",
        });

        emitToUser(receiverId, "typing:stop", {
            userId: socket.user.userId
        });

        if (typingTargetId === receiverId) {
            typingTargetId = null;
        }
    });

    // ── Get Users (cached) ───────────────────────────────────
    socket.on("users:get", async (_, callback = () => { }) => {
        try {
            const { data: users } = await cacheService.getOrSet(
                cacheService.KEYS.USERS_ALL,
                cacheService.TTL.MEDIUM,
                async () => User.find().select("name avatar")
            );

            callback({ success: true, users });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // ── Join / Leave Room ────────────────────────────────────
    socket.on("joinRoom", (roomId) => {
        if (roomId) socket.join(roomId);
        console.log(`User ${socket.user.userId} joined room ${roomId}`);
    });

    socket.on("leaveRoom", (roomId) => {
        if (roomId) socket.leave(roomId);
        console.log(`User ${socket.user.userId} left room ${roomId}`);
    });
}