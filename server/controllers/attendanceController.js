
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";

const getTodayKey = () => {
    // Use India Standard Time for the attendance day.
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
};

const findOwnEmployee = async (req) => {
    const email = req.user.email?.trim().toLowerCase();

    if (!email) {
        return null;
    }

    return Employee.findOne({
        email: { $regex: new RegExp(`^${email}$`, "i") }
    });
};

// POST /api/attendance/check-in
export const checkIn = async (req, res) => {
    try {
        const employee = await findOwnEmployee(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "No employee record is linked to your account"
            });
        }

        if (employee.status !== "Active") {
            return res.status(403).json({
                success: false,
                error: "Inactive employees cannot record attendance"
            });
        }

        const dateKey = getTodayKey();

        const existing = await Attendance.findOne({
            employee: employee._id,
            dateKey
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: existing.checkOut
                    ? "You have already completed attendance for today"
                    : "You have already checked in today",
                attendance: existing
            });
        }

        const attendance = await Attendance.create({
            employee: employee._id,
            dateKey,
            checkIn: new Date()
        });

        return res.status(201).json({
            success: true,
            message: "Checked in successfully",
            attendance
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "Attendance has already been recorded for today"
            });
        }

        console.error("checkIn:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to check in"
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
                error: "No employee record is linked to your account"
            });
        }

        const dateKey = getTodayKey();

        const attendance = await Attendance.findOne({
            employee: employee._id,
            dateKey
        });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                error: "Please check in before checking out"
            });
        }

        if (attendance.checkOut) {
            return res.status(409).json({
                success: false,
                error: "You have already checked out today"
            });
        }

        const checkOutTime = new Date();

        if (checkOutTime <= attendance.checkIn) {
            return res.status(400).json({
                success: false,
                error: "Check-out time must be after check-in time"
            });
        }

        attendance.checkOut = checkOutTime;
        attendance.durationMinutes = Math.floor(
            (checkOutTime.getTime() - attendance.checkIn.getTime()) / 60000
        );
        attendance.status = "Completed";

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Checked out successfully",
            attendance
        });
    } catch (error) {
        console.error("checkOut:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to check out"
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
                error: "No employee record is linked to your account"
            });
        }

        const attendance = await Attendance.find({
            employee: employee._id
        })
            .sort({ dateKey: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({
            success: true,
            attendance
        });
    } catch (error) {
        console.error("getMyAttendance:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve your attendance"
        });
    }
};

// GET /api/attendance (admin only)

 // GET /api/attendance (admin only)
export const getAllAttendance = async (req, res) => {
    try {
        const {
            date = "",
            employeeId = "",
            status = "All",
            page = 1,
            limit = 10
        } = req.query;

        const currentPage = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(
            100,
            Math.max(1, parseInt(limit, 10) || 10)
        );

        const filter = {};

        // 1. Filter by date
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    error: "Date must use YYYY-MM-DD format"
                });
            }

            const parsedDate = new Date(`${date}T00:00:00.000Z`);

            if (
                Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== date
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Please provide a valid date"
                });
            }

            filter.dateKey = date;
        }

        // 2. Filter by employee ID
        if (employeeId.trim()) {
            const employee = await Employee.findOne({
                employeeId: employeeId.trim()
            }).select("_id");

            if (!employee) {
                return res.status(200).json({
                    success: true,
                    attendance: [],
                    summary: {
                        totalRecords: 0,
                        completed: 0,
                        inProgress: 0
                    },
                    pagination: {
                        currentPage,
                        totalPages: 0,
                        totalRecords: 0,
                        limit: pageSize
                    }
                });
            }

            filter.employee = employee._id;
        }

        // 3. Validate and apply status filter
        if (!["All", "Completed", "In Progress"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be All, Completed, or In Progress"
            });
        }

        if (status === "Completed") {
            filter.checkOut = { $ne: null };
        } else if (status === "In Progress") {
            filter.checkOut = null;
        }

        // 4. Fetch page data and accurate summary counts.
        // Summary counts use the date/employee filters, not the
        // selected status filter, so all three categories are visible.
        const summaryFilter = { ...filter };
        delete summaryFilter.checkOut;

        const [
            attendance,
            totalRecords,
            totalMatchingRecords,
            completed,
            inProgress
        ] = await Promise.all([
            Attendance.find(filter)
                .populate(
                    "employee",
                    "employeeId name email designation department"
                )
                .populate({
                    path: "employee",
                    populate: {
                        path: "department",
                        select: "departmentName"
                    }
                })
                .sort({ dateKey: -1, checkIn: -1 })
                .skip((currentPage - 1) * pageSize)
                .limit(pageSize)
                .lean(),

            Attendance.countDocuments(filter),

            Attendance.countDocuments(summaryFilter),

            Attendance.countDocuments({
                ...summaryFilter,
                checkOut: { $ne: null }
            }),

            Attendance.countDocuments({
                ...summaryFilter,
                checkOut: null
            })
        ]);

        return res.status(200).json({
            success: true,
            attendance,
            summary: {
                totalRecords: totalMatchingRecords,
                completed,
                inProgress
            },
            pagination: {
                currentPage,
                totalPages: Math.ceil(totalRecords / pageSize),
                totalRecords,
                limit: pageSize
            }
        });
    } catch (error) {
        console.error("getAllAttendance:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve attendance records"
        });
    }
};

