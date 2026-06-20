import express from "express";
import {
    createGroupMember,
    getGroupMembers,
    getGroupMemberById,
    updateGroupMember,
    deleteGroupMember
} from "../controller/groupMember.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";
import { handleValidationErrors } from "../validators/index.js";
import {
    createGroupMemberValidation,
    updateGroupMemberValidation,
    deleteGroupMemberValidation
} from "../validators/groupMember.validator.js";

const router = express.Router();

router.post("/", varifyToken, createGroupMemberValidation, handleValidationErrors, createGroupMember);
router.get("/", varifyToken, getGroupMembers);
router.get("/:id", varifyToken, getGroupMemberById);
router.put("/:id", varifyToken, updateGroupMemberValidation, handleValidationErrors, updateGroupMember);
router.delete("/:id", varifyToken, deleteGroupMemberValidation, handleValidationErrors, deleteGroupMember);

export default router;
