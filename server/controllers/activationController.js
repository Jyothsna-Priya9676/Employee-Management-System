
import User from "../models/User.js";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";

const activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body ?? {};

    // 1. Validate request data
    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Activation token and password are required.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        error: "Password must contain between 8 and 128 characters.",
      });
    }

    // 2. Hash the token received from the email.
    // The database stores the hash, not the original token.
    const tokenHash = createHash("sha256")
      .update(token.trim())
      .digest("hex");

    // 3. Find the pending account
    const user = await User.findOne({
      activationTokenHash: tokenHash,
      isActivated: false,
      activationTokenExpiresAt: { $gt: new Date() },
    }).select("+activationTokenHash +activationTokenExpiresAt");

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Activation link is invalid, expired, or already used.",
      });
    }

    // 4. Hash the employee's new password
    user.password = await bcrypt.hash(password, 12);

    // 5. Activate the account and remove the one-time token
    user.isActivated = true;
    user.activationTokenHash = undefined;
    user.activationTokenExpiresAt = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account activated successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Account activation error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to activate account. Please try again.",
    });
  }
};

export { activateAccount };
