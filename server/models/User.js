
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email is too long"],
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ["admin", "employee"],
        message: "Role must be admin or employee",
      },
      required: true,
      default: "employee",
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2048, "Profile image URL is too long"],
    },

    // Existing account activation fields
    isActivated: {
      type: Boolean,
      default: true,
    },

    activationTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },

    activationTokenExpiresAt: {
      type: Date,
      default: undefined,
      select: false,
    },

    // Face enrollment fields
    faceEnrolled: {
      type: Boolean,
      default: false,
    },

    faceDescriptor: {
      type: [Number],
      default: undefined,
      select: false,
      validate: {
        validator: function (value) {
          return (
            value === undefined ||
            (value.length === 128 &&
              value.every(
                (number) =>
                  Number.isFinite(number) &&
                  number >= -1 &&
                  number <= 1
              ))
          );
        },
        message: "Face descriptor must contain 128 valid numbers.",
      },
    },

    faceEnrolledAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.pre("save", function () {
  if (this.isModified("email") && typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }
});

const User = mongoose.model("User", userSchema);

export default User;
