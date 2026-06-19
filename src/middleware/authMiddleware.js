import jwt from "jsonwebtoken"
import * as sessionService from "../services/sessionService.js";

export const varifyToken = async (req , res , next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({Message: "Access denied"})
    }
    try {
        // Check if the token has been blacklisted (e.g., after logout)
        const blacklisted = await sessionService.isBlacklisted(token);
        if (blacklisted) {
            return res.status(401).json({ message: "Token has been revoked" });
        }

        const decoded = jwt.verify(token,process.env.SECRET_KEY)
        req.user = decoded
        next()
    } catch (error) {
        res.status(401).json({message: "Invalid token!"})
    }
}

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden: insufficient permissions"
      });
    }
    next();
  };
};
