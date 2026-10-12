
import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";

const LeaveList = () => {
    const [leaves, setLeaves] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 1
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [decisionNotes, setDecisionNotes] = useState({});
    const [processingId, setProcessingId] = useState("");

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = { page, limit: 10 };

            if (statusFilter) {
                params.status = statusFilter;
            }

            const response = await api.get("/leaves", { params });
            const data = response.data;

            const fetchedLeaves = Array.isArray(data.leaves)
                ? data.leaves
                : [];

            const total = Number(
                data.pagination?.total ??
                data.pagination?.totalRecords ??
                data.count ??
                fetchedLeaves.length
            );

            const totalPages = Number(
                data.pagination?.totalPages ??
                data.pagination?.pages ??
                Math.ceil(total / 10)
            );

            setLeaves(fetchedLeaves);
            setPagination({
                total,
                pages: Math.max(1, totalPages || 1)
            });
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to load leave requests. Please try again."
            );
            setLeaves([]);
            setPagination({ total: 0, pages: 1 });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    const handleFilterChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(1);
        setNotice("");
        setError("");
    };

    const handleDecision = async (leaveId, status) => {
        const decisionNote = (decisionNotes[leaveId] || "").trim();

        if (!decisionNote) {
            setError(
                "Please enter a decision note before approving or rejecting."
            );
            return;
        }

        if (decisionNote.length > 500) {
            setError("Decision note cannot exceed 500 characters.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to ${status.toLowerCase()} this leave request?`
        );

        if (!confirmed) return;

        setProcessingId(leaveId);
        setError("");
        setNotice("");

        try {
            await api.patch(`/leaves/${leaveId}/decision`, {
                status,
                decisionNote
            });

            setNotice(
                `Leave request ${status.toLowerCase()} successfully.`
            );

            setDecisionNotes((previous) => {
                const updated = { ...previous };
                delete updated[leaveId];
                return updated;
            });

            await fetchLeaves();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                `Unable to ${status.toLowerCase()} this request.`
            );
        } finally {
            setProcessingId("");
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
            default:
                return "bg-secondary";
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1">Leave Requests</h3>
                    <p className="text-secondary mb-0">
                        Review and manage employee leave applications.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={fetchLeaves}
                    disabled={loading}
                >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

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

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row align-items-end g-3">
                        <div className="col-md-5 col-lg-4">
                            <label
                                htmlFor="leaveStatus"
                                className="form-label fw-semibold"
                            >
                                Filter by status
                            </label>

                            <select
                                id="leaveStatus"
                                className="form-select"
                                value={statusFilter}
                                onChange={handleFilterChange}
                            >
                                <option value="">All requests</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="col-md-7 col-lg-8 text-md-end">
                            <span className="text-secondary">
                                Total matching requests:{" "}
                                <strong>{pagination.total}</strong>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-info" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-secondary mt-3 mb-0">
                        Loading leave requests...
                    </p>
                </div>
            ) : leaves.length === 0 ? (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                        <i className="bi bi-calendar2-check fs-1 text-secondary"></i>
                        <h5 className="mt-3">No leave requests found</h5>
                        <p className="text-secondary mb-3">
                            {error
                                ? "We could not retrieve the requests."
                                : "There are no requests matching this filter."}
                        </p>
                        <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={fetchLeaves}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white py-3">
                        <h5 className="fw-bold mb-0">
                            Employee Leave Applications
                        </h5>
                        <p className="small text-secondary mb-0 mt-1">
                            Review employee details, leave dates, and decisions.
                        </p>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="px-3">Employee</th>
                                        <th>Employee ID</th>
                                        <th>Department</th>
                                        <th>Leave type</th>
                                        <th>Dates</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Decision / Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {leaves.map((leave) => {
                                        const employee = leave.employee || {};
                                        const isPending = leave.status === "Pending";
                                        const isProcessing = processingId === leave._id;
                                        const department = employee.department;

                                        const departmentName =
                                            typeof department === "object"
                                                ? department?.departmentName
                                                : "";

                                        return (
                                            <tr key={leave._id}>
                                                <td className="px-3">
                                                    <div className="fw-semibold">
                                                        {employee.name || "Unknown"}
                                                    </div>
                                                    <div className="small text-secondary">
                                                        {employee.email || "—"}
                                                    </div>
                                                </td>

                                                <td className="text-nowrap">
                                                    {employee.employeeId || "—"}
                                                </td>

                                                <td>{departmentName || "—"}</td>

                                                <td className="text-nowrap">
                                                    {leave.leaveType || "—"}
                                                </td>

                                                <td className="text-nowrap">
                                                    <div>{formatDate(leave.startDate)}</div>
                                                    <div className="small text-secondary">
                                                        to {formatDate(leave.endDate)}
                                                    </div>
                                                </td>

                                                <td
                                                    style={{
                                                        minWidth: "180px",
                                                        maxWidth: "260px"
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

                                                <td style={{ minWidth: "230px" }}>
                                                    {isPending ? (
                                                        <>
                                                            <textarea
                                                                className="form-control form-control-sm mb-2"
                                                                rows="2"
                                                                maxLength={500}
                                                                placeholder="Required decision note"
                                                                value={decisionNotes[leave._id] || ""}
                                                                onChange={(event) =>
                                                                    setDecisionNotes((previous) => ({
                                                                        ...previous,
                                                                        [leave._id]: event.target.value
                                                                    }))
                                                                }
                                                                disabled={isProcessing}
                                                            />

                                                            <div className="d-flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={() =>
                                                                        handleDecision(
                                                                            leave._id,
                                                                            "Approved"
                                                                        )
                                                                    }
                                                                    disabled={isProcessing}
                                                                >
                                                                    <i className="bi bi-check-lg me-1"></i>
                                                                    {isProcessing ? "Saving..." : "Approve"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger btn-sm"
                                                                    onClick={() =>
                                                                        handleDecision(
                                                                            leave._id,
                                                                            "Rejected"
                                                                        )
                                                                    }
                                                                    disabled={isProcessing}
                                                                >
                                                                    <i className="bi bi-x-lg me-1"></i>
                                                                    {isProcessing ? "Saving..." : "Reject"}
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div>
                                                            <div className="small text-break mb-1">
                                                                <strong>Note:</strong>{" "}
                                                                {leave.decisionNote?.trim() ||
                                                                    "No decision note recorded"}
                                                            </div>

                                                            <div className="small text-secondary">
                                                                Reviewed{" "}
                                                                {formatDate(leave.reviewedAt)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <span className="small text-secondary">
                            Page {page} of {pagination.pages}
                            {" · "}
                            {pagination.total} matching requests
                        </span>

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={page <= 1 || loading}
                                onClick={() =>
                                    setPage((current) => Math.max(1, current - 1))
                                }
                            >
                                <i className="bi bi-chevron-left me-1"></i>
                                Previous
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={page >= pagination.pages || loading}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(pagination.pages, current + 1)
                                    )
                                }
                            >
                                Next
                                <i className="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveList;
