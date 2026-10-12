
import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";

const findOwnEmployee = async (req) => {
    return Employee.findOne({
        email: { $regex: `^${req.user.email}$`, $options: "i" }
    });
};

// Employee: Apply for leave
export const applyForLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({
                success: false,
                error: "Leave type, start date, end date, and reason are required"
            });
        }

        const allowedTypes = ["Casual", "Sick", "Earned", "Unpaid"];

        if (!allowedTypes.includes(leaveType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid leave type"
            });
        }

        const cleanReason = String(reason).trim();

        if (cleanReason.length < 5 || cleanReason.length > 500) {
            return res.status(400).json({
                success: false,
                error: "Reason must contain between 5 and 500 characters"
            });
        }

        const parseDate = (value) => {
            if (
                typeof value !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(value)
            ) {
                return null;
            }

            const date = new Date(`${value}T00:00:00.000Z`);

            if (
                Number.isNaN(date.getTime()) ||
                date.toISOString().slice(0, 10) !== value
            ) {
                return null;
            }

            return date;
        };

        const start = parseDate(startDate);
        const end = parseDate(endDate);

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                error: "Enter valid start and end dates in YYYY-MM-DD format"
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                error: "End date cannot be before start date"
            });
        }

        const todayKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());

        const today = new Date(`${todayKey}T00:00:00.000Z`);

        if (start < today) {
            return res.status(400).json({
                success: false,
                error: "Leave cannot start in the past"
            });
        }

        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee profile not found for this account"
            });
        }

        if (employee.status !== "Active") {
            return res.status(403).json({
                success: false,
                error: "Only active employees can apply for leave"
            });
        }

        const overlappingLeave = await Leave.findOne({
            employee: employee._id,
            status: { $in: ["Pending", "Approved"] },
            startDate: { $lte: end },
            endDate: { $gte: start }
        });

        if (overlappingLeave) {
            return res.status(409).json({
                success: false,
                error: "You already have a pending or approved leave request for overlapping dates"
            });
        }

        const leave = await Leave.create({
            employee: employee._id,
            leaveType,
            startDate: start,
            endDate: end,
            reason: cleanReason
        });

        return res.status(201).json({
            success: true,
            message: "Leave request submitted successfully",
            leave
        });
    } catch (error) {
        console.error("Apply for leave error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to submit leave request"
        });
    }
};

// Employee: View their own leave requests
export const getMyLeaves = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee profile not found for this account"
            });
        }

        const leaves = await Leave.find({ employee: employee._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: leaves.length,
            leaves
        });
    } catch (error) {
        console.error("Get my leaves error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to fetch your leave requests"
        });
    }
};

// Employee: Cancel their own pending leave request
export const cancelMyLeave = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee profile not found for this account"
            });
        }

        // Match both the leave ID and employee ID to enforce ownership.
        const leave = await Leave.findOne({
            _id: req.params.id,
            employee: employee._id
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                error: "Leave request not found"
            });
        }

        if (leave.status !== "Pending") {
            return res.status(400).json({
                success: false,
                error: "Only pending leave requests can be cancelled"
            });
        }

        // Record cancellation without deleting the leave history.
        leave.status = "Cancelled";
        leave.decisionNote = "Cancelled by the employee";
        leave.reviewedBy = undefined;
        leave.reviewedAt = new Date();

        await leave.save();

        return res.status(200).json({
            success: true,
            message: "Leave request cancelled successfully",
            leave
        });
    } catch (error) {
        console.error("Cancel leave error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to cancel leave request"
        });
    }
};

// Admin: View all leave requests with filtering and pagination
export const getAllLeaves = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
        );

        const { status, leaveType, employeeId } = req.query;

        const filter = {};

        if (status) {
            if (!["Pending", "Approved", "Rejected", "Cancelled"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid status filter"
                });
            }

            filter.status = status;
        }

        if (leaveType) {
            if (!["Casual", "Sick", "Earned", "Unpaid"].includes(leaveType)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid leave type filter"
                });
            }

            filter.leaveType = leaveType;
        }

        if (employeeId) {
            const employee = await Employee.findOne({ employeeId });

            if (!employee) {
                return res.status(200).json({
                    success: true,
                    leaves: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                });
            }

            filter.employee = employee._id;
        }

        const total = await Leave.countDocuments(filter);

        const leaves = await Leave.find(filter)
            .populate({
                path: "employee",
                select: "employeeId name email designation department",
                populate: {
                    path: "department",
                    select: "departmentName"
                }
            })
            .populate("reviewedBy", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            success: true,
            leaves,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get all leaves error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to fetch leave requests"
        });
    }
};

// Admin: Approve or reject a leave request
export const decideLeave = async (req, res) => {
    try {
        const { status, decisionNote } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be Approved or Rejected."
            });
        }

        if (typeof decisionNote !== "string" || !decisionNote.trim()) {
            return res.status(400).json({
                success: false,
                error: "A decision note is required."
            });
        }

        if (decisionNote.trim().length > 500) {
            return res.status(400).json({
                success: false,
                error: "Decision note cannot exceed 500 characters."
            });
        }

        const leave = await Leave.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                error: "Leave request not found."
            });
        }

        if (leave.status !== "Pending") {
            return res.status(400).json({
                success: false,
                error: "This leave request has already been reviewed."
            });
        }

        leave.status = status;
        leave.decisionNote = decisionNote.trim();
        leave.reviewedBy = req.user._id;
        leave.reviewedAt = new Date();

        await leave.save();

        await leave.populate([
            {
                path: "employee",
                select: "name email employeeId department",
                populate: {
                    path: "department",
                    select: "departmentName"
                }
            },
            {
                path: "reviewedBy",
                select: "name email"
            }
        ]);

        return res.status(200).json({
            success: true,
            message: `Leave request ${status.toLowerCase()} successfully.`,
            leave
        });
    } catch (error) {
        console.error("Decide leave error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to process the leave decision."
        });
    }
};
