import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Groups",
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },

    role: {
        type: String,
        enum: ["member", "admin"],
        default: "member"
    }

}, { timestamps: true });

groupMemberSchema.index({
    groupId: 1,
    userId: 1
}, {
    unique: true
});

groupMemberSchema.index({
    userId: 1
});

export default mongoose.model(
    "GroupMembers",
    groupMemberSchema
);