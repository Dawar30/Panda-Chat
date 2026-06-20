import {
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    deleteGroup
} from "../controller/group.controller.js";
import { varifyToken, allowRoles } from "../middleware/authMiddleware.js"
import express from "express";
import { handleValidationErrors } from "../validators/index.js";
import {
    createGroupValidation,
    updateGroupValidation,
    deleteGroupValidation
} from "../validators/group.validator.js";

const router = express.Router();

router.post("/", varifyToken, createGroupValidation, handleValidationErrors, createGroup);
router.get("/", varifyToken, getGroups);
router.get("/:id", varifyToken, getGroupById);
router.put("/:id", varifyToken, updateGroupValidation, handleValidationErrors, updateGroup);
router.delete("/:id", varifyToken, deleteGroupValidation, handleValidationErrors, deleteGroup);

export default router;