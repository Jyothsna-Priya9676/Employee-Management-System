
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        dateKey: {
            type: String,
            required: true,
        },

        checkIn: {
            type: Date,
            required: true,
        },

        checkOut: {
            type: Date,
            default: null,
        },

        durationMinutes: {
            type: Number,
            default: null,
            min: 0,
        },

        status: {
            type: String,
            enum: ["Present", "Completed"],
            default: "Present",
        },
    },
    { timestamps: true }
);

// One attendance record per employee per day.
attendanceSchema.index(
    { employee: 1, dateKey: 1 },
    { unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
