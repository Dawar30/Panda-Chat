import express from "express";
import {
    createGroupMember,
    getGroupMembers,
    getGroupMemberById,
    updateGroupMember,
    deleteGroupMember
} from "../controller/groupMember.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", varifyToken, createGroupMember);
router.get("/", varifyToken, getGroupMembers);
router.get("/:id", varifyToken, getGroupMemberById);
router.put("/:id", varifyToken, updateGroupMember);
router.delete("/:id", varifyToken, deleteGroupMember);

export default router;
