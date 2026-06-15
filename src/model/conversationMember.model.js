import mongoose from "mongoose";

const conversationMemberSchema =
new mongoose.Schema({

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversations",
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },

    lastReadMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Messages",
        default: null
    },

    isMuted: {
        type: Boolean,
        default: false
    },

    isArchived: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

conversationMemberSchema.index({
    conversationId: 1,
    userId: 1
}, {
    unique: true
});

conversationMemberSchema.index({
    userId: 1
});

export default mongoose.model(
    "ConversationMembers",
    conversationMemberSchema
);