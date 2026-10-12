
import mongoose from "mongoose";

const hrPolicyChunkSchema = new mongoose.Schema(
    {
        documentId: {
            type: String,
            required: true,
            index: true
        },

        documentName: {
            type: String,
            required: true,
            trim: true
        },

        chunkIndex: {
            type: Number,
            required: true,
            min: 0
        },

        content: {
            type: String,
            required: true,
            trim: true
        },

        // The embedding will be generated in a later step.
        embedding: {
            type: [Number],
            default: undefined
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

// Each chunk number must be unique within a document.
hrPolicyChunkSchema.index(
    { documentId: 1, chunkIndex: 1 },
    { unique: true }
);

const HRPolicyChunk = mongoose.model(
    "HRPolicyChunk",
    hrPolicyChunkSchema
);

export default HRPolicyChunk;
