import { signUp , logIn, logout, getAllUsers} from "../controller/user.controller.js";
import { Router } from "express";
import { signUpValidation, logInValidation, handleValidationErrors } from "../validators/user.validator.js";
import { varifyToken,allowRoles } from "../middleware/authMiddleware.js"
import { loginLimiter, signupLimiter } from "../middleware/rateLimiter.js";
const router = Router()

router.post("/signup", signupLimiter, signUpValidation, handleValidationErrors,signUp)
router.post("/login", loginLimiter, logInValidation, handleValidationErrors, logIn)
router.post("/logout", varifyToken, logout)
router.get("/all", varifyToken,getAllUsers)

export default router