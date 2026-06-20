import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    avatar: {
        type: String
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },

    memberCount: {
        type: Number,
        default: 1
    }

}, { timestamps: true });

export default mongoose.model("Groups", groupSchema);