import { body, param } from "express-validator";

export const sendMessageValidation = [
    body("conversationId")
        .notEmpty()
        .withMessage("Conversation ID is required")
        .isMongoId()
        .withMessage("Conversation ID must be a valid Mongo ID"),
    
    body("senderId")
        .notEmpty()
        .withMessage("Sender ID is required")
        .isMongoId()
        .withMessage("Sender ID must be a valid Mongo ID"),
    
    body("content")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Message content cannot exceed 500 characters"),
    
    body("type")
        .optional()
        .isIn(["text", "image", "video", "audio", "document"])
        .withMessage("Invalid message type"),
        
    body("receiverId")
        .optional()
        .isMongoId()
        .withMessage("Receiver ID must be a valid Mongo ID")
];

export const updateMessageValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid Message ID parameter"),
    body("content")
        .notEmpty()
        .withMessage("Message content is required")
        .isLength({ max: 500 })
        .withMessage("Message content cannot exceed 500 characters")
];

export const deleteMessageValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid Message ID parameter")
];

