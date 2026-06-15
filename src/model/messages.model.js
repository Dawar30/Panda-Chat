import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversations",
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },

    type: {
        type: String,
        enum: [
            "text",
            "image",
            "video",
            "audio",
            "document"
        ],
        default: "text"
    },

    content: {
        type: String
    },

    file: {
        public_id: String,
        url: String,
        size: Number,
        mimeType: String
    },

    edited: {
        type: Boolean,
        default: false
    },

    deletedForEveryone: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

messageSchema.index({
    conversationId: 1,
    createdAt: -1
});

messageSchema.index({
    senderId: 1
});

export default mongoose.model(
    "Messages",
    messageSchema
);