import {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    deleteGroup
} from "../controller/group.controller.js";
import { varifyToken, allowRoles } from "../middleware/authMiddleware.js"
import express from "express";
const router = express.Router();

router.post("/", varifyToken, createGroup);
router.get("/", varifyToken, getGroups);
router.get("/:id", varifyToken, getGroupById);
router.put("/:id", varifyToken, updateGroup);
router.delete("/:id", varifyToken, deleteGroup);

export default router;