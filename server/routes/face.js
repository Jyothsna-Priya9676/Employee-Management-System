
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import {
  enrollFace,
  getFaceEnrollmentStatus,
  verifyFace,
  verifyFaceForAttendance,
} from "../controllers/faceController.js";

const router = express.Router();

// Public face login. Keep your existing login flow.
router.post("/verify", verifyFace);

// Authenticated employee routes.
router.get(
  "/status",
  authMiddleware,
  requireRole("employee"),
  getFaceEnrollmentStatus
);

router.post(
  "/enroll",
  authMiddleware,
  requireRole("employee"),
  enrollFace
);

// Face verification for the currently logged-in employee.
router.post(
  "/verify-attendance",
  authMiddleware,
  requireRole("employee"),
  verifyFaceForAttendance
);

export default router;
