import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId, rememberMe = false) => {

    const token = jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: "4h" });

    res.cookie("token", token, {
        httpOnly: true,
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });

    return token;
};
