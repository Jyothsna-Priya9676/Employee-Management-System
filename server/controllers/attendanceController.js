
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";

// Today's date in India Standard Time (YYYY-MM-DD).
const getTodayKey = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

// Find the employee linked to the logged-in user's email.
const findOwnEmployee = async (req) => {
    const email = req.user?.email?.trim();

    if (!email) {
        return null;
    }

    return Employee.findOne({
        email: email.toLowerCase(),
    }).collation({
        locale: "en",
        strength: 2,
    });
};

// POST /api/attendance/check-in
export const checkIn = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "No employee record is linked to your account",
            });
        }

        if (employee.status !== "Active") {
            return res.status(403).json({
                success: false,
                error: "Inactive employees cannot record attendance",
            });
        }

        const dateKey = getTodayKey();

        const existing = await Attendance.findOne({
            employee: employee._id,
            dateKey,
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: existing.checkOut
                    ? "You have already completed attendance for today"
                    : "You have already checked in today",
                attendance: existing,
            });
        }

        const attendance = await Attendance.create({
            employee: employee._id,
            dateKey,
            checkIn: new Date(),
        });

        return res.status(201).json({
            success: true,
            message: "Checked in successfully",
            attendance,
        });
    } catch (error) {
        // Handles simultaneous check-in requests against the unique index.
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "Attendance has already been recorded for today",
            });
        }

        console.error("checkIn:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to check in",
        });
    }
};

// POST /api/attendance/check-out
export const checkOut = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "No employee record is linked to your account",
            });
        }

        if (employee.status !== "Active") {
            return res.status(403).json({
                success: false,
                error: "Inactive employees cannot record attendance",
            });
        }

        const dateKey = getTodayKey();

        const attendance = await Attendance.findOne({
            employee: employee._id,
            dateKey,
        });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                error: "Please check in before checking out",
            });
        }

        if (attendance.checkOut) {
            return res.status(409).json({
                success: false,
                error: "You have already checked out today",
            });
        }

        const checkOutTime = new Date();
        const checkInTime = new Date(attendance.checkIn);

        if (
            !attendance.checkIn ||
            Number.isNaN(checkInTime.getTime()) ||
            checkOutTime <= checkInTime
        ) {
            return res.status(400).json({
                success: false,
                error: "Check-out time must be after check-in time",
            });
        }

        attendance.checkOut = checkOutTime;
        attendance.durationMinutes = Math.floor(
            (checkOutTime.getTime() - checkInTime.getTime()) /
                60000
        );
        attendance.status = "Completed";

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Checked out successfully",
            attendance,
        });
    } catch (error) {
        console.error("checkOut:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to check out",
        });
    }
};

// GET /api/attendance/me
export const getMyAttendance = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "No employee record is linked to your account",
            });
        }

        if (employee.status !== "Active") {
            return res.status(403).json({
                success: false,
                error: "Inactive employees cannot access attendance",
            });
        }

        const attendance = await Attendance.find({
            employee: employee._id,
        })
            .sort({ dateKey: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            attendance,
        });
    } catch (error) {
        console.error("getMyAttendance:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve your attendance",
        });
    }
};

// GET /api/attendance (admin only)
export const getAllAttendance = async (req, res) => {
    try {
        const {
            date = "",
            employeeId = "",
            status = "All",
            page = 1,
            limit = 10,
        } = req.query;

        const currentPage = Math.max(
            1,
            parseInt(page, 10) || 1
        );

        const pageSize = Math.min(
            100,
            Math.max(1, parseInt(limit, 10) || 10)
        );

        const filter = {};

        // Validate and filter by date.
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    error: "Date must use YYYY-MM-DD format",
                });
            }

            const parsedDate = new Date(`${date}T00:00:00.000Z`);

            if (
                Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== date
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Please provide a valid date",
                });
            }

            filter.dateKey = date;
        }

        // Filter by employee ID.
        if (employeeId.trim()) {
            const employee = await Employee.findOne({
                employeeId: employeeId.trim(),
            }).select("_id");

            if (!employee) {
                return res.status(200).json({
                    success: true,
                    attendance: [],
                    summary: {
                        totalRecords: 0,
                        completed: 0,
                        inProgress: 0,
                    },
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalRecords: 0,
                        limit: pageSize,
                    },
                });
            }

            filter.employee = employee._id;
        }

        // Validate status filter.
        if (!["All", "Completed", "In Progress"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be All, Completed, or In Progress",
            });
        }

        if (status === "Completed") {
            filter.checkOut = { $ne: null };
        } else if (status === "In Progress") {
            filter.checkOut = null;
        }

        // Summary respects date/employee filters but ignores status.
        const summaryFilter = { ...filter };
        delete summaryFilter.checkOut;

        const [
            attendance,
            totalRecords,
            totalMatchingRecords,
            completed,
            inProgress,
        ] = await Promise.all([
            Attendance.find(filter)
                .populate({
                    path: "employee",
                    select: "employeeId name email designation department",
                    populate: {
                        path: "department",
                        select: "departmentName",
                    },
                })
                .sort({ dateKey: -1, checkIn: -1 })
                .skip((currentPage - 1) * pageSize)
                .limit(pageSize)
                .lean(),

            Attendance.countDocuments(filter),

            Attendance.countDocuments(summaryFilter),

            Attendance.countDocuments({
                ...summaryFilter,
                checkOut: { $ne: null },
            }),

            Attendance.countDocuments({
                ...summaryFilter,
                checkOut: null,
            }),
        ]);

        // Diagnostic logging: identifies records with missing employee references.
        const missingEmployeeRecords = attendance
            .filter((record) => !record.employee)
            .map((record) => ({
                attendanceId: record._id,
                employeeRef: record.employee ?? null,
                dateKey: record.dateKey,
            }));

        if (missingEmployeeRecords.length > 0) {
            console.warn(
                "Attendance records with missing employee references:",
                missingEmployeeRecords
            );
        }

        return res.status(200).json({
            success: true,
            attendance,
            summary: {
                totalRecords: totalMatchingRecords,
                completed,
                inProgress,
            },
            pagination: {
                currentPage,
                totalPages: Math.max(
                    1,
                    Math.ceil(totalRecords / pageSize)
                ),
                totalRecords,
                limit: pageSize,
            },
        });
    } catch (error) {
        console.error("getAllAttendance:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve attendance records",
        });
    }
};

// GET /api/attendance/admin/today-summary
export const getTodayAttendanceSummary = async (req, res) => {
    try {
        const dateKey = getTodayKey();

        const activeEmployees = await Employee.find({
            status: "Active",
        })
            .select("_id")
            .lean();

        const records = await Attendance.find({ dateKey })
            .select("employee checkIn checkOut")
            .lean();

        // One record per employee per day is enforced by the unique index.
        const recordsByEmployee = new Map(
            records.map((record) => [
                String(record.employee),
                record,
            ])
        );

        let checkedIn = 0;
        let checkedOut = 0;
        let notCheckedIn = 0;

        for (const employee of activeEmployees) {
            const record = recordsByEmployee.get(
                String(employee._id)
            );

            if (record?.checkOut) {
                checkedOut++;
            } else if (record?.checkIn) {
                checkedIn++;
            } else {
                notCheckedIn++;
            }
        }

        return res.status(200).json({
            success: true,
            date: dateKey,
            summary: {
                totalEmployees: activeEmployees.length,
                checkedIn,
                checkedOut,
                notCheckedIn,
            },
        });
    } catch (error) {
        console.error("Today's attendance summary error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch today's attendance summary",
        });
    }
};
