
import express from "express";
import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

import {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getMyEmployeeProfile
} from "../controllers/employeeController.js";

const router = express.Router();

// Authenticated employees can view their own HR profile.
router.get(
    "/me/profile",
    verifyUser,
    requireRole("employee"),
    getMyEmployeeProfile
);

// All remaining employee-management routes are admin-only.
router.use(verifyUser, requireRole("admin"));

router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
