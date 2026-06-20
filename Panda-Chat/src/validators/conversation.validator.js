import { body, param } from "express-validator";

export const createConversationValidation = [
    body("type")
        .notEmpty()
        .withMessage("Conversation type is required")
        .isIn(["private", "group"])
        .withMessage("Conversation type must be either 'private' or 'group'"),
    
    body("participants")
        .optional()
        .isArray()
        .withMessage("Participants must be an array"),
    
    body("participants.*")
        .isMongoId()
        .withMessage("Each participant must be a valid Mongo ID"),
    
    body("groupId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("Group ID must be a valid Mongo ID"),
    
    body("lastMessage")
        .optional()
        .isString()
        .withMessage("Last message must be a string"),
    
    body("lastMessageAt")
        .optional()
        .isISO8601()
        .withMessage("Last message timestamp must be a valid ISO8601 date")
];

export const updateConversationValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid conversation ID parameter"),
    
    body("type")
        .optional()
        .isIn(["private", "group"])
        .withMessage("Conversation type must be either 'private' or 'group'"),
    
    body("participants")
        .optional()
        .isArray()
        .withMessage("Participants must be an array"),
    
    body("participants.*")
        .isMongoId()
        .withMessage("Each participant must be a valid Mongo ID"),
    
    body("groupId")
        .optional({ nullable: true })
        .isMongoId()
        .withMessage("Group ID must be a valid Mongo ID"),
    
    body("lastMessage")
        .optional()
        .isString()
        .withMessage("Last message must be a string"),
    
    body("lastMessageAt")
        .optional()
        .isISO8601()
        .withMessage("Last message timestamp must be a valid ISO8601 date")
];

export const deleteConversationValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid conversation ID parameter")
];
