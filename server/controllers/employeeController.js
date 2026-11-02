
import mongoose from "mongoose";

import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import { sendEmail } from "../services/emailService.js";
const validStatuses = ["Active", "Inactive"];

// GET /api/employees
// Search, filter, sort and paginate employees.
export const getEmployees = async (req, res) => {
    try {
        const {
            search = "",
            department = "",
            status = "",
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            order = "desc"
        } = req.query;

        const currentPage = Math.max(1, Number(page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

        const allowedSortFields = [
            "name",
            "email",
            "employeeId",
            "salary",
            "joiningDate",
            "createdAt"
        ];

        const safeSortBy = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";

        const sortOrder = order === "asc" ? 1 : -1;
        const filter = {};

        if (typeof search === "string" && search.trim()) {
            const escapedSearch = search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.$or = [
                { name: { $regex: escapedSearch, $options: "i" } },
                { email: { $regex: escapedSearch, $options: "i" } },
                { employeeId: { $regex: escapedSearch, $options: "i" } },
                { designation: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        if (department) {
            if (!mongoose.isValidObjectId(department)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid department ID"
                });
            }

            filter.department = department;
        }

        if (status) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid employee status"
                });
            }

            filter.status = status;
        }

        const [employees, totalEmployees] = await Promise.all([
            Employee.find(filter)
                .populate("department", "departmentName")
                .sort({ [safeSortBy]: sortOrder })
                .skip((currentPage - 1) * pageSize)
                .limit(pageSize)
                .lean(),

            Employee.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            employees,
            pagination: {
                currentPage,
                totalPages: Math.ceil(totalEmployees / pageSize),
                totalEmployees,
                limit: pageSize
            }
        });
    } catch (error) {
        console.error("getEmployees:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve employees"
        });
    }
};

// GET /api/employees/:id
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid employee ID"
            });
        }

        const employee = await Employee.findById(id)
            .populate("department", "departmentName")
            .lean();

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found"
            });
        }

        return res.status(200).json({
            success: true,
            employee
        });
    } catch (error) {
        console.error("getEmployeeById:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve employee"
        });
    }
};

// POST /api/employees

export const createEmployee = async (req, res) => {
    try {
        const {
            employeeId,
            name,
            email,
            designation,
            department,
            salary,
            joiningDate,
            status
        } = req.body;

        // Required field validation
        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof designation !== "string" ||
            !designation.trim() ||
            !department ||
            salary === undefined ||
            salary === null ||
            salary === ""
        ) {
            return res.status(400).json({
                success: false,
                error: "Name, email, designation, department and salary are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const normalizedEmployeeId =
            typeof employeeId === "string"
                ? employeeId.trim()
                : "";

        if (normalizedEmployeeId.length > 50) {
            return res.status(400).json({
                success: false,
                error: "Employee ID cannot exceed 50 characters"
            });
        }

        // Email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                error: "Enter a valid email address"
            });
        }

        // Department ID validation
        if (!mongoose.isValidObjectId(department)) {
            return res.status(400).json({
                success: false,
                error: "Invalid department ID"
            });
        }

        // Salary validation
        const parsedSalary = Number(salary);

        if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
            return res.status(400).json({
                success: false,
                error: "Salary must be a valid non-negative number"
            });
        }

        // Status validation
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be Active or Inactive"
            });
        }

        // Joining date validation
        const parsedJoiningDate = joiningDate
            ? new Date(joiningDate)
            : new Date();

        if (Number.isNaN(parsedJoiningDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: "Invalid joining date"
            });
        }

        // Check duplicate email
        const existingEmail = await Employee.findOne({
            email: normalizedEmail
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                error: "An employee with this email already exists"
            });
        }

        // Check duplicate employee ID
        if (normalizedEmployeeId) {
            const existingId = await Employee.findOne({
                employeeId: normalizedEmployeeId
            });

            if (existingId) {
                return res.status(409).json({
                    success: false,
                    error: "This employee ID already exists"
                });
            }
        }

        // Verify department
        const departmentExists = await Department.findById(department);

        if (!departmentExists) {
            return res.status(404).json({
                success: false,
                error: "Department not found"
            });
        }

        // Generate employee ID if not supplied
        const finalEmployeeId =
            normalizedEmployeeId ||
            `EMP-${new mongoose.Types.ObjectId()
                .toString()
                .slice(-8)
                .toUpperCase()}`;

        // Create employee
        const employee = await Employee.create({
            employeeId: finalEmployeeId,
            name: name.trim(),
            email: normalizedEmail,
            designation: designation.trim(),
            department,
            salary: parsedSalary,
            joiningDate: parsedJoiningDate,
            status: status || "Active"
        });

        // Fetch employee with department details
        const populatedEmployee = await Employee.findById(employee._id)
            .populate("department", "departmentName")
            .lean();

        // Send welcome email
        let emailSent = false;

        try {
            const departmentName =
                populatedEmployee.department?.departmentName ||
                "Unassigned";

            await sendEmail({
                to: populatedEmployee.email,
                subject: "Welcome to Smart HRMS",

                text: `
Hello ${populatedEmployee.name},

Welcome to our organization!

Your employee record has been successfully created.

Employee ID: ${populatedEmployee.employeeId}
Designation: ${populatedEmployee.designation}
Department: ${departmentName}

Regards,
HR Team
Smart HRMS
                `,

                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">

                        <h2 style="color: #2563eb;">
                            Welcome to Smart HRMS!
                        </h2>

                        <p>Hello <strong>${populatedEmployee.name}</strong>,</p>

                        <p>
                            Welcome to our organization!
                            Your employee record has been successfully created.
                        </p>

                        <div style="background: #f5f7fb; padding: 15px; border-radius: 8px;">

                            <p>
                                <strong>Employee ID:</strong>
                                ${populatedEmployee.employeeId}
                            </p>

                            <p>
                                <strong>Designation:</strong>
                                ${populatedEmployee.designation}
                            </p>

                            <p>
                                <strong>Department:</strong>
                                ${departmentName}
                            </p>

                        </div>

                        <p>
                            We are happy to have you as part of our organization.
                        </p>

                        <p>
                            Regards,<br />
                            <strong>HR Team</strong><br />
                            Smart HRMS
                        </p>

                    </div>
                `
            });

            emailSent = true;

            console.log(
                `Welcome email sent successfully to ${populatedEmployee.email}`
            );

        } catch (emailError) {
            console.error(
                "Welcome email failed:",
                emailError.message
            );
        }

        // Return response
        return res.status(201).json({
            success: true,
            message: emailSent
                ? "Employee created successfully and welcome email sent"
                : "Employee created successfully, but welcome email could not be sent",

            emailSent,
            employee: populatedEmployee
        });

    } catch (error) {
        console.error("createEmployee:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "An employee with the same unique ID or email already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: "Failed to create employee"
        });
    }
};
;

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid employee ID"
            });
        }

        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found"
            });
        }

        const {
            employeeId,
            name,
            email,
            designation,
            department,
            salary,
            joiningDate,
            status
        } = req.body;

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Name cannot be empty"
                });
            }

            employee.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== "string") {
                return res.status(400).json({
                    success: false,
                    error: "Invalid email"
                });
            }

            const normalizedEmail = email.trim().toLowerCase();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(normalizedEmail)) {
                return res.status(400).json({
                    success: false,
                    error: "Enter a valid email address"
                });
            }

            const duplicateEmail = await Employee.findOne({
                email: normalizedEmail,
                _id: { $ne: id }
            });

            if (duplicateEmail) {
                return res.status(409).json({
                    success: false,
                    error: "An employee with this email already exists"
                });
            }

            employee.email = normalizedEmail;
        }

        if (employeeId !== undefined) {
            if (
                typeof employeeId !== "string" ||
                !employeeId.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Employee ID cannot be empty"
                });
            }

            const normalizedId = employeeId.trim();

            if (normalizedId.length > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Employee ID cannot exceed 50 characters"
                });
            }

            const duplicateId = await Employee.findOne({
                employeeId: normalizedId,
                _id: { $ne: id }
            });

            if (duplicateId) {
                return res.status(409).json({
                    success: false,
                    error: "This employee ID already exists"
                });
            }

            employee.employeeId = normalizedId;
        }

        if (designation !== undefined) {
            if (
                typeof designation !== "string" ||
                !designation.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Designation cannot be empty"
                });
            }

            employee.designation = designation.trim();
        }

        if (department !== undefined) {
            if (!mongoose.isValidObjectId(department)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid department ID"
                });
            }

            const departmentExists = await Department.findById(department);

            if (!departmentExists) {
                return res.status(404).json({
                    success: false,
                    error: "Department not found"
                });
            }

            employee.department = department;
        }

        if (salary !== undefined) {
            if (
                salary === "" ||
                !Number.isFinite(Number(salary)) ||
                Number(salary) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Salary must be a valid non-negative number"
                });
            }

            employee.salary = Number(salary);
        }

        if (joiningDate !== undefined) {
            const parsedDate = new Date(joiningDate);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid joining date"
                });
            }

            employee.joiningDate = parsedDate;
        }

        if (status !== undefined) {
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: "Status must be Active or Inactive"
                });
            }

            employee.status = status;
        }

        await employee.save();

        const updatedEmployee = await Employee.findById(employee._id)
            .populate("department", "departmentName")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            employee: updatedEmployee
        });
    } catch (error) {
        console.error("updateEmployee:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "A duplicate employee ID or email already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: "Failed to update employee"
        });
    }
};

// DELETE /api/employees/:id
// Soft-delete: preserve employee and attendance history.
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid employee ID"
            });
        }

        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found"
            });
        }

        if (employee.status === "Inactive") {
            return res.status(400).json({
                success: false,
                error: "Employee is already inactive"
            });
        }

        employee.status = "Inactive";
        await employee.save();

        return res.status(200).json({
            success: true,
            message: "Employee marked as inactive successfully"
        });
    } catch (error) {
        console.error("deleteEmployee:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to deactivate employee"
        });
    }
};

// PATCH /api/employees/:id/reactivate
// Restore an inactive employee without recreating their record.
export const reactivateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid employee ID"
            });
        }

        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found"
            });
        }

        if (employee.status === "Active") {
            return res.status(400).json({
                success: false,
                error: "Employee is already active"
            });
        }

        employee.status = "Active";
        await employee.save();

        const updatedEmployee = await Employee.findById(employee._id)
            .populate("department", "departmentName")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Employee reactivated successfully",
            employee: updatedEmployee
        });
    } catch (error) {
        console.error("reactivateEmployee:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to reactivate employee"
        });
    }
};

/**
 * GET /api/employees/me/profile
 * Return only the authenticated employee's own HR profile.
 */
export const getMyEmployeeProfile = async (req, res) => {
    try {
        const email = req.user?.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Authenticated account has no email"
            });
        }

        const employee = await Employee.findOne({ email })
            .select(
                "employeeId name email designation department joiningDate status profileImage"
            )
            .populate("department", "departmentName")
            .lean();

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "No employee record is linked to this account"
            });
        }

        return res.status(200).json({
            success: true,
            employee
        });
    } catch (error) {
        console.error("getMyEmployeeProfile:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve employee profile"
        });
    }
};
