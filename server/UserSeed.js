import User from "./models/User.js";
import bcrypt from "bcrypt";
import connectToDatabase from "./db/db.js";
import mongoose from "mongoose";

const UserRegister = async () => {
    try {
        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
            throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env");
        }

        await connectToDatabase();

        const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log("Admin user already exists");
            return;
        }

        const hashPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD,
            12
        );

        await User.create({
            name: "Admin",
            email,
            password: hashPassword,
            role: "admin"
        });

        console.log("Admin user created successfully");
    } catch (error) {
        console.error("Admin seed failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
};

UserRegister();