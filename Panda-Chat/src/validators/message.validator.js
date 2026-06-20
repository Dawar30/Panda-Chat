import { body, validationResult  } from "express-validator";
export const sendMessageValidation = [
    body("content")
        .notEmpty()
        .withMessage("Message content is required")
        .isLength({ max: 500 })
        .withMessage("Message content cannot exceed 500 characters"),
    body("recipientId")
        .notEmpty()
        .withMessage("Recipient ID is required")
];
export const updateMessageValidation = [
    body("content")
        .notEmpty()
        .withMessage("Message content is required")
        .isLength({ max: 500 })
        .withMessage("Message content cannot exceed 500 characters"),
];

export const deleteMessageValidation = [
    body("messageId")
        .notEmpty()
        .withMessage("Message ID is required")
];
