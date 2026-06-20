import mongoose from "mongoose";
import Conversation from "../model/converstation.model.js";
import * as cacheService from "../services/cacheService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildConversationPipeline = (matchStage = null) => {
    const pipeline = [];

    if (matchStage) {
        pipeline.push({ $match: matchStage });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participants"
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
            $project: {
                type: 1,
                lastMessage: 1,
                lastMessageAt: 1,
                createdAt: 1,
                updatedAt: 1,
                participants: {
                    $map: {
                        input: "$participants",
                        as: "participant",
                        in: {
                            _id: "$$participant._id",
                            username: "$$participant.username",
                            name: "$$participant.name",
                            email: "$$participant.email",
                            avatar: "$$participant.avatar"
                        }
                    }
                },
                groupId: {
                    $cond: [
                        { $ifNull: ["$group", false] },
                        {
                            _id: "$group._id",
                            name: "$group.name",
                            description: "$group.description",
                            avatar: "$group.avatar"
                        },
                        null
                    ]
                }
            }
        }
    );

    return pipeline;
};

export const createConversation = async (req, res) => {
    try {
        const { type, participants = [], groupId = null, lastMessage, lastMessageAt } = req.body;

        if (!type || !["private", "group"].includes(type)) {
            return res.status(400).json({ success: false, message: "Valid conversation type is required" });
        }

        const conversation = await Conversation.create({
            type,
            participants,
            groupId,
            lastMessage,
            lastMessageAt
        });

        // Invalidate conversations cache
        await cacheService.invalidatePrefix(cacheService.KEYS.CONVERSATIONS_ALL);

        res.status(201).json({ success: true, message: "Conversation created", data: conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getConversations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const cacheKey = `${cacheService.KEYS.CONVERSATIONS_ALL}:${page}:${limit}`;

        const { data, source } = await cacheService.getOrSet(
            cacheKey,
            cacheService.TTL.MEDIUM, // 120s
            async () => {
                const total = await Conversation.countDocuments();
                const pipeline = buildConversationPipeline();
                pipeline.push({ $skip: skip }, { $limit: limit });
                const conversations = await Conversation.aggregate(pipeline);
                return { conversations, total };
            }
        );

        res.status(200).json({
            success: true,
            data: data.conversations,
            pagination: {
                page,
                limit,
                total: data.total,
                totalPages: Math.ceil(data.total / limit)
            },
            source
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getConversationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation id" });
        }

        const { data: conversation, source } = await cacheService.getOrSet(
            cacheService.KEYS.CONVERSATION(id),
            cacheService.TTL.LONG, // 300s
            async () => {
                const [conv] = await Conversation.aggregate(
                    buildConversationPipeline({ _id: new mongoose.Types.ObjectId(id) })
                );
                return conv || null;
            }
        );

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        res.status(200).json({ success: true, data: conversation, source });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const updateConversation = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, participants, groupId, lastMessage, lastMessageAt } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation id" });
        }

        const updatedConversation = await Conversation.findByIdAndUpdate(
            id,
            {
                ...(type !== undefined && { type }),
                ...(participants !== undefined && { participants }),
                ...(groupId !== undefined && { groupId }),
                ...(lastMessage !== undefined && { lastMessage }),
                ...(lastMessageAt !== undefined && { lastMessageAt })
            },
            { new: true }
        );

        if (!updatedConversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const [conversationWithRelations] = await Conversation.aggregate(
            buildConversationPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        // Invalidate caches
        await Promise.all([
            cacheService.del(cacheService.KEYS.CONVERSATION(id)),
            cacheService.invalidatePrefix(cacheService.KEYS.CONVERSATIONS_ALL),
        ]);

        res.status(200).json({ success: true, message: "Conversation updated", data: conversationWithRelations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation id" });
        }

        const deletedConversation = await Conversation.findByIdAndDelete(id);
        if (!deletedConversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        // Invalidate caches
        await Promise.all([
            cacheService.del(cacheService.KEYS.CONVERSATION(id)),
            cacheService.invalidatePrefix(cacheService.KEYS.CONVERSATIONS_ALL),
        ]);

        res.status(200).json({ success: true, message: "Conversation deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
