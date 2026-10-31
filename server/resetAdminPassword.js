
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import connectToDatabase from "./db/db.js";

const resetAdminPassword = async () => {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
    }

    await connectToDatabase();

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    const admin = await User.findOneAndUpdate(
      { email, role: "admin" },
      { $set: { password: passwordHash } },
      { new: true }
    );

    if (!admin) {
      console.log("Admin account not found. No account was modified.");
      return;
    }

    console.log("Admin password reset successfully.");
  } catch (error) {
    console.error("Admin password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

resetAdminPassword();
