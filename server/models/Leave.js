import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
            index: true
        },

        leaveType: {
            type: String,
            enum: ["Casual", "Sick", "Earned", "Unpaid"],
            required: [true, "Leave type is required"]
        },

        startDate: {
            type: Date,
            required: [true, "Start date is required"]
        },

        endDate: {
            type: Date,
            required: [true, "End date is required"]
        },

        reason: {
            type: String,
            required: [true, "Leave reason is required"],
            trim: true,
            minlength: [5, "Reason must contain at least 5 characters"],
            maxlength: [500, "Reason cannot exceed 500 characters"]
        },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
            index: true
        },

        decisionNote: {
            type: String,
            trim: true,
            maxlength: [500, "Decision note cannot exceed 500 characters"],
            default: ""
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        reviewedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;