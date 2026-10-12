
import HRPolicyChunk from "../models/HRPolicyChunk.js";
import { generateEmbedding } from "../services/embeddingService.js";

export const generatePolicyEmbeddings = async (req, res) => {
  try {
    const chunks = await HRPolicyChunk.find({
      embedding: { $exists: false },
    }).select("_id content");

    if (chunks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All policy chunks already have embeddings.",
        processed: 0,
      });
    }

    let processed = 0;

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);

      await HRPolicyChunk.updateOne(
        { _id: chunk._id },
        { $set: { embedding } }
      );

      processed++;
    }

    return res.status(200).json({
      success: true,
      message: "Policy embeddings generated successfully.",
      processed,
    });
  } catch (error) {
    console.error("Policy embedding error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to generate policy embeddings.",
    });
  }
};
