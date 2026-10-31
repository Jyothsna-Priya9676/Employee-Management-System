
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Convert a date-only string into a UTC date.
const parseDateKey = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
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

// Get today's date in Asia/Kolkata.
const getTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const roundPercentage = (value) =>
  Number(value.toFixed(2));

export const getAttendanceRateAnalytics = async (req, res) => {
  try {
    const todayKey = getTodayKey();

    const currentMonthStart = `${todayKey.slice(0, 7)}-01`;

    const startDateKey = req.query.startDate || currentMonthStart;
    const endDateKey = req.query.endDate || todayKey;

    const startDate = parseDateKey(startDateKey);
    const endDate = parseDateKey(endDateKey);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "Dates must use YYYY-MM-DD format and be valid dates.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate cannot be after endDate.",
      });
    }

    const rangeDays =
      Math.floor((endDate - startDate) / DAY_IN_MS) + 1;

    if (rangeDays > 366) {
      return res.status(400).json({
        success: false,
        error: "Date range cannot exceed 366 days.",
      });
    }

    // Default: Sunday (0) and Saturday (6).
    const weekendInput = req.query.weekendDays || "0,6";

    const weekendDays = [
      ...new Set(
        String(weekendInput)
          .split(",")
          .map((value) => Number(value.trim()))
      ),
    ];

    if (
      weekendDays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "weekendDays must contain weekday numbers from 0 to 6.",
      });
    }

    const endExclusive = new Date(endDate.getTime() + DAY_IN_MS);

    // Only active employees who joined on or before the selected end date.
    const employees = await Employee.find({
      status: "Active",
      joiningDate: { $lt: endExclusive },
    })
      .select("_id employeeId name email designation department joiningDate")
      .populate("department", "departmentName")
      .lean();

    if (employees.length === 0) {
      return res.status(200).json({
        success: true,
        filters: {
          startDate: startDateKey,
          endDate: endDateKey,
          weekendDays,
        },
        summary: {
          totalEmployees: 0,
          expectedWorkingDays: 0,
          presentDays: 0,
          absentDays: 0,
          approvedLeaveDays: 0,
          attendanceRate: 0,
        },
        employees: [],
      });
    }

    const employeeIds = employees.map((employee) => employee._id);

    const [attendanceRecords, approvedLeaves] = await Promise.all([
      Attendance.find({
        employee: { $in: employeeIds },
        dateKey: {
          $gte: startDateKey,
          $lte: endDateKey,
        },
      })
        .select("employee dateKey checkIn checkOut status")
        .lean(),

      Leave.find({
        employee: { $in: employeeIds },
        status: "Approved",
        startDate: { $lt: endExclusive },
        endDate: { $gte: startDate },
      })
        .select("employee startDate endDate status")
        .lean(),
    ]);

    // Map employee ID -> set of attendance date keys.
    const attendanceByEmployee = new Map();

    for (const record of attendanceRecords) {
      if (!record.employee || !record.dateKey) continue;

      const employeeId = record.employee.toString();

      if (!attendanceByEmployee.has(employeeId)) {
        attendanceByEmployee.set(employeeId, new Set());
      }

      attendanceByEmployee.get(employeeId).add(record.dateKey);
    }

    // Map employee ID -> set of approved leave date keys.
    const leaveByEmployee = new Map();

    for (const leave of approvedLeaves) {
      if (!leave.employee || !leave.startDate || !leave.endDate) {
        continue;
      }

      const employeeId = leave.employee.toString();

      if (!leaveByEmployee.has(employeeId)) {
        leaveByEmployee.set(employeeId, new Set());
      }

      const leaveStart = Math.max(
        startDate.getTime(),
        Date.UTC(
          leave.startDate.getUTCFullYear(),
          leave.startDate.getUTCMonth(),
          leave.startDate.getUTCDate()
        )
      );

      const leaveEnd = Math.min(
        endDate.getTime(),
        Date.UTC(
          leave.endDate.getUTCFullYear(),
          leave.endDate.getUTCMonth(),
          leave.endDate.getUTCDate()
        )
      );

      for (
        let time = leaveStart;
        time <= leaveEnd;
        time += DAY_IN_MS
      ) {
        const date = new Date(time);

        if (!weekendDays.includes(date.getUTCDay())) {
          leaveByEmployee.get(employeeId).add(toDateKey(date));
        }
      }
    }

    let totalExpectedWorkingDays = 0;
    let totalPresentDays = 0;
    let totalApprovedLeaveDays = 0;

    const employeeAnalytics = employees.map((employee) => {
      const employeeId = employee._id.toString();

      const attendanceDates =
        attendanceByEmployee.get(employeeId) || new Set();

      const leaveDates =
        leaveByEmployee.get(employeeId) || new Set();

      const joiningDate = new Date(employee.joiningDate);

      const employeeStartTime = Math.max(
        startDate.getTime(),
        Date.UTC(
          joiningDate.getUTCFullYear(),
          joiningDate.getUTCMonth(),
          joiningDate.getUTCDate()
        )
      );

      let expectedWorkingDays = 0;
      let presentDays = 0;
      let approvedLeaveDays = 0;

      for (
        let time = employeeStartTime;
        time <= endDate.getTime();
        time += DAY_IN_MS
      ) {
        const date = new Date(time);
        const dateKey = toDateKey(date);

        // Ignore Saturday and Sunday by default.
        if (weekendDays.includes(date.getUTCDay())) {
          continue;
        }

        // Approved leave is excluded from expected attendance.
        if (leaveDates.has(dateKey)) {
          approvedLeaveDays++;
          continue;
        }

        expectedWorkingDays++;

        if (attendanceDates.has(dateKey)) {
          presentDays++;
        }
      }

      const absentDays = Math.max(
        0,
        expectedWorkingDays - presentDays
      );

      const attendanceRate =
        expectedWorkingDays > 0
          ? roundPercentage(
              (presentDays / expectedWorkingDays) * 100
            )
          : 0;

      totalExpectedWorkingDays += expectedWorkingDays;
      totalPresentDays += presentDays;
      totalApprovedLeaveDays += approvedLeaveDays;

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department?.departmentName || "Unassigned",
        joiningDate: employee.joiningDate,
        expectedWorkingDays,
        presentDays,
        absentDays,
        approvedLeaveDays,
        attendanceRate,
      };
    });

    const totalAbsentDays = Math.max(
      0,
      totalExpectedWorkingDays - totalPresentDays
    );

    const overallAttendanceRate =
      totalExpectedWorkingDays > 0
        ? roundPercentage(
            (totalPresentDays / totalExpectedWorkingDays) * 100
          )
        : 0;

    employeeAnalytics.sort(
      (a, b) => b.attendanceRate - a.attendanceRate
    );

    return res.status(200).json({
      success: true,

      filters: {
        startDate: startDateKey,
        endDate: endDateKey,
        weekendDays,
      },

      summary: {
        totalEmployees: employees.length,
        expectedWorkingDays: totalExpectedWorkingDays,
        presentDays: totalPresentDays,
        absentDays: totalAbsentDays,
        approvedLeaveDays: totalApprovedLeaveDays,
        attendanceRate: overallAttendanceRate,
      },

      employees: employeeAnalytics,
    });
  } catch (error) {
    console.error("getAttendanceRateAnalytics:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to calculate attendance analytics.",
    });
  }
};
