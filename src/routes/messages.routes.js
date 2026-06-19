import {
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage
} from "../controller/messages.controller.js";
import { handleValidationErrors } from "../validators/index.js";
import {
    sendMessageValidation,
    deleteMessageValidation,
    updateMessageValidation
} from "../validators/message.validator.js";
import { varifyToken, allowRoles } from "../middleware/authMiddleware.js"
import { apiLimiter } from "../middleware/rateLimiter.js";
import { Router } from "express";
import upload from "../middleware/multer.js";

const router = Router()

// Apply API rate limiter (100 requests/minute) to all message routes
router.use(apiLimiter);

router.post("/send", varifyToken, upload.single('file'), sendMessage)
router.get("/get", varifyToken, getMessages)
router.put("/edit/:id", varifyToken, upload.single('file'), editMessage)
router.delete("/delete/:id", varifyToken, deleteMessage)

export default router