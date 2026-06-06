import mongoose from "mongoose";
import { Group } from "../model/group.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createGroup = async (req, res) => {
	try {
		const { name, Description, members = [], admins = [] } = req.body;

		if (!name) {
			return res.status(400).json({ success: false, message: "Group name is required" });
		}

		const creatorId = req.user?.userId;
		const adminList = admins.length ? admins : (creatorId ? [creatorId] : []);
		if (!adminList.length) {
			return res.status(400).json({ success: false, message: "At least one admin is required" });
		}

		const memberSet = new Set([...(members || []), ...adminList]);

		const newGroup = await Group.create({
			name,
			Description,
			members: Array.from(memberSet),
			admins: adminList
		});

		res.status(201).json({ success: true, message: "Group created", data: newGroup });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const getGroups = async (req, res) => {
	try {
		const groups = await Group.find();
		res.status(200).json({ success: true, data: groups });
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

		const group = await Group.findById(id);
		if (!group) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

		res.status(200).json({ success: true, data: group });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
	}
};

export const updateGroup = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, Description, members, admins } = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "Invalid group id" });
		}

		const updatedGroup = await Group.findByIdAndUpdate(
			id,
			{
				...(name !== undefined && { name }),
				...(Description !== undefined && { Description }),
				...(members !== undefined && { members }),
				...(admins !== undefined && { admins })
			},
			{ new: true }
		);

		if (!updatedGroup) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

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

		const deletedGroup = await Group.findByIdAndDelete(id);
		if (!deletedGroup) {
			return res.status(404).json({ success: false, message: "Group not found" });
		}

		res.status(200).json({ success: true, message: "Group deleted" });
	} catch (error) {
		res.status(500).json({ success: false, message: "Internal server error", error: error.message });
		console.log(error);
	}
};
