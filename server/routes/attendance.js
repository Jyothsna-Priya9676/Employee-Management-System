
import express from "express";

import {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getTodayAttendanceSummary,
} from "../controllers/attendanceController.js";

import verifyUser  from "../middleware/authMiddleware.js";
import  requireRole  from "../middleware/roleMiddleware.js";
import faceAttendanceMiddleware from "../middleware/faceAttendanceMiddleware.js";

const router = express.Router();

// Employee attendance: face verification is required.
router.post(
  "/check-in",
  verifyUser,
  requireRole("employee"),
  faceAttendanceMiddleware,
  checkIn
);

router.post(
  "/check-out",
  verifyUser,
  requireRole("employee"),
  faceAttendanceMiddleware,
  checkOut
);

// Employee's own attendance history.
router.get(
  "/me",
  verifyUser,
  requireRole("employee"),
  getMyAttendance
);

// Admin: attendance records with filters and pagination.
router.get(
  "/",
  verifyUser,
  requireRole("admin"),
  getAllAttendance
);

// Admin: today's attendance summary.
router.get(
  "/admin/today-summary",
  verifyUser,
  requireRole("admin"),
  getTodayAttendanceSummary
);

export default router;
