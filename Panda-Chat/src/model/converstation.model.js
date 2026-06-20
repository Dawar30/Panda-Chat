import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["private", "group"],
        required: true
    },

    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    }],

    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Groups",
        default: null
    },

    lastMessage: {
        type: String
    },

    lastMessageAt: {
        type: Date
    }

}, { timestamps: true });

conversationSchema.index({
    participants: 1
});

conversationSchema.index({
    lastMessageAt: -1
});

export default mongoose.model(
    "Conversations",
    conversationSchema
);