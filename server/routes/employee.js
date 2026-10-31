
import express from "express";

import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyEmployeeProfile,
  reactivateEmployee,
} from "../controllers/employeeController.js";

import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee can access only their own profile.
router.get(
  "/me/profile",
  verifyUser,
  requireRole("employee"),
  getMyEmployeeProfile
);

// All remaining routes require an authenticated admin.
router.use(verifyUser, requireRole("admin"));

// List employees, with your existing search/filter/pagination support.
router.get("/", getEmployees);

// Reactivate must be declared before the generic /:id route.
router.patch("/:id/reactivate", reactivateEmployee);

// Get a specific employee.
router.get("/:id", getEmployeeById);

// Create an employee.
router.post("/", createEmployee);

// Update an employee.
router.put("/:id", updateEmployee);

// Soft-delete: set status to Inactive; preserve the document/history.
router.delete("/:id", deleteEmployee);

export default router;
