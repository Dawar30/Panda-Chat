import { body, param } from "express-validator";

export const createGroupValidation = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Group name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Group name must be between 2 and 100 characters"),
    
    body("description")
        .optional()
        .trim()
        .isString()
        .withMessage("Description must be a string"),
    
    body("avatar")
        .optional()
        .trim()
        .isString()
        .withMessage("Avatar must be a string")
];

export const updateGroupValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid group ID parameter"),
    
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Group name must be between 2 and 100 characters"),
    
    body("description")
        .optional()
        .trim()
        .isString()
        .withMessage("Description must be a string"),
    
    body("avatar")
        .optional()
        .trim()
        .isString()
        .withMessage("Avatar must be a string")
];

export const deleteGroupValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid group ID parameter")
];
