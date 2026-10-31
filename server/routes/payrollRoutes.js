
import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  generatePayroll,
  recalculateDraftPayroll,
  getPayrolls,
  getPayrollById,
  updatePayrollStatus,
} from "../controllers/payrollController.js";

const router = express.Router();

// All payroll routes require authentication.
router.use(authMiddleware);

// Admin: generate payroll.
router.post("/generate", generatePayroll);

// Admin: recalculate only Draft payroll records.
router.post(
  "/recalculate-drafts",
  recalculateDraftPayroll
);

// Admin: list all payrolls.
// Employee: list only their own payrolls.
router.get("/", getPayrolls);

// Admin: update payroll workflow status.
router.patch("/:id/status", updatePayrollStatus);

// Admin: view any payroll.
// Employee: view their own payroll.
router.get("/:id", getPayrollById);

export default router;
