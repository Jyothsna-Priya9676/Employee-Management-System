
import express from "express";
import { login, verify } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);

router.get("/verify", authMiddleware, verify);

// Return the currently authenticated user's own profile
router.get("/profile", authMiddleware, verify);

export default router;
