
import "dotenv/config";
import { verifyEmailConnection } from "./services/emailService.js";

try {
  await verifyEmailConnection();
  console.log("Gmail connection successful!");
} catch (error) {
  console.error("Gmail connection failed:", error.message);
  process.exitCode = 1;
}
