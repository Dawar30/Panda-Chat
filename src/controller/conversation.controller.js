import mongoose from "mongoose";
import Conversation from "../model/converstation.model.js";
import redisClient from "../../config/redis.js";

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

        res.status(201).json({ success: true, message: "Conversation created", data: conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.aggregate(buildConversationPipeline());

        res.status(200).json({ success: true, data: conversations });
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

        const [conversation] = await Conversation.aggregate(
            buildConversationPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        res.status(200).json({ success: true, data: conversation });
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

        res.status(200).json({ success: true, message: "Conversation deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
