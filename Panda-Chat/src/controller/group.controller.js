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
		await cacheService.del(cacheService.KEYS.GROUPS_ALL);

		res.status(201).json({ success: true, message: "Group created", data: newGroup });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const getGroups = async (req, res) => {
	try {
		const { data: groups, source } = await cacheService.getOrSet(
			cacheService.KEYS.GROUPS_ALL,
			cacheService.TTL.MEDIUM, // 120s
			async () => Groups.find()
		);

		res.status(200).json({ success: true, data: groups, source });
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
			cacheService.del(cacheService.KEYS.GROUPS_ALL),
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
			cacheService.del(cacheService.KEYS.GROUPS_ALL),
		]);

		res.status(200).json({ success: true, message: "Group deleted" });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
		console.log(error);
	}
};
