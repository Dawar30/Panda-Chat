import mongoose from "mongoose";
import Contact from "../model/contact.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildContactPipeline = (matchStage = null) => {
    const pipeline = [];

    if (matchStage) {
        pipeline.push({ $match: matchStage });
    }

    pipeline.push(
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
                from: "users",
                localField: "contactId",
                foreignField: "_id",
                as: "contactId"
            }
        },
        {
            $unwind: {
                path: "$contactId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                customName: 1,
                isFavorite: 1,
                isBlocked: 1,
                isMuted: 1,
                createdAt: 1,
                updatedAt: 1,
                userId: {
                    _id: "$userId._id",
                    username: "$userId.username",
                    name: "$userId.name",
                    email: "$userId.email",
                    avatar: "$userId.avatar"
                },
                contactId: {
                    _id: "$contactId._id",
                    username: "$contactId.username",
                    name: "$contactId.name",
                    email: "$contactId.email",
                    avatar: "$contactId.avatar"
                }
            }
        }
    );

    return pipeline;
};

export const createContact = async (req, res) => {
    try {
        const { contactId, customName } = req.body;
        const userId = req.user.userId;

        if (!isValidObjectId(contactId)) {
            return res.status(400).json({ success: false, message: "Valid contactId is required" });
        }

        if (userId === contactId) {
            return res.status(400).json({ success: false, message: "You cannot add yourself as a contact" });
        }

        const contact = await Contact.create({ userId, contactId, customName, isFavorite: false, isBlocked: false, isMuted: false });
        res.status(201).json({ success: true, message: "Contact created", data: contact });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "Contact already exists" });
        }
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getContacts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const search = req.query.search ? req.query.search.trim() : "";

        const pipeline = buildContactPipeline({ userId: new mongoose.Types.ObjectId(userId) });

        // Apply regex search on populated contact fields after $lookup
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pipeline.push({
                $match: {
                    $or: [
                        { "contactId.phoneNumber": { $regex: escapedSearch, $options: "i" } },
                        { customName: { $regex: escapedSearch, $options: "i" } }
                    ]
                }
            });
        }

        // Get total count from a parallel pipeline with $count
        const countPipeline = [...pipeline, { $count: "total" }];
        const [countResult] = await Contact.aggregate(countPipeline);
        const total = countResult ? countResult.total : 0;

        pipeline.push({ $skip: skip }, { $limit: limit });
        const contacts = await Contact.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: contacts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const [contact] = await Contact.aggregate(
            buildContactPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        if (!contact) {
            return res.status(404).json({ success: false, message: "Contact not found" });
        }

        res.status(200).json({ success: true, data: contact });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { customName, isFavorite, isBlocked, isMuted } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            {
                ...(customName !== undefined && { customName }),
                ...(isFavorite !== undefined && { isFavorite }),
                ...(isBlocked !== undefined && { isBlocked }),
                ...(isMuted !== undefined && { isMuted })
            },
            { new: true }
        );

        if (!updatedContact) {
            return res.status(404).json({ success: false, message: "Contact not found" });
        }

        const [contactWithRelations] = await Contact.aggregate(
            buildContactPipeline({ _id: new mongoose.Types.ObjectId(id) })
        );

        res.status(200).json({ success: true, message: "Contact updated", data: contactWithRelations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid id" });
        }

        const deletedContact = await Contact.findByIdAndDelete(id);
        if (!deletedContact) {
            return res.status(404).json({ success: false, message: "Contact not found" });
        }

        res.status(200).json({ success: true, message: "Contact deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
