import express from "express";
import {
    createConversationMember,
    getConversationMembers,
    getConversationMemberById,
    updateConversationMember,
    deleteConversationMember
} from "../controller/conversationMember.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";
import { handleValidationErrors } from "../validators/index.js";
import {
    createConversationMemberValidation,
    updateConversationMemberValidation,
    deleteConversationMemberValidation
} from "../validators/conversationMember.validator.js";

const router = express.Router();

router.post("/", varifyToken, createConversationMemberValidation, handleValidationErrors, createConversationMember);
router.get("/", varifyToken, getConversationMembers);
router.get("/:id", varifyToken, getConversationMemberById);
router.put("/:id", varifyToken, updateConversationMemberValidation, handleValidationErrors, updateConversationMember);
router.delete("/:id", varifyToken, deleteConversationMemberValidation, handleValidationErrors, deleteConversationMember);

export default router;
