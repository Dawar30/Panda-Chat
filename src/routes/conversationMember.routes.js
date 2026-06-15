import express from "express";
import {
    createConversationMember,
    getConversationMembers,
    getConversationMemberById,
    updateConversationMember,
    deleteConversationMember
} from "../controller/conversationMember.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", varifyToken, createConversationMember);
router.get("/", varifyToken, getConversationMembers);
router.get("/:id", varifyToken, getConversationMemberById);
router.put("/:id", varifyToken, updateConversationMember);
router.delete("/:id", varifyToken, deleteConversationMember);

export default router;
