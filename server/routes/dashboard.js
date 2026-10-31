
import express from "express";

import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import {
  getDashboardSummary,
  getDepartmentBreakdown,
  getAttendanceTrends,
  getLeaveStatistics,
} from "../controllers/dashboardController.js";

import {
  getAttendanceRateAnalytics,
} from "../controllers/attendanceAnalyticsController.js";

const router = express.Router();

// All dashboard analytics require an authenticated admin.
router.use(verifyUser, requireRole("admin"));

router.get("/summary", getDashboardSummary);
router.get("/department-breakdown", getDepartmentBreakdown);
router.get("/attendance-trends", getAttendanceTrends);
router.get("/leave-statistics", getLeaveStatistics);

// Advanced attendance analytics.
router.get("/attendance-rate", getAttendanceRateAnalytics);

export default router;
