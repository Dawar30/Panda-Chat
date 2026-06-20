import express from "express";
import {
    createConversation,
    getConversations,
    getConversationById,
    updateConversation,
    deleteConversation
} from "../controller/conversation.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", varifyToken, createConversation);
router.get("/", varifyToken, getConversations);
router.get("/:id", varifyToken, getConversationById);
router.put("/:id", varifyToken, updateConversation);
router.delete("/:id", varifyToken, deleteConversation);

export default router;
