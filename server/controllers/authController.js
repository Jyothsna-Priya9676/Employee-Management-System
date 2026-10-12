
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_ISSUER = "ems-api";
const JWT_EXPIRES_IN = "1h";

const login = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        // 1. Validate input
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });
        }

        // 2. Validate email length
        const normalizedEmail = email.trim().toLowerCase();

        if (normalizedEmail.length > 254 || password.length > 1024) {
            return res.status(400).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // 3. Ensure the JWT secret is configured
        if (!process.env.JWT_KEY) {
            console.error("JWT_KEY is not configured");

            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }

        // 4. Find user and explicitly select the password hash
        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        // Use the same message for unknown email and wrong password
        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // 5. Compare the supplied password with the stored hash
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // 6. Create JWT with the same issuer used by authMiddleware
        const token = jwt.sign(
            {
                _id: user._id.toString()
            },
            process.env.JWT_KEY,
            {
                expiresIn: JWT_EXPIRES_IN,
                issuer: JWT_ISSUER,
                algorithm: "HS256"
            }
        );

        // 7. Return only public user information
        return res.status(200).json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// This route should be protected by verifyUser middleware.
const verify = (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required"
        });
    }

    return res.status(200).json({
        success: true,
        user: req.user
    });
};

export { login, verify };
