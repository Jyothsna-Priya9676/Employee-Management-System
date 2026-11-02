
import bcrypt from "bcrypt";
import User from "./models/User.js";

const ensureAdminUser = async () => {
    try {
        const configuredEmail = process.env.ADMIN_EMAIL;
        const configuredPassword = process.env.ADMIN_PASSWORD;

        if (!configuredEmail || !configuredPassword) {
            throw new Error(
                "ADMIN_EMAIL and ADMIN_PASSWORD must be configured"
            );
        }

        const email = configuredEmail.trim().toLowerCase();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.role !== "admin") {
                throw new Error(
                    "The configured admin email already belongs to a non-admin user."
                );
            }

            console.log("Admin account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(
            configuredPassword,
            12
        );

        await User.create({
            name: "Admin",
            email,
            password: hashedPassword,
            role: "admin",
        });

        console.log("Admin account created successfully.");
    } catch (error) {
        console.error("Admin account setup failed:", error.message);
        throw error;
    }
};

export default ensureAdminUser;
