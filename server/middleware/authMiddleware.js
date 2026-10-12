
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Require the exact Bearer token format
        if (
            typeof authHeader !== "string" ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        // The secret must be configured
        if (!process.env.JWT_KEY) {
            console.error("JWT_KEY is not configured");

            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }

        // Verify token signature, expiry and issuer
        const decoded = jwt.verify(
            token,
            process.env.JWT_KEY,
            {
                issuer: "ems-api",
                algorithms: ["HS256"]
            }
        );

        if (
            !decoded ||
            typeof decoded !== "object" ||
            typeof decoded._id !== "string"
        ) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token"
            });
        }

        // Always load the current user and role from the database
        const user = await User.findById(decoded._id)
            .select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token"
            });
        }

        req.user = user;

        return next();

    } catch (error) {
        if (error.name !== "JsonWebTokenError" &&
            error.name !== "TokenExpiredError" &&
            error.name !== "CastError") {
            console.error("Authentication middleware error:", error);
        }

        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }
};

export default verifyUser;
