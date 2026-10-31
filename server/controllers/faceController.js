
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const DESCRIPTOR_LENGTH = 128;

// Prototype threshold only; this is not a security guarantee.
const FACE_MATCH_THRESHOLD = 0.6;

const isValidDescriptor = (descriptor) =>
    Array.isArray(descriptor) &&
    descriptor.length === DESCRIPTOR_LENGTH &&
    descriptor.every(
        (value) =>
            typeof value === "number" &&
            Number.isFinite(value) &&
            value >= -1 &&
            value <= 1
    );

const calculateDistance = (first, second) => {
    let sum = 0;

    for (let i = 0; i < DESCRIPTOR_LENGTH; i++) {
        sum += (first[i] - second[i]) ** 2;
    }

    return Math.sqrt(sum);
};

const createLoginToken = (user) => {
    if (!process.env.JWT_KEY) {
        throw new Error("JWT_KEY is not configured.");
    }

    // Match the password-login token format and authMiddleware.
    return jwt.sign(
        {
            _id: user._id.toString(),
            role: user.role,
        },
        process.env.JWT_KEY,
        {
            algorithm: "HS256",
            issuer: "ems-api",
            expiresIn: "1d",
        }
    );
};

const makeLoginUser = (user) => ({
    _id: user._id.toString(),
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
});

export const enrollFace = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "employee") {
            return res.status(403).json({
                success: false,
                message: "Only employees can enroll their face.",
            });
        }

        const { descriptor, consent } = req.body ?? {};

        if (consent !== true) {
            return res.status(400).json({
                success: false,
                message: "Please provide consent for face enrollment.",
            });
        }

        if (!isValidDescriptor(descriptor)) {
            return res.status(400).json({
                success: false,
                message: "Invalid face descriptor.",
            });
        }

        const user = await User.findById(req.user._id).select(
            "+faceDescriptor"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Employee account not found.",
            });
        }

        if (user.isActivated === false) {
            return res.status(403).json({
                success: false,
                message: "Activate your account before face enrollment.",
            });
        }

        if (user.role !== "employee") {
            return res.status(403).json({
                success: false,
                message: "Only employees can enroll their face.",
            });
        }

        if (
            user.faceEnrolled === true &&
            user.faceDescriptor?.length === DESCRIPTOR_LENGTH
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Your face is already enrolled. You can use Face Login.",
                faceEnrolled: true,
            });
        }

        user.faceDescriptor = descriptor;
        user.faceEnrolled = true;
        user.faceEnrolledAt = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Face enrollment completed successfully.",
            faceEnrolled: true,
            faceEnrolledAt: user.faceEnrolledAt,
        });
    } catch (error) {
        console.error("Face enrollment error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to enroll face. Please try again.",
        });
    }
};

export const getFaceEnrollmentStatus = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "employee") {
            return res.status(403).json({
                success: false,
                message: "Only employees can access this feature.",
            });
        }

        const user = await User.findById(req.user._id).select(
            "faceEnrolled faceEnrolledAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Employee account not found.",
            });
        }

        return res.status(200).json({
            success: true,
            faceEnrolled: user.faceEnrolled === true,
            faceEnrolledAt: user.faceEnrolledAt || null,
        });
    } catch (error) {
        console.error("Face enrollment status error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check face enrollment status.",
        });
    }
};

// Public endpoint: verifies the claimed email against its enrolled descriptor.
export const verifyFace = async (req, res) => {
    try {
        const { email, descriptor } = req.body ?? {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            !isValidDescriptor(descriptor)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid email and face descriptor are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
            role: "employee",
            faceEnrolled: true,
            isActivated: { $ne: false },
        }).select("+faceDescriptor");

        if (
            !user ||
            !Array.isArray(user.faceDescriptor) ||
            user.faceDescriptor.length !== DESCRIPTOR_LENGTH
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Face verification failed. Check your details or use password login.",
            });
        }

        const distance = calculateDistance(
            descriptor,
            user.faceDescriptor
        );

        if (distance > FACE_MATCH_THRESHOLD) {
            return res.status(401).json({
                success: false,
                message:
                    "Face verification failed. Please try again or use password login.",
            });
        }

        const token = createLoginToken(user);

        return res.status(200).json({
            success: true,
            message: "Face login successful.",
            token,
            user: makeLoginUser(user),
        });
    } catch (error) {
        console.error("Face login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify your face right now.",
        });
    }
};

export const verifyFaceForAttendance = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "employee") {
            return res.status(403).json({
                success: false,
                message:
                    "Only authenticated employees can verify attendance.",
            });
        }

        const { descriptor } = req.body ?? {};

        if (!isValidDescriptor(descriptor)) {
            return res.status(400).json({
                success: false,
                message: "Invalid face descriptor.",
            });
        }

        const user = await User.findById(req.user._id).select(
            "+faceDescriptor"
        );

        if (
            !user ||
            user.isActivated === false ||
            user.role !== "employee"
        ) {
            return res.status(403).json({
                success: false,
                message: "Your employee account is unavailable.",
            });
        }

        if (
            user.faceEnrolled !== true ||
            !Array.isArray(user.faceDescriptor) ||
            user.faceDescriptor.length !== DESCRIPTOR_LENGTH
        ) {
            return res.status(400).json({
                success: false,
                message: "Enroll your face before using face attendance.",
            });
        }

        const distance = calculateDistance(
            descriptor,
            user.faceDescriptor
        );

        if (distance > FACE_MATCH_THRESHOLD) {
            return res.status(401).json({
                success: false,
                message: "Face did not match your enrolled face.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Face verified for the logged-in employee.",
            verified: true,
        });
    } catch (error) {
        console.error(
            "Authenticated face attendance verification error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify your face right now.",
        });
    }
};
