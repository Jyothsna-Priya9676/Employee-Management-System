
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication token is missing",
      });
    }

    if (!process.env.JWT_KEY) {
      console.error("JWT_KEY is not configured");

      return res.status(500).json({
        success: false,
        error: "Authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY, {
      issuer: "ems-api",
      algorithms: ["HS256"],
    });

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded._id !== "string"
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid authentication token",
      });
    }

    const user = await User.findById(decoded._id).select("-password");

    if (!user || user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        error: "User account is invalid",
      });
    }

    // Inactive employees cannot access protected employee APIs.
    if (user.role === "employee") {
      const employee = await Employee.findOne({
        email: user.email.trim().toLowerCase(),
      }).collation({
        locale: "en",
        strength: 2,
      });

      if (!employee || employee.status !== "Active") {
        return res.status(403).json({
          success: false,
          error: "Your employee account is inactive",
        });
      }
    }

    req.user = user;
    return next();
  } catch (error) {
    if (
      error.name !== "JsonWebTokenError" &&
      error.name !== "TokenExpiredError" &&
      error.name !== "CastError"
    ) {
      console.error("Authentication middleware error:", error);
    }

    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

export default verifyUser;
