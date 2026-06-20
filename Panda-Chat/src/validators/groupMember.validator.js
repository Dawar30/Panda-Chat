import { body, param } from "express-validator";

export const createGroupMemberValidation = [
    body("groupId")
        .notEmpty()
        .withMessage("Group ID is required")
        .isMongoId()
        .withMessage("Group ID must be a valid Mongo ID"),
    
    body("userId")
        .notEmpty()
        .withMessage("User ID is required")
        .isMongoId()
        .withMessage("User ID must be a valid Mongo ID"),
    
    body("role")
        .optional()
        .isIn(["member", "admin"])
        .withMessage("Role must be either 'member' or 'admin'")
];

export const updateGroupMemberValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid group member ID parameter"),
    
    body("role")
        .optional()
        .isIn(["member", "admin"])
        .withMessage("Role must be either 'member' or 'admin'")
];

export const deleteGroupMemberValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid group member ID parameter")
];
