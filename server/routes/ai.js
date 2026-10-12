
import express from "express";
import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import { generateAIResponse } from "../controllers/aiController.js";
import {
    getChatHistory,
    saveChatMessage,
    clearChatHistory
} from "../controllers/aiChatHistoryController.js";

const router = express.Router();

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "AI router is connected"
    });
});

router.use(verifyUser);

router.get(
    "/history",
    requireRole("admin", "employee"),
    getChatHistory
);

router.post(
    "/history/messages",
    requireRole("admin", "employee"),
    saveChatMessage
);

router.delete(
    "/history",
    requireRole("admin", "employee"),
    clearChatHistory
);

router.post(
    "/chat",
    requireRole("admin", "employee"),
    generateAIResponse
);

export default router;
