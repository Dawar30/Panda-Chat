import { body, validationResult } from 'express-validator';
// Validation rules for user sign up
export const signUpValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 50 }) 
        .withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Full name can only contain letters and spaces'),
    
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('phoneNumber')
        .optional({ nullable: true })
        .trim()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('avatar')
        .optional({ nullable: true })
        .trim()
        .isString()
        .withMessage('Avatar must be a string'),
    body('isContact')
        .optional()
        .isBoolean()
        .withMessage('isContact must be a boolean value'),
    body('roles')
        .optional()
        .isArray()
        .withMessage('Roles must be an array of strings')
        .custom((value) => {
            const validRoles = ["user", "admin", "super-admin"];
            if (!value.every(role => validRoles.includes(role))) {
                throw new Error('Invalid role specified');
            }
            return true;
        })
];
// Validation rules for user login
export const logInValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];
// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};
