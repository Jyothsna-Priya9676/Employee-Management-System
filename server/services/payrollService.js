
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Payroll from "../models/Payroll.js";

// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

const getDateKey = (date) => {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date(date).toISOString().slice(0, 10);
};

const getMonthDates = (month) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Invalid month format. Use YYYY-MM.");
  }

  const [year, monthNumber] = month.split("-").map(Number);

  const startDate = new Date(
    Date.UTC(year, monthNumber - 1, 1)
  );

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0)
  ).getUTCDate();

  const today = new Date();

  const isFutureMonth =
    year > today.getUTCFullYear() ||
    (year === today.getUTCFullYear() &&
      monthNumber > today.getUTCMonth() + 1);

  if (isFutureMonth) {
    throw new Error("Cannot generate payroll for a future month.");
  }

  const isCurrentMonth =
    year === today.getUTCFullYear() &&
    monthNumber === today.getUTCMonth() + 1;

  const endDay = isCurrentMonth
    ? today.getUTCDate()
    : lastDay;

  const endDate = new Date(
    Date.UTC(year, monthNumber - 1, endDay)
  );

  const monthEndDate = new Date(
    Date.UTC(year, monthNumber, 0)
  );

  return {
    startDate,
    endDate,
    monthEndDate,
  };
};

// --------------------------------------------------
// WORKING DAY HELPERS
// --------------------------------------------------

const isWorkingDay = (date) => {
  const day = date.getUTCDay();

  return day !== 0 && day !== 6;
};

const getWorkingDateKeys = (startDate, endDate) => {
  const keys = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      keys.push(getDateKey(current));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
};

// --------------------------------------------------
// APPROVED LEAVE CALCULATION
// --------------------------------------------------

const getLeaveDayMap = (
  leaves,
  effectiveStart,
  effectiveEnd
) => {
  const leaveMap = new Map();

  for (const leave of leaves) {
    const leaveStart = new Date(
      getDateKey(leave.startDate) + "T00:00:00.000Z"
    );

    const leaveEnd = new Date(
      getDateKey(leave.endDate) + "T00:00:00.000Z"
    );

    const current = new Date(
      Math.max(
        leaveStart.getTime(),
        effectiveStart.getTime()
      )
    );

    const end = new Date(
      Math.min(
        leaveEnd.getTime(),
        effectiveEnd.getTime()
      )
    );

    while (current <= end) {
      if (isWorkingDay(current)) {
        const dateKey = getDateKey(current);

        const existing = leaveMap.get(dateKey);

        // Unpaid leave takes priority when approved
        // leave records overlap.
        if (
          !existing ||
          leave.leaveType === "Unpaid"
        ) {
          leaveMap.set(dateKey, leave.leaveType);
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return leaveMap;
};

// --------------------------------------------------
// PAYROLL GENERATION / RECALCULATION
// --------------------------------------------------

export const generateMonthlyPayroll = async (
  month,
  adminId,
  { recalculateDrafts = false } = {}
) => {
  const {
    startDate,
    endDate,
    monthEndDate,
  } = getMonthDates(month);

  const monthWorkingDateKeys = getWorkingDateKeys(
    startDate,
    monthEndDate
  );

  const totalMonthWorkingDays =
    monthWorkingDateKeys.length;

  if (totalMonthWorkingDays === 0) {
    throw new Error("No working days found for this month.");
  }

  // Fetch active employees who joined on or before
  // the payroll calculation end date.
  const employees = await Employee.find({
    status: "Active",
    joiningDate: { $lte: endDate },
  }).populate("department", "departmentName");

  const result = {
    month,
    totalEmployees: employees.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: [],
    payrolls: [],
  };

  for (const employee of employees) {
    try {
      // --------------------------------------------
      // 1. Determine employee's eligible period
      // --------------------------------------------

      const joiningDate = new Date(employee.joiningDate);

      if (Number.isNaN(joiningDate.getTime())) {
        throw new Error("Invalid employee joining date.");
      }

      const joiningDateUTC = new Date(
        Date.UTC(
          joiningDate.getUTCFullYear(),
          joiningDate.getUTCMonth(),
          joiningDate.getUTCDate()
        )
      );

      const effectiveStart = new Date(
        Math.max(
          joiningDateUTC.getTime(),
          startDate.getTime()
        )
      );

      const effectiveEnd = endDate;

      const workingDateKeys = getWorkingDateKeys(
        effectiveStart,
        effectiveEnd
      );

      const workingDays = workingDateKeys.length;

      if (workingDays === 0) {
        result.skipped++;
        continue;
      }

      // --------------------------------------------
      // 2. Validate monthly salary
      // --------------------------------------------

      const monthlySalary = Number(employee.salary);

      if (
        !Number.isFinite(monthlySalary) ||
        monthlySalary < 0
      ) {
        throw new Error("Invalid employee salary.");
      }

      // Salary is assumed to be monthly.
      // Employees joining mid-month receive prorated salary.
      const perDaySalary =
        monthlySalary / totalMonthWorkingDays;

      const basicSalary =
        perDaySalary * workingDays;

      // --------------------------------------------
      // 3. Fetch attendance records
      // --------------------------------------------

      const attendanceRecords = await Attendance.find({
        employee: employee._id,
        dateKey: {
          $gte: getDateKey(effectiveStart),
          $lte: getDateKey(effectiveEnd),
        },
      }).lean();

      const attendanceMap = new Set();

      for (const attendance of attendanceRecords) {
        if (
          workingDateKeys.includes(attendance.dateKey) &&
          attendance.checkIn
        ) {
          attendanceMap.add(attendance.dateKey);
        }
      }

      // --------------------------------------------
      // 4. Fetch approved leave records
      // --------------------------------------------

      const approvedLeaves = await Leave.find({
        employee: employee._id,
        status: "Approved",
        startDate: { $lte: effectiveEnd },
        endDate: { $gte: effectiveStart },
      }).lean();

      const leaveMap = getLeaveDayMap(
        approvedLeaves,
        effectiveStart,
        effectiveEnd
      );

      // --------------------------------------------
      // 5. Classify working days
      // --------------------------------------------

      let presentDays = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let absentDays = 0;

      for (const dateKey of workingDateKeys) {
        // Attendance takes priority over leave.
        if (attendanceMap.has(dateKey)) {
          presentDays++;
          continue;
        }

        const leaveType = leaveMap.get(dateKey);

        if (leaveType === "Unpaid") {
          unpaidLeaveDays++;
        } else if (leaveType) {
          paidLeaveDays++;
        } else {
          absentDays++;
        }
      }

      // --------------------------------------------
      // 6. Calculate salary
      // --------------------------------------------

      const allowances = {
        hra: 0,
        transport: 0,
        bonus: 0,
        other: 0,
      };

      const totalAllowances =
        allowances.hra +
        allowances.transport +
        allowances.bonus +
        allowances.other;

      const grossSalary =
        basicSalary + totalAllowances;

      // Both unpaid approved leave and unapproved
      // absences are deductible under the current policy.
      const deductibleDays =
        unpaidLeaveDays + absentDays;

      const unpaidLeaveDeduction =
        perDaySalary * deductibleDays;

      const otherDeductions = 0;

      const totalDeductions =
        unpaidLeaveDeduction + otherDeductions;

      const netSalary = Math.max(
        0,
        grossSalary - totalDeductions
      );

      // --------------------------------------------
      // 7. Check existing payroll
      // --------------------------------------------

      const existingPayroll = await Payroll.findOne({
        employee: employee._id,
        month,
      });

      if (existingPayroll) {
        // Existing records can only be recalculated
        // when explicitly requested and still Draft.
        if (
          !recalculateDrafts ||
          existingPayroll.status !== "Draft"
        ) {
          result.skipped++;
          continue;
        }
      }

      // --------------------------------------------
      // 8. Prepare payroll data
      // --------------------------------------------

      const payrollData = {
        employee: employee._id,

        employeeId: employee.employeeId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        designation: employee.designation,

        department: employee.department?._id || null,
        departmentName:
          employee.department?.departmentName || "",

        month,

        salarySnapshot: monthlySalary,

        workingDays,
        presentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        absentDays,

        perDaySalary: Number(
          perDaySalary.toFixed(2)
        ),

        basicSalary: Number(
          basicSalary.toFixed(2)
        ),

        allowances,

        totalAllowances: Number(
          totalAllowances.toFixed(2)
        ),

        grossSalary: Number(
          grossSalary.toFixed(2)
        ),

        unpaidLeaveDeduction: Number(
          unpaidLeaveDeduction.toFixed(2)
        ),

        otherDeductions,

        totalDeductions: Number(
          totalDeductions.toFixed(2)
        ),

        netSalary: Number(
          netSalary.toFixed(2)
        ),
      };

      // --------------------------------------------
      // 9. Update Draft or create new payroll
      // --------------------------------------------

      let payroll;

      if (existingPayroll) {
        // The status condition protects against a concurrent
        // approval changing the record before this update.
        payroll = await Payroll.findOneAndUpdate(
          {
            _id: existingPayroll._id,
            status: "Draft",
          },
          {
            $set: payrollData,
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!payroll) {
          result.skipped++;
          continue;
        }

        result.updated++;
      } else {
        payroll = await Payroll.create({
          ...payrollData,
          status: "Draft",
          generatedBy: adminId,
        });

        result.created++;
      }

      result.payrolls.push(payroll);
    } catch (error) {
      if (error.code === 11000) {
        result.skipped++;
        continue;
      }

      result.failed.push({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        error: error.message,
      });
    }
  }

  return result;
};
