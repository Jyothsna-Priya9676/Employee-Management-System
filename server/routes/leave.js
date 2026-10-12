
import express from "express";
import {
    applyForLeave,
    getMyLeaves,
    cancelMyLeave,
    getAllLeaves,
    decideLeave
} from "../controllers/leaveController.js";

import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyUser);

router.post("/", requireRole("employee"), applyForLeave);
router.get("/me", requireRole("employee"), getMyLeaves);
router.patch("/:id/cancel", requireRole("employee"), cancelMyLeave);

router.get("/", requireRole("admin"), getAllLeaves);
router.patch("/:id/decision", requireRole("admin"), decideLeave);

export default router;
