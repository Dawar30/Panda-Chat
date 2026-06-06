import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    Description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true }],
}, { timestamps: true });

export const Group = mongoose.model("Group", groupSchema);
