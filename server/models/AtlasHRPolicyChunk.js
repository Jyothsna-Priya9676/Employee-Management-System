
import mongoose from "mongoose";
import atlasConnection from "../db/atlasDb.js";

const atlasHRPolicyChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

atlasHRPolicyChunkSchema.index(
  { documentId: 1, chunkIndex: 1 },
  { unique: true }
);

const AtlasHRPolicyChunk = atlasConnection.model(
  "HRPolicyChunk",
  atlasHRPolicyChunkSchema,
  "hrpolicychunks"
);

export default AtlasHRPolicyChunk;
