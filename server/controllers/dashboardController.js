
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

// GET /api/dashboard/summary
export const getDashboardSummary = async (req, res) => {
    try {
        const [
            totalEmployees,
            totalDepartments,
            employeeStats
        ] = await Promise.all([
            Employee.countDocuments(),
            Department.countDocuments(),

            Employee.aggregate([
                {
                    $group: {
                        _id: null,

                        activeEmployees: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Active"] },
                                    1,
                                    0
                                ]
                            }
                        },

                        inactiveEmployees: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Inactive"] },
                                    1,
                                    0
                                ]
                            }
                        },

                        monthlySalary: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$status", "Active"] },
                                    "$salary",
                                    0
                                ]
                            }
                        },

                        averageSalary: {
                            $avg: "$salary"
                        }
                    }
                }
            ])
        ]);

        const stats = employeeStats[0] || {
            activeEmployees: 0,
            inactiveEmployees: 0,
            monthlySalary: 0,
            averageSalary: 0
        };

        return res.status(200).json({
            success: true,
            summary: {
                totalEmployees,
                activeEmployees: stats.activeEmployees,
                inactiveEmployees: stats.inactiveEmployees,
                totalDepartments,
                monthlySalary: Math.round(stats.monthlySalary),
                averageSalary: Math.round(stats.averageSalary || 0)
            }
        });
    } catch (error) {
        console.error("getDashboardSummary:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to load dashboard summary"
        });
    }
};


// GET /api/dashboard/department-breakdown
export const getDepartmentBreakdown = async (req, res) => {
    try {
        const departments = await Department.aggregate([
            {
                $lookup: {
                    from: "employees",
                    localField: "_id",
                    foreignField: "department",
                    as: "employees"
                }
            },
            {
                $project: {
                    _id: 1,
                    departmentName: 1,
                    employeeCount: {
                        $size: "$employees"
                    }
                }
            },
            {
                $sort: {
                    departmentName: 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            departments
        });
    } catch (error) {
        console.error("getDepartmentBreakdown:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to load department breakdown"
        });
    }
};



/**
 * GET /api/dashboard/attendance-trends?months=6
 * Monthly attendance records and completion statistics.
 */
export const getAttendanceTrends = async (req, res) => {
    try {
        const requestedMonths = Number(req.query.months) || 6;
        const months = Math.min(12, Math.max(1, requestedMonths));

        // Start at the beginning of the month, N months ago.
        const now = new Date();
        const startDate = new Date(
            now.getFullYear(),
            now.getMonth() - months + 1,
            1
        );

        const trends = await Attendance.aggregate([
            {
                $match: {
                    dateKey: {
                        $gte: [
                            startDate.getFullYear(),
                            String(startDate.getMonth() + 1).padStart(2, "0"),
                            "01"
                        ].join("-")
                    }
                }
            },
            {
                $addFields: {
                    month: {
                        $substrBytes: ["$dateKey", 0, 7]
                    }
                }
            },
            {
                $group: {
                    _id: "$month",
                    totalRecords: { $sum: 1 },
                    completed: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "Completed"] },
                                1,
                                0
                            ]
                        }
                    },
                    inProgress: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "Present"] },
                                1,
                                0
                            ]
                        }
                    },
                    averageDurationMinutes: {
                        $avg: "$durationMinutes"
                    }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    totalRecords: 1,
                    completed: 1,
                    inProgress: 1,
                    averageDurationMinutes: {
                        $round: [
                            { $ifNull: ["$averageDurationMinutes", 0] },
                            0
                        ]
                    }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            months,
            trends
        });
    } catch (error) {
        console.error("getAttendanceTrends:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to load attendance trends"
        });
    }
};


/**
 * GET /api/dashboard/leave-statistics
 * Leave requests grouped by status and type.
 */
export const getLeaveStatistics = async (req, res) => {
    try {
        const [statusStats, typeStats] = await Promise.all([
            Leave.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Leave.aggregate([
                {
                    $group: {
                        _id: "$leaveType",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        const byStatus = {
            Pending: 0,
            Approved: 0,
            Rejected: 0
        };

        for (const item of statusStats) {
            if (Object.hasOwn(byStatus, item._id)) {
                byStatus[item._id] = item.count;
            }
        }

        const totalLeaves = statusStats.reduce(
            (sum, item) => sum + item.count,
            0
        );

        return res.status(200).json({
            success: true,
            totalLeaves,
            byStatus,
            byType: typeStats.map(item => ({
                leaveType: item._id,
                count: item.count
            }))
        });
    } catch (error) {
        console.error("getLeaveStatistics:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to load leave statistics"
        });
    }
};
