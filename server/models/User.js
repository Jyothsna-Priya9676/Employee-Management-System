
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must contain at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: [254, "Email is too long"],
            index: true
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false
        },

        role: {
            type: String,
            enum: {
                values: ["admin", "employee"],
                message: "Role must be admin or employee"
            },
            required: true,
            default: "employee"
        },

        profileImage: {
            type: String,
            default: "",
            trim: true,
            maxlength: [2048, "Profile image URL is too long"]
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Normalize email before saving.
userSchema.pre("save", function () {
    if (this.isModified("email") && typeof this.email === "string") {
        this.email = this.email.trim().toLowerCase();
    }
});

const User = mongoose.model("User", userSchema);

export default User;
