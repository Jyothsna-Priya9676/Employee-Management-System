
import express from "express";
import verifyUser from "../middleware/authMiddleware.js";
import requireRole from "../middleware/roleMiddleware.js";
import {
    uploadHRPolicyMiddleware,
    uploadHRPolicy
} from "../controllers/hrPolicyController.js";
import {
  generatePolicyEmbeddings,
} from "../controllers/hrPolicyEmbeddingController.js";
const router = express.Router();

// Only authenticated admins can upload policies.
router.post(
    "/upload",
    verifyUser,
    requireRole("admin"),
    uploadHRPolicyMiddleware,
    uploadHRPolicy
);
router.post(
  "/generate-embeddings",
  verifyUser,
  requireRole("admin"),
  generatePolicyEmbeddings
);

export default router;
