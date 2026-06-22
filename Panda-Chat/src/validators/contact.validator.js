import { body, param } from "express-validator";

export const createContactValidation = [
    body("contactId")
        .notEmpty()
        .withMessage("Contact ID is required")
        .isMongoId()
        .withMessage("Contact ID must be a valid Mongo ID"),

    body("customName")
        .optional({ nullable: true })
        .trim()
        .isString()
        .withMessage("Custom name must be a string")
        .isLength({ max: 50 })
        .withMessage("Custom name must be at most 50 characters"),

    body("isFavorite")
        .optional()
        .isBoolean()
        .withMessage("isFavorite must be a boolean value"),

    body("isBlocked")
        .optional()
        .isBoolean()
        .withMessage("isBlocked must be a boolean value"),

    body("isMuted")
        .optional()
        .isBoolean()
        .withMessage("isMuted must be a boolean value")
];

export const updateContactValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid contact ID parameter"),

    body("customName")
        .optional({ nullable: true })
        .trim()
        .isString()
        .withMessage("Custom name must be a string")
        .isLength({ max: 50 })
        .withMessage("Custom name must be at most 50 characters"),

    body("isFavorite")
        .optional()
        .isBoolean()
        .withMessage("isFavorite must be a boolean value"),

    body("isBlocked")
        .optional()
        .isBoolean()
        .withMessage("isBlocked must be a boolean value"),

    body("isMuted")
        .optional()
        .isBoolean()
        .withMessage("isMuted must be a boolean value")
];

export const deleteContactValidation = [
    param("id")
        .isMongoId()
        .withMessage("Invalid contact ID parameter")
];
