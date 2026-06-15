import user from "../model/user.model.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { generateTokenAndSetCookie } from "../utils/generateTokenandSetCookies.js";

export const signUp = async (req, res) => {
    try {
        const { username, fullName, email, password, avatar } = req.body;

        const checkUser = await user.find({ email });
        if (checkUser.length != 0) {
            return res.status(400).json({ message: "User already exists!" })
        }

        const hashedPassword = await bcrypt.hash(password, Number(process.env.saltRounds));
        const newUser = await user.create({
            username,
            name: fullName,
            email,
            password: hashedPassword,
            avatar,
            roles: ["user"],
            lastSeen: new Date()
        })
        res.status(200).json({ success: true, message: "successfuly created user", data: { name: newUser.name} });


    } catch (error) {
        res.status(500).json({ message: "Can't create user!" })
        console.log(error)
    }
}

export const logIn = async (req, res) => {
    try {
        const {email, password } = req.body
        const checkUser = await user.find({email}).select("+password");
        if (checkUser.length == 0){
            return res.status(401).json({message : "User not found"})
        }
        const validateUser = await bcrypt.compare(password,checkUser[0].password)
        if(!validateUser){
            return res.status(401).json({message: "Wrong password!"})
        }
        const token = generateTokenAndSetCookie(res, checkUser[0]._id,checkUser[0].roles)
        res.status(200).json({ success: true, token })
    } catch (error) {
        res.status(500).json({success: false, message :"Internal server error", error: error.message})
        console.log(error)
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await user.find();
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
}