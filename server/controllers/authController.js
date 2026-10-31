
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_KEY,
    {
      expiresIn: "1d",
      issuer: "ems-api",
      algorithm: "HS256",
    }
  );
};

const getActiveEmployee = async (user) => {
  return Employee.findOne({
    email: user.email.trim().toLowerCase(),
  }).collation({
    locale: "en",
    strength: 2,
  });
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_KEY) {
      console.error("JWT_KEY is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Explicitly select the password because the model hides it by default.
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (
      typeof user.password !== "string" ||
      !user.password
    ) {
      console.error("Login failed: stored password hash is missing");

      return res.status(500).json({
        success: false,
        message: "Account credentials are not configured correctly",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role === "employee") {
      const employee = await getActiveEmployee(user);

      if (!employee || employee.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your employee account is inactive or unavailable",
        });
      }
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
};

// GET /api/auth/verify
export const verify = async (req, res) => {
  try {
    // verifyUser middleware attaches the current database user to req.user.
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (user.role === "employee") {
      const employee = await getActiveEmployee(user);

      if (!employee || employee.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your employee account is inactive",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Token verified successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify token",
    });
  }
};
