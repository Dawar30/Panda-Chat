import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
        index: true
    },

    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
        index: true
    },

    customName: {
        type: String,
        default: null  // User's custom display name for this contact
    },

    isFavorite: {
        type: Boolean,
        default: false
    },

    isBlocked: {
        type: Boolean,
        default: false
    },

    isMuted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

// Ensure a user can't add themselves or duplicate contacts
contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);