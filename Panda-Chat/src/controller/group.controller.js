import mongoose from "mongoose";
import Groups from "../model/group.model.js";
import * as cacheService from "../services/cacheService.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createGroup = async (req, res) => {
	try {
		const { name, description, avatar } = req.body;

		if (!name) {
			return res.status(400).json({ success: false, message: "Group name is required" });
		}

		const creatorId = req.user?.userId;
		if (!creatorId) {
			return res.status(400).json({ success: false, message: "User ID is required" });
		}

		const newGroup = await Groups.create({
			name,
			description,
			avatar,
			createdBy: creatorId,
			memberCount: 1
		});

		// Invalidate groups cache
		await cacheService.invalidatePrefix(cacheService.KEYS.GROUPS_ALL);

		res.status(201).json({ success: true, message: "Group created", data: newGroup });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const getGroups = async (req, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page, 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
		const skip = (page - 1) * limit;

		const cacheKey = `${cacheService.KEYS.GROUPS_ALL}:${page}:${limit}`;

		const { data, source } = await cacheService.getOrSet(
			cacheKey,
			cacheService.TTL.MEDIUM, // 120s
			async () => {
				const total = await Groups.countDocuments();
				const groups = await Groups.find().skip(skip).limit(limit);
				return { groups, total };
			}
		);

		res.status(200).json({
			success: true,
			data: data.groups,
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

export const getGroupById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "Invalid group id" });
		}

		const { data: group, source } = await cacheService.getOrSet(
			cacheService.KEYS.GROUP(id),
			cacheService.TTL.LONG, // 300s
			async () => Groups.findById(id)
		);

		if (!group) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

		res.status(200).json({ success: true, data: group, source });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const updateGroup = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, avatar } = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "Invalid group id" });
		}

		const updatedGroup = await Groups.findByIdAndUpdate(
			id,
			{
				...(name !== undefined && { name }),
				...(description !== undefined && { description }),
				...(avatar !== undefined && { avatar })
			},
			{ new: true }
		);

		if (!updatedGroup) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

		// Invalidate caches
		await Promise.all([
			cacheService.del(cacheService.KEYS.GROUP(id)),
			cacheService.invalidatePrefix(cacheService.KEYS.GROUPS_ALL),
		]);

		res.status(200).json({ success: true, message: "Group updated", data: updatedGroup });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
		console.log(error);
	}
};

export const deleteGroup = async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "Invalid group id" });
		}

		const deletedGroup = await Groups.findByIdAndDelete(id);
		if (!deletedGroup) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

		// Invalidate caches
		await Promise.all([
			cacheService.del(cacheService.KEYS.GROUP(id)),
			cacheService.invalidatePrefix(cacheService.KEYS.GROUPS_ALL),
		]);

		res.status(200).json({ success: true, message: "Group deleted" });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
		console.log(error);
	}
};
