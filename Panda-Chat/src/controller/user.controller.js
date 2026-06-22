import user from "../model/user.model.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { generateTokenAndSetCookie } from "../utils/generateTokenandSetCookies.js";
import * as sessionService from "../services/sessionService.js";
import * as cacheService from "../services/cacheService.js";

export const signUp = async (req, res) => {
    try {
        const { username, fullName, email, password, avatar, phoneNumber, roles } = req.body;

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
            phoneNumber: phoneNumber || null,
            roles: roles || ["user"],
            lastSeen: new Date()
        })

        // Invalidate users cache
        await cacheService.invalidatePrefix(cacheService.KEYS.USERS_ALL);

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

        // Store session in Redis
        await sessionService.storeSession(checkUser[0]._id.toString(), {
            token: token.substring(0, 20) + "...", // Store partial token for reference
            ip: req.ip || req.connection.remoteAddress || "unknown",
            userAgent: req.headers["user-agent"] || "unknown",
        });

        res.status(200).json({ success: true, token, user: {name: checkUser[0].name, email: checkUser[0].email} })
    } catch (error) {
        res.status(500).json({success: false, message :"Internal server error", error: error.message})
        console.log(error)
    }
}

export const logout = async (req, res) => {
    try {
        const token = req.cookies?.token;

        // Blacklist the JWT token in Redis
        if (token) {
            try {
                const decoded = jwt.decode(token);
                if (decoded?.exp) {
                    // TTL = remaining lifetime of the token
                    const ttlSeconds = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
                    await sessionService.blacklistToken(token, ttlSeconds);
                }
            } catch (err) {
                console.error("Token blacklist failed:", err.message);
            }

            // Delete session from Redis
            if (req.user?.userId) {
                await sessionService.deleteSession(req.user.userId.toString());
            }
        }

        res.clearCookie("token");
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const cacheKey = `${cacheService.KEYS.USERS_ALL}:${page}:${limit}`;

        // Cache-aside pattern: check Redis first, then DB
        const { data, source } = await cacheService.getOrSet(
            cacheKey,
            cacheService.TTL.MEDIUM, // 120s
            async () => {
                const total = await user.countDocuments();
                const users = await user.find().skip(skip).limit(limit);
                return { users, total };
            }
        );

        res.status(200).json({
            success: true,
            data: data.users,
            pagination: {
                page,
                limit,
                total: data.total,
                totalPages: Math.ceil(data.total / limit)
            },
            source
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error", error: error.message });
        console.log(error);
    }
}