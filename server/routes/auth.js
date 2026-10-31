
import express from "express";
import {
  login,
  verify,
} from "../controllers/authController.js";

import { activateAccount } from "../controllers/activationController.js";
import verifyUser from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/activate", activateAccount);

router.get("/verify", verifyUser, verify);
router.get("/profile", verifyUser, verify);

export default router;
