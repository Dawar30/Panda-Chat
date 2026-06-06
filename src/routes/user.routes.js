import { signUp , logIn, logout, getAllUsers} from "../controller/user.controller.js";
import { Router } from "express";
import { signUpValidation, logInValidation, handleValidationErrors } from "../validators/user.validator.js";
import { varifyToken,allowRoles } from "../middleware/authMiddleware.js"
const router = Router()

router.post("/signup", signUpValidation, handleValidationErrors,signUp)
router.post("/login", logInValidation, handleValidationErrors, logIn)
router.post("/logout", varifyToken, logout)
router.get("/all", varifyToken,getAllUsers)

export default router