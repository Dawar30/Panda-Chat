import mongoose from "mongoose";

const users = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: null },
  roles: { type: [String], enum: ["user", "admin", "super-admin", "customer"], default: ["user"] },
  roleLevel: { type: Number, default: 1 },
}, { timestamps: true })

const user = new mongoose.model("Users", users)

export default user