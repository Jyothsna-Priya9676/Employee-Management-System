
import { useState, useEffect } from "react";
import api from "../utils/api";

const INITIAL_MESSAGE = {
    role: "assistant",
    content:
        "Hello! I'm your Smart HRMS AI Assistant.\n\n" +
        "I can help you with:\n" +
        "• General HR processes\n" +
        "• Attendance procedures\n" +
        "• Leave procedures\n\n" +
        "What would you like to know?"
};

const AIAssistant = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");
    const [lastQuestion, setLastQuestion] = useState("");

    // Load saved messages when the page opens.
    useEffect(() => {
        let cancelled = false;

        const loadHistory = async () => {
            try {
                const response = await api.get("/ai/history");

                if (cancelled) return;

                const savedMessages = response.data?.messages ?? [];

                setMessages(
                    savedMessages.length > 0
                        ? savedMessages.map((item) => ({
                              role: item.role,
                              content: item.content,
                              source: item.source ?? null,
                              aiUnavailable: Boolean(item.aiUnavailable),
                              finishReason: item.finishReason ?? null,
                              policySources: item.policySources ?? []
                          }))
                        : [INITIAL_MESSAGE]
                );
            } catch (requestError) {
                if (cancelled) return;

                setHistoryError(
                    requestError.response?.status === 401
                        ? "Your session has expired. Please log in again."
                        : "Unable to load saved chat history. Please refresh the page."
                );
            } finally {
                if (!cancelled) {
                    setHistoryLoading(false);
                }
            }
        };

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, []);

    const persistMessage = async (chatMessage) => {
        await api.post("/ai/history/messages", chatMessage);
    };

    const sendMessage = async (event, retryQuestion = null) => {
        event?.preventDefault();

        const question = (retryQuestion ?? message).trim();

        if (!question || loading || historyLoading) return;

        if (question.length > 1000) {
            setError("Your question must not exceed 1000 characters.");
            return;
        }

        setError("");
        setHistoryError("");
        setLastQuestion(question);

        // Add the question locally only on the first attempt.
        if (retryQuestion === null) {
            setMessages((previous) => [
                ...previous,
                { role: "user", content: question }
            ]);

            setMessage("");

            // Saving history must not prevent the AI request.
            try {
                await persistMessage({
                    role: "user",
                    content: question
                });
            } catch (saveError) {
                setHistoryError(
                    "Your question could not be saved. The AI will still try to answer."
                );
            }
        }

        setLoading(true);

        try {
            const response = await api.post("/ai/chat", {
                message: question
            });

            const data = response.data;
            const answer = data?.answer;

            if (
                !data?.success ||
                typeof answer !== "string" ||
                !answer.trim()
            ) {
                throw new Error(
                    data?.error || "The AI assistant returned no answer."
                );
            }

            const assistantMessage = {
                role: "assistant",
                content: answer.trim(),
                source: data.source || "ai",
                aiUnavailable: Boolean(data.aiUnavailable),
                finishReason: data.finishReason || null,
                policySources: data.policySources || []
            };

            setMessages((previous) => [
                ...previous,
                assistantMessage
            ]);

            // Save the AI response separately.
            try {
                await persistMessage(assistantMessage);
            } catch (saveError) {
                setHistoryError(
                    "The answer was received, but it could not be saved. It may disappear after refresh."
                );
            }

            if (data.finishReason === "MAX_TOKENS") {
                setError(
                    "The AI response may be incomplete because it reached the generation limit. Try asking a shorter question."
                );
            }
        } catch (requestError) {
            const status = requestError.response?.status;

            let errorMessage =
                requestError.response?.data?.error ||
                requestError.message ||
                "Unable to contact the AI assistant. Please try again.";

            if (status === 401) {
                errorMessage =
                    "Your session may have expired. Please log in again.";
            } else if (status === 403) {
                errorMessage =
                    "Your account does not have permission to use the AI assistant.";
            } else if (status === 429) {
                errorMessage =
                    requestError.response?.data?.error ||
                    "The AI usage limit has been reached. Please try again later.";
            } else if (status >= 500) {
                errorMessage =
                    requestError.response?.data?.error ||
                    "The service is temporarily unavailable. Please try again.";
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = async () => {
        if (loading || historyLoading) return;

        const confirmed = window.confirm(
            "Clear your saved chat history? This cannot be undone."
        );

        if (!confirmed) return;

        setError("");
        setHistoryError("");

        try {
            await api.delete("/ai/history");

            setMessages([INITIAL_MESSAGE]);
            setMessage("");
            setLastQuestion("");
        } catch (requestError) {
            setHistoryError(
                requestError.response?.data?.error ||
                "Unable to clear saved chat history."
            );
        }
    };

    return (
        <main className="container-fluid py-4">
            <div className="row justify-content-center">
                <div className="col-12 col-xl-9 col-xxl-8">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                        <div>
                            <h2 className="mb-1">AI HR Assistant</h2>
                            <p className="text-secondary mb-0">
                                Ask questions about HR processes, attendance,
                                and leave procedures.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={clearChat}
                            disabled={loading || historyLoading}
                        >
                            Clear chat
                        </button>
                    </div>

                    <section className="card border-0 shadow-sm">
                        <div className="card-header bg-white p-3">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                                    style={{
                                        width: 46,
                                        height: 46,
                                        flexShrink: 0
                                    }}
                                >
                                    AI
                                </div>

                                <div>
                                    <h5 className="mb-1">
                                        Smart HRMS Assistant
                                    </h5>
                                    <small
                                        className={
                                            loading
                                                ? "text-primary"
                                                : "text-success"
                                        }
                                    >
                                        {historyLoading
                                            ? "Loading chat history..."
                                            : loading
                                              ? "Generating response..."
                                              : "Ready to help"}
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div
                            className="card-body p-3 p-md-4"
                            style={{
                                height: "min(55vh, 520px)",
                                minHeight: "320px",
                                overflowY: "auto",
                                backgroundColor: "#f8f9fa"
                            }}
                            aria-live="polite"
                            aria-busy={loading || historyLoading}
                        >
                            {historyLoading ? (
                                <div className="text-center text-secondary py-5">
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Loading your saved conversation...
                                </div>
                            ) : (
                                messages.map((item, index) => {
                                    const isUser = item.role === "user";

                                    return (
                                        <div
                                            key={item._id || `${index}-${item.role}`}
                                            className={`d-flex mb-3 ${
                                                isUser
                                                    ? "justify-content-end"
                                                    : "justify-content-start"
                                            }`}
                                        >
                                            <div
                                                className={`rounded-3 px-3 py-3 shadow-sm ${
                                                    isUser
                                                        ? "bg-primary text-white"
                                                        : "bg-white border text-dark"
                                                }`}
                                                style={{
                                                    maxWidth: "90%",
                                                    minWidth: "100px",
                                                    overflowWrap: "anywhere"
                                                }}
                                            >
                                                <div className="small fw-semibold mb-2">
                                                    {isUser ? "You" : "AI Assistant"}
                                                </div>

                                                {!isUser && item.source === "database" && (
                                                    <div className="small text-success mb-2">
                                                        ✓ Verified HRMS database response
                                                    </div>
                                                )}

                                                {!isUser && item.source === "rag" && (
                                                    <div className="small text-success mb-2">
                                                        ✓ Answer based on retrieved HR policy
                                                    </div>
                                                )}

                                                {!isUser &&
                                                    ["ai", "gemini"].includes(item.source) && (
                                                        <div className="small text-secondary mb-2">
                                                            AI-generated response
                                                        </div>
                                                    )}

                                                <div
                                                    style={{
                                                        whiteSpace: "pre-wrap",
                                                        overflowWrap: "anywhere",
                                                        lineHeight: 1.65
                                                    }}
                                                >
                                                    {item.content}
                                                </div>

                                                {!isUser &&
                                                    item.policySources?.length > 0 && (
                                                        <div className="small text-secondary mt-3">
                                                            <strong>Policy sources:</strong>
                                                            <ul className="mb-0 ps-3">
                                                                {item.policySources.map(
                                                                    (source, sourceIndex) => (
                                                                        <li key={`${source.documentName}-${sourceIndex}`}>
                                                                            {source.documentName}
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {loading && (
                                <div className="d-flex justify-content-start mb-3">
                                    <div className="bg-white border rounded-3 px-3 py-3">
                                        <span
                                            className="spinner-border spinner-border-sm text-primary me-2"
                                            role="status"
                                            aria-label="Loading"
                                        />
                                        <span className="text-secondary">
                                            Thinking...
                                        </span>
                                    </div>
                                </div>
                            )}

                            {historyError && (
                                <div className="alert alert-warning mt-3" role="alert">
                                    {historyError}
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-warning mt-3" role="alert">
                                    <div className="mb-2">{error}</div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-dark"
                                        onClick={() =>
                                            sendMessage(null, lastQuestion)
                                        }
                                        disabled={loading || !lastQuestion || historyLoading}
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="card-footer bg-white p-3">
                            <form onSubmit={sendMessage}>
                                <label
                                    htmlFor="ai-message"
                                    className="form-label fw-semibold"
                                >
                                    Your question
                                </label>

                                <div className="input-group">
                                    <input
                                        id="ai-message"
                                        type="text"
                                        className="form-control"
                                        placeholder="Ask about leave or attendance..."
                                        value={message}
                                        onChange={(event) =>
                                            setMessage(event.target.value)
                                        }
                                        maxLength={1000}
                                        disabled={loading || historyLoading}
                                        autoComplete="off"
                                    />

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={
                                            loading ||
                                            historyLoading ||
                                            !message.trim()
                                        }
                                    >
                                        {loading ? "Sending..." : "↑ Send"}
                                    </button>
                                </div>

                                <div className="form-text mt-2">
                                    Maximum 1000 characters. Do not enter
                                    passwords, API keys, or other sensitive
                                    information.
                                </div>
                            </form>
                        </div>
                    </section>

                    <p className="text-secondary small mt-3">
                        AI responses may be inaccurate. Confirm company
                        policies with your HR administrator. This assistant
                        does not approve leave or make employment decisions.
                    </p>
                </div>
            </div>
        </main>
    );
};

export default AIAssistant;
