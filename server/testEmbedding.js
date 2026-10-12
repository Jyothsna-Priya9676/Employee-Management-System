
import "dotenv/config";
import { generateEmbedding } from "./services/embeddingService.js";

try {
  const vector = await generateEmbedding(
    "Employees must submit planned leave requests in advance."
  );

  console.log("Embedding generated successfully!");
  console.log("Vector dimensions:", vector.length);
  console.log("First 5 values:", vector.slice(0, 5));
} catch (error) {
  console.error("Embedding test failed:", error);
  console.error("Error cause:", error.cause);
}
