import express from "express";
import {
    createConversation,
    getConversations,
    getConversationById,
    updateConversation,
    deleteConversation
} from "../controller/conversation.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";
import { handleValidationErrors } from "../validators/index.js";
import {
    createConversationValidation,
    updateConversationValidation,
    deleteConversationValidation
} from "../validators/conversation.validator.js";

const router = express.Router();

router.post("/", varifyToken, createConversationValidation, handleValidationErrors, createConversation);
router.get("/", varifyToken, getConversations);
router.get("/:id", varifyToken, getConversationById);
router.put("/:id", varifyToken, updateConversationValidation, handleValidationErrors, updateConversation);
router.delete("/:id", varifyToken, deleteConversationValidation, handleValidationErrors, deleteConversation);

export default router;
