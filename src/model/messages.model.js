import mongoose from "mongoose";

const messages = new mongoose.Schema({
    conversationId: { type: String, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    message: { type: String, required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    isGroup: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    file: {
        public_id: { type: String },
        url: { type: String }
    }
}, { timestamps: true })
const Message = new mongoose.model("Messages", messages)

export default Message