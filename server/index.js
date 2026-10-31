
import express from "express";
import cors from "cors";

import connectToDatabase from "./db/db.js";
import resetAdminPassword from "./resetAdminPassword.js";

import authRouter from "./routes/auth.js";
import employeeRouter from "./routes/employee.js";
import departmentRouter from "./routes/department.js";
import dashboardRouter from "./routes/dashboard.js";
import attendanceRouter from "./routes/attendance.js";
import leaveRouter from "./routes/leave.js";
import aiRouter from "./routes/ai.js";
import hrPolicyRouter from "./routes/hrPolicy.js";
import faceRoutes from "./routes/face.js";
import payrollRoutes from "./routes/payrollRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EMS API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leaveRouter);
app.use("/api/ai", aiRouter);
app.use("/api/hr-policies", hrPolicyRouter);
app.use("/api/face", faceRoutes);
app.use("/api/payroll", payrollRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

const startServer = async () => {
  try {
    // Connect to the production HRMS database
    await connectToDatabase();

    // Temporarily reset the admin password
    await resetAdminPassword();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();
