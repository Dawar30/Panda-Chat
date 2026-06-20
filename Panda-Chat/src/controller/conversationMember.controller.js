import mongoose from "mongoose";
import ConversationMember from "../model/conversationMember.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildConversationMemberPipeline = (matchStage = null) => {
    const pipeline = [];

    if (matchStage) {
        pipeline.push({ $match: matchStage });
    }

    pipeline.push(
        {
            $lookup: {
                from: "conversations",
                localField: "conversationId",
                foreignField: "_id",
                as: "conversationId"
            }
        },
        {
            $unwind: {
                path: "$conversationId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId"
            }
        },
        {
            $unwind: {
                path: "$userId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "messages",
                localField: "lastReadMessageId",
                foreignField: "_id",
                as: "lastReadMessageId"
            }
        },
        {
            $unwind: {
                path: "$lastReadMessageId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                conversationId: 1,
                isMuted: 1,
                isArchived: 1,
                createdAt: 1,
                updatedAt: 1,
                lastReadMessageId: 1,
                userId: {
                    _id: "$userId._id",
                    username: "$userId.username",
                    name: "$userId.name",
                    email: "$userId.email",
                    avatar: "$userId.avatar"
                }
            }
        }
    );

    return pipeline;
};

export const createConversationMember = async (req, res) => {
    try {
        const { conversationId, userId, lastReadMessageId = null, isMuted = false, isArchived = false } = req.body;

        if (!conversationId || !userId || !isValidObjectId(conversationId) || !isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid conversationId and userId are required" });
        }

        const conversationMember = await ConversationMember.create({
            conversationId,
            userId,
            lastReadMessageId,
            isMuted,
            isArchived
        });

        res.status(201).json({ success: true, message: "Conversation member created", data: conversationMember });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getConversationMembers = async (req, res) => {
    try {
        const members = await ConversationMember.aggregate(buildConversationMemberPipeline());

        res.status(200).json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getConversationMemberById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const [member] = await ConversationMember.aggregate(
            buildConversationMemberPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        if (!member) {
            return res.status(404).json({ success: false, message: "Conversation member not found" });
        }

        res.status(200).json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const updateConversationMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { lastReadMessageId, isMuted, isArchived } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const updatedMember = await ConversationMember.findByIdAndUpdate(
            id,
            {
                ...(lastReadMessageId !== undefined && { lastReadMessageId }),
                ...(isMuted !== undefined && { isMuted }),
                ...(isArchived !== undefined && { isArchived })
            },
            { new: true }
        );

        if (!updatedMember) {
            return res.status(404).json({ success: false, message: "Conversation member not found" });
        }

        const [memberWithRelations] = await ConversationMember.aggregate(
            buildConversationMemberPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        res.status(200).json({ success: true, message: "Conversation member updated", data: memberWithRelations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const deleteConversationMember = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const deletedMember = await ConversationMember.findByIdAndDelete(id);
        if (!deletedMember) {
            return res.status(404).json({ success: false, message: "Conversation member not found" });
        }

        res.status(200).json({ success: true, message: "Conversation member deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
