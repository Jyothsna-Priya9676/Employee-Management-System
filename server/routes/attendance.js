
import express from "express";
import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

// Employee self-service routes.
router.post(
    "/check-in",
    verifyUser,
    requireRole("employee"),
    checkIn
);

router.post(
    "/check-out",
    verifyUser,
    requireRole("employee"),
    checkOut
);

router.get(
    "/me",
    verifyUser,
    requireRole("employee"),
    getMyAttendance
);

// All-records endpoint is admin-only.
router.get(
    "/",
    verifyUser,
    requireRole("admin"),
    getAllAttendance
);

export default router;
