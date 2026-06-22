import express from "express";
import {
    createContact,
    getContacts,
    getContactById,
    updateContact,
    deleteContact
} from "../controller/contact.controller.js";
import { varifyToken } from "../middleware/authMiddleware.js";
import { handleValidationErrors } from "../validators/index.js";
import {
    createContactValidation,
    updateContactValidation,
    deleteContactValidation
} from "../validators/contact.validator.js";

const router = express.Router();

router.post("/", varifyToken, createContactValidation, handleValidationErrors, createContact);
router.get("/", varifyToken, getContacts);
router.get("/:id", varifyToken, getContactById);
router.put("/:id", varifyToken, updateContactValidation, handleValidationErrors, updateContact);
router.delete("/:id", varifyToken, deleteContactValidation, handleValidationErrors, deleteContact);

export default router;
