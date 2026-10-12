
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

const createEmployee = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        const email = "employee@example.com";
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log("Employee account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash("Employee@123", 10);

        await User.create({
            name: "Test Employee",
            email,
            password: hashedPassword,
            role: "employee"
        });

        console.log("Employee account created successfully.");
        console.log("Email: employee@example.com");
        console.log("Password: Employee@123");
    } catch (error) {
        console.error("Error creating employee:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createEmployee();
