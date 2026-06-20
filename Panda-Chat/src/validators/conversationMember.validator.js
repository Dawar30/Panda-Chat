import { body, param } from "express-validator";

export const createConversationMemberValidation = [
    body("conversationId")
        .notEmpty()
        .withMessage("Conversation ID is required")
        .isMongoId()
        .withMessage("Conversation ID must be a valid Mongo ID"),
    
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("User ID must be a valid Mongo ID"),
    
    body("lastReadMessageId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("Last read message ID must be a valid Mongo ID"),
    
    body("isMuted")
        .optional()
        .isBoolean()
        .withMessage("isMuted must be a boolean value"),
    
    body("isArchived")
        .optional()
        .isBoolean()
        .withMessage("isArchived must be a boolean value")
];

export const updateConversationMemberValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid conversation member ID parameter"),
    
    body("lastReadMessageId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("Last read message ID must be a valid Mongo ID"),
    
    body("isMuted")
        .optional()
        .isBoolean()
        .withMessage("isMuted must be a boolean value"),
    
    body("isArchived")
        .optional()
        .isBoolean()
        .withMessage("isArchived must be a boolean value")
];

export const deleteConversationMemberValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid conversation member ID parameter")
];
