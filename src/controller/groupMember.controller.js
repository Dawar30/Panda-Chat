import mongoose from "mongoose";
import GroupMember from "../model/groupMembers.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildGroupMemberPipeline = (matchStage = null) => {
    const pipeline = [];

    if (matchStage) {
        pipeline.push({ $match: matchStage });
    }

    pipeline.push(
        {
            $lookup: {
                from: "groups",
                localField: "groupId",
                foreignField: "_id",
                as: "groupId"
            }
        },
        {
            $unwind: {
                path: "$groupId",
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
            $project: {
                role: 1,
                createdAt: 1,
                updatedAt: 1,
                groupId: {
                    _id: "$groupId._id",
                    name: "$groupId.name",
                    description: "$groupId.description",
                    avatar: "$groupId.avatar"
                },
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

export const createGroupMember = async (req, res) => {
    try {
        const { groupId, userId, role = "member" } = req.body;

        if (!groupId || !userId || !isValidObjectId(groupId) || !isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Valid groupId and userId are required" });
        }

        const groupMember = await GroupMember.create({ groupId, userId, role });
        res.status(201).json({ success: true, message: "Group member created", data: groupMember });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getGroupMembers = async (req, res) => {
    try {
        const members = await GroupMember.aggregate(buildGroupMemberPipeline());

        res.status(200).json({ success: true, data: members });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getGroupMemberById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const [member] = await GroupMember.aggregate(
            buildGroupMemberPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        if (!member) {
            return res.status(404).json({ success: false, message: "Group member not found" });
        }

        res.status(200).json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const updateGroupMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const updatedMember = await GroupMember.findByIdAndUpdate(
            id,
            { ...(role !== undefined && { role }) },
            { new: true }
        );

        if (!updatedMember) {
            return res.status(404).json({ success: false, message: "Group member not found" });
        }

        const [memberWithRelations] = await GroupMember.aggregate(
            buildGroupMemberPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        res.status(200).json({ success: true, message: "Group member updated", data: memberWithRelations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const deleteGroupMember = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const deletedMember = await GroupMember.findByIdAndDelete(id);
        if (!deletedMember) {
            return res.status(404).json({ success: false, message: "Group member not found" });
        }

        res.status(200).json({ success: true, message: "Group member deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
