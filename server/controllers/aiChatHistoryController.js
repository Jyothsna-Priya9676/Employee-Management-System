
import AIChat from "../models/AIChat.js";

const getUserId = (req) => req.user?._id;

export const getChatHistory = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        const chat = await AIChat.findOne({ user: userId }).lean();

        return res.status(200).json({
            success: true,
            messages: chat?.messages ?? []
        });
    } catch (error) {
        console.error("Get AI chat history error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to load chat history."
        });
    }
};

export const saveChatMessage = async (req, res) => {
    try {
        const userId = getUserId(req);
        const {
            role,
            content,
            source,
            aiUnavailable,
            finishReason,
            policySources
        } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        if (
            !["user", "assistant"].includes(role) ||
            typeof content !== "string" ||
            !content.trim() ||
            content.length > 10000
        ) {
            return res.status(400).json({
                success: false,
                error: "A valid chat message is required."
            });
        }

        const safePolicySources = Array.isArray(policySources)
            ? policySources
                .filter(
                    (item) =>
                        item &&
                        typeof item.documentName === "string"
                )
                .slice(0, 10)
                .map((item) => ({
                    documentName: item.documentName.slice(0, 200),
                    score: Number.isFinite(item.score)
                        ? item.score
                        : undefined
                }))
            : [];

        const message = {
            role,
            content: content.trim(),
            source:
                typeof source === "string"
                    ? source.slice(0, 50)
                    : null,
            aiUnavailable: Boolean(aiUnavailable),
            finishReason:
                typeof finishReason === "string"
                    ? finishReason.slice(0, 100)
                    : null,
            policySources: safePolicySources
        };

        const chat = await AIChat.findOneAndUpdate(
            { user: userId },
            {
                $setOnInsert: { user: userId },
                $push: {
                    messages: {
                        $each: [message],
                        $slice: -500
                    }
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        const savedMessage = chat.messages[chat.messages.length - 1];

        return res.status(201).json({
            success: true,
            message: savedMessage
        });
    } catch (error) {
        console.error("Save AI chat message error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to save chat message."
        });
    }
};

export const clearChatHistory = async (req, res) => {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Authentication required."
            });
        }

        await AIChat.findOneAndUpdate(
            { user: userId },
            { $set: { messages: [] } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Chat history cleared."
        });
    } catch (error) {
        console.error("Clear AI chat history error:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to clear chat history."
        });
    }
};
