
import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10000
        },
        source: {
            type: String,
            default: null
        },
        aiUnavailable: {
            type: Boolean,
            default: false
        },
        finishReason: {
            type: String,
            default: null
        },
        policySources: {
            type: [
                {
                    documentName: String,
                    score: Number
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

const aiChatSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },
        messages: {
            type: [chatMessageSchema],
            default: []
        }
    },
    { timestamps: true }
);

const AIChat = mongoose.model("AIChat", aiChatSchema);

export default AIChat;
