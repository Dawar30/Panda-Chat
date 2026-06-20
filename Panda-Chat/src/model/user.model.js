import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index : true
    },

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    avatar: {
        type: String,
        default: null
    },

    lastSeen: {
        type: Date,
        default: Date.now
    },

    roles: {
        type: [String],
        enum: ["user", "admin", "super-admin"],
        default: ["user"]
    }

}, { timestamps: true });

export default mongoose.model("Users", userSchema);