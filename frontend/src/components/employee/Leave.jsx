
import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";

const INITIAL_FORM = {
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: ""
};

const Leave = () => {
    const [form, setForm] = useState(INITIAL_FORM);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const fetchMyLeaves = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/leaves/me");
            const data = response.data;

            setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to load your leave requests."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyLeaves();
    }, [fetchMyLeaves]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

        setError("");
        setNotice("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setNotice("");

        const reason = form.reason.trim();

        if (!form.leaveType || !form.startDate || !form.endDate || !reason) {
            setError("Please fill in all leave application fields.");
            return;
        }

        if (reason.length < 5 || reason.length > 500) {
            setError("The reason must contain between 5 and 500 characters.");
            return;
        }

        if (form.endDate < form.startDate) {
            setError("End date cannot be before the start date.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await api.post("/leaves", {
                leaveType: form.leaveType,
                startDate: form.startDate,
                endDate: form.endDate,
                reason
            });

            setNotice(
                response.data.message ||
                "Leave request submitted successfully."
            );

            setForm(INITIAL_FORM);

            await fetchMyLeaves();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to submit your leave request."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Employee: Cancel their own pending leave request.
    const handleCancelLeave = async (leaveId) => {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this pending leave request?"
        );

        if (!confirmed) return;

        setError("");
        setNotice("");
        setCancellingId(leaveId);

        try {
            const response = await api.patch(
                `/leaves/${leaveId}/cancel`
            );

            setNotice(
                response.data.message ||
                "Leave request cancelled successfully."
            );

            await fetchMyLeaves();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to cancel your leave request."
            );
        } finally {
            setCancellingId("");
        }
    };

    const formatDate = (value) => {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "Approved":
                return "bg-success";
            case "Rejected":
                return "bg-danger";
            case "Pending":
                return "bg-warning text-dark";
            case "Cancelled":
                return "bg-secondary";
            default:
                return "bg-secondary";
        }
    };

    return (
        <div className="container-fluid py-3">
            {/* Page heading */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1">Leave Management</h4>
                    <p className="text-secondary mb-0">
                        Apply for leave and track your application status.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={fetchMyLeaves}
                    disabled={loading || submitting || Boolean(cancellingId)}
                >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* Feedback messages */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </div>
            )}

            {notice && (
                <div className="alert alert-success" role="status">
                    <i className="bi bi-check-circle me-2"></i>
                    {notice}
                </div>
            )}

            {/* Apply for leave */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white py-3">
                    <h5 className="fw-bold mb-1">Apply for Leave</h5>
                    <p className="text-secondary small mb-0">
                        Submit a leave request for admin approval.
                    </p>
                </div>

                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6 col-lg-3">
                                <label
                                    htmlFor="leaveType"
                                    className="form-label fw-semibold"
                                >
                                    Leave Type
                                </label>

                                <select
                                    id="leaveType"
                                    name="leaveType"
                                    className="form-select"
                                    value={form.leaveType}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    required
                                >
                                    <option value="Casual">Casual Leave</option>
                                    <option value="Sick">Sick Leave</option>
                                    <option value="Earned">Earned Leave</option>
                                    <option value="Unpaid">Unpaid Leave</option>
                                </select>
                            </div>

                            <div className="col-md-6 col-lg-3">
                                <label
                                    htmlFor="startDate"
                                    className="form-label fw-semibold"
                                >
                                    Start Date
                                </label>

                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    className="form-control"
                                    value={form.startDate}
                                    min={new Date().toLocaleDateString("en-CA", {
                                        timeZone: "Asia/Kolkata"
                                    })}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    required
                                />
                            </div>

                            <div className="col-md-6 col-lg-3">
                                <label
                                    htmlFor="endDate"
                                    className="form-label fw-semibold"
                                >
                                    End Date
                                </label>

                                <input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    className="form-control"
                                    value={form.endDate}
                                    min={
                                        form.startDate ||
                                        new Date().toLocaleDateString("en-CA", {
                                            timeZone: "Asia/Kolkata"
                                        })
                                    }
                                    onChange={handleChange}
                                    disabled={submitting}
                                    required
                                />
                            </div>

                            <div className="col-md-6 col-lg-3">
                                <label
                                    htmlFor="reason"
                                    className="form-label fw-semibold"
                                >
                                    Reason for Leave
                                </label>

                                <input
                                    id="reason"
                                    name="reason"
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter your reason"
                                    value={form.reason}
                                    onChange={handleChange}
                                    minLength={5}
                                    maxLength={500}
                                    disabled={submitting}
                                    required
                                />

                                <div className="form-text">
                                    Enter 5–500 characters.
                                </div>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end mt-4">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || Boolean(cancellingId)}
                            >
                                {submitting ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            aria-hidden="true"
                                        ></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send me-2"></i>
                                        Submit Leave Request
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Employee leave history */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="fw-bold mb-1">My Leave Requests</h5>
                    <p className="text-secondary small mb-0">
                        Track the status and decisions for your applications.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border text-primary"
                            role="status"
                        >
                            <span className="visually-hidden">Loading...</span>
                        </div>

                        <p className="text-secondary mt-3 mb-0">
                            Loading your leave requests...
                        </p>
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="card-body text-center py-5">
                        <i className="bi bi-calendar2-check fs-1 text-secondary"></i>

                        <h6 className="fw-bold mt-3">
                            No leave requests yet
                        </h6>

                        <p className="text-secondary mb-0">
                            Your submitted leave applications will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="px-3">Leave Type</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Decision Note</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {leaves.map((leave) => (
                                    <tr key={leave._id}>
                                        <td className="px-3 text-nowrap">
                                            {leave.leaveType || "—"}
                                        </td>

                                        <td className="text-nowrap">
                                            {formatDate(leave.startDate)}
                                        </td>

                                        <td className="text-nowrap">
                                            {formatDate(leave.endDate)}
                                        </td>

                                        <td
                                            style={{
                                                minWidth: "180px",
                                                maxWidth: "280px"
                                            }}
                                        >
                                            <div className="text-break">
                                                {leave.reason || "—"}
                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`badge ${getStatusClass(
                                                    leave.status
                                                )}`}
                                            >
                                                {leave.status || "Unknown"}
                                            </span>
                                        </td>

                                        <td style={{ minWidth: "200px" }}>
                                            {leave.status === "Pending" ? (
                                                <span className="text-secondary small">
                                                    Awaiting review
                                                </span>
                                            ) : (
                                                <>
                                                    <div className="text-break small">
                                                        {leave.decisionNote?.trim() ||
                                                            "No decision note provided"}
                                                    </div>

                                                    {leave.reviewedAt && (
                                                        <div className="text-secondary small mt-1">
                                                            Reviewed{" "}
                                                            {formatDate(leave.reviewedAt)}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>

                                        <td className="text-nowrap">
                                            {leave.status === "Pending" ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() =>
                                                        handleCancelLeave(leave._id)
                                                    }
                                                    disabled={
                                                        Boolean(cancellingId) ||
                                                        submitting
                                                    }
                                                >
                                                    {cancellingId === leave._id ? (
                                                        <>
                                                            <span
                                                                className="spinner-border spinner-border-sm me-1"
                                                                aria-hidden="true"
                                                            ></span>
                                                            Cancelling...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-x-circle me-1"></i>
                                                            Cancel
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-secondary small">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && leaves.length > 0 && (
                    <div className="card-footer bg-white">
                        <span className="small text-secondary">
                            Total requests: {leaves.length}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leave;
