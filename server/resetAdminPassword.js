
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import connectToDatabase from "./db/db.js";

const resetAdminPassword = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be configured"
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await User.findOneAndUpdate(
      { email, role: "admin" },
      { $set: { password: passwordHash } },
      { new: true }
    );

    if (!admin) {
      throw new Error(
        `Admin account not found for configured email: ${email}`
      );
    }

    console.log("Admin password reset successfully.");
    return true;
  } catch (error) {
    console.error("Admin password reset failed:", error.message);
    throw error;
  }
};

export default resetAdminPassword;
