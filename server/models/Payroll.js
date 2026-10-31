
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    employeeId: {
      type: String,
      required: true,
      trim: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    employeeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    designation: {
      type: String,
      default: "",
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    departmentName: {
      type: String,
      default: "Unassigned",
    },

    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },

    salarySnapshot: {
      type: Number,
      required: true,
      min: 0,
    },

    workingDays: {
      type: Number,
      required: true,
      min: 0,
    },

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    perDaySalary: {
      type: Number,
      required: true,
      min: 0,
    },

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    allowances: {
      hra: { type: Number, default: 0, min: 0 },
      transport: { type: Number, default: 0, min: 0 },
      bonus: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },

    totalAllowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    unpaidLeaveDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Reviewed", "Approved", "Paid"],
      default: "Draft",
      index: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: Date,
    approvedAt: Date,
    paidAt: Date,
  },
  {
    timestamps: true,
  }
);

// One employee can have only one payroll record per month.
payrollSchema.index(
  { employee: 1, month: 1 },
  { unique: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;
