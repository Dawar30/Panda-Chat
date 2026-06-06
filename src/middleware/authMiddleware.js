import jwt from "jsonwebtoken"

export const varifyToken = async (req , res , next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({Message: "Access denied"})
    }
    try {
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
