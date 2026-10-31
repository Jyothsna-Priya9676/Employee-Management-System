
import Payroll from "../models/Payroll.js";
import { generateMonthlyPayroll } from "../services/payrollService.js";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const isAdmin = (req) => {
  return req.user?.role?.toLowerCase() === "admin";
};

const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

// --------------------------------------------------
// GENERATE PAYROLL
// POST /api/payroll/generate
// --------------------------------------------------

export const generatePayroll = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Only admins can generate payroll.",
      });
    }

    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        message: "Payroll month is required.",
      });
    }

    const result = await generateMonthlyPayroll(
      month,
      getUserId(req)
    );

    return res.status(201).json({
      message: "Payroll generation completed.",
      result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// --------------------------------------------------
// RECALCULATE DRAFT PAYROLL
// POST /api/payroll/recalculate-drafts
// --------------------------------------------------

export const recalculateDraftPayroll = async (
  req,
  res
) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Only admins can recalculate payroll.",
      });
    }

    const { month } = req.body;

    if (!month) {
      return res.status(400).json({
        message: "Payroll month is required.",
      });
    }

    const result = await generateMonthlyPayroll(
      month,
      getUserId(req),
      {
        recalculateDrafts: true,
      }
    );

    return res.status(200).json({
      message: "Draft payroll recalculation completed.",
      result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// --------------------------------------------------
// GET PAYROLL LIST
// GET /api/payroll
// --------------------------------------------------

export const getPayrolls = async (req, res) => {
  try {
    const {
      month,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(
      1,
      Number.parseInt(page, 10) || 1
    );

    const limitNumber = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 10)
    );

    const filter = {};

    // Employees can only view their own payroll.
    if (!isAdmin(req)) {
      const email = req.user?.email?.toLowerCase();

      if (!email) {
        return res.status(400).json({
          message: "User email is missing.",
        });
      }

      filter.employeeEmail = email;
    }

    if (month) {
      filter.month = month;
    }

    if (status) {
      const validStatuses = [
        "Draft",
        "Reviewed",
        "Approved",
        "Paid",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid payroll status.",
        });
      }

      filter.status = status;
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter)
        .sort({ month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Payroll.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Payroll records fetched successfully.",
      payrolls,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// --------------------------------------------------
// GET PAYROLL BY ID
// GET /api/payroll/:id
// --------------------------------------------------

export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(
      req.params.id
    ).lean();

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    // Employees can only access their own payroll.
    if (!isAdmin(req)) {
      const userEmail = req.user?.email?.toLowerCase();

      if (
        !userEmail ||
        payroll.employeeEmail?.toLowerCase() !== userEmail
      ) {
        return res.status(403).json({
          message: "You cannot access this payroll record.",
        });
      }
    }

    return res.status(200).json({
      message: "Payroll fetched successfully.",
      payroll,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// --------------------------------------------------
// UPDATE PAYROLL STATUS
// PATCH /api/payroll/:id/status
// --------------------------------------------------

export const updatePayrollStatus = async (
  req,
  res
) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "Only admins can update payroll status.",
      });
    }

    const { status } = req.body;

    const allowedTransitions = {
      Draft: "Reviewed",
      Reviewed: "Approved",
      Approved: "Paid",
    };

    if (!allowedTransitions[status]) {
      return res.status(400).json({
        message: "Invalid target payroll status.",
      });
    }

    const payroll = await Payroll.findById(
      req.params.id
    );

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    const expectedNextStatus =
      allowedTransitions[payroll.status];

    if (expectedNextStatus !== status) {
      return res.status(400).json({
        message: `Cannot change payroll from ${payroll.status} to ${status}.`,
      });
    }

    const adminId = getUserId(req);

    // Store the person and time for each workflow step.
    if (status === "Reviewed") {
      payroll.reviewedBy = adminId;
      payroll.reviewedAt = new Date();
    }

    if (status === "Approved") {
      payroll.approvedBy = adminId;
      payroll.approvedAt = new Date();
    }

    if (status === "Paid") {
      payroll.paidBy = adminId;
      payroll.paidAt = new Date();
    }

    payroll.status = status;

    await payroll.save();

    return res.status(200).json({
      message: `Payroll ${status.toLowerCase()} successfully.`,
      payroll,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
