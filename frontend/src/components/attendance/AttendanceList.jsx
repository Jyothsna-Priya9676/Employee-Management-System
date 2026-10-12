
import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";

const AttendanceList = () => {
    const [attendance, setAttendance] = useState([]);
    const [date, setDate] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0
    });

    const [summary, setSummary] = useState({
        totalRecords: 0,
        completed: 0,
        inProgress: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                page,
                limit: 10
            };

            if (date) params.date = date;
            if (employeeId.trim()) {
                params.employeeId = employeeId.trim();
            }
            if (statusFilter !== "All") {
                params.status = statusFilter;
            }

            const response = await api.get("/attendance", { params });
            const data = response.data;

            setAttendance(
                Array.isArray(data.attendance) ? data.attendance : []
            );

            setSummary({
                totalRecords: data.summary?.totalRecords ?? 0,
                completed: data.summary?.completed ?? 0,
                inProgress: data.summary?.inProgress ?? 0
            });

            setPagination({
                currentPage: data.pagination?.currentPage ?? page,
                totalPages: Math.max(
                    1,
                    data.pagination?.totalPages ?? 1
                ),
                totalRecords: data.pagination?.totalRecords ?? 0
            });
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to load attendance records."
            );

            setAttendance([]);
            setSummary({
                totalRecords: 0,
                completed: 0,
                inProgress: 0
            });
            setPagination({
                currentPage: 1,
                totalPages: 1,
                totalRecords: 0
            });
        } finally {
            setLoading(false);
        }
    }, [date, employeeId, statusFilter, page]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(1);

        // Fetch using the selected filters.
        // If page is already 1, the effect may not run again.
        fetchAttendance();
    };

    const handleReset = () => {
        setDate("");
        setEmployeeId("");
        setStatusFilter("All");
        setPage(1);
        setError("");
    };

    const handleStatusChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(1);
    };

    const formatDate = (value) => {
        if (!value) return "—";

        // dateKey may be YYYY-MM-DD; preserve the calendar date.
        const dateString = String(value);
        const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (match) {
            const [, year, month, day] = match;
            const dateObject = new Date(
                Date.UTC(Number(year), Number(month) - 1, Number(day))
            );

            return dateObject.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC"
            });
        }

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) return "—";

        return parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        });
    };

    const formatTime = (value) => {
        if (!value) return "—";

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) return "—";

        return parsed.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        });
    };

    const formatDuration = (minutes) => {
        if (minutes == null) return "In progress";

        const totalMinutes = Math.max(0, Number(minutes));
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        return `${hours}h ${remainingMinutes}m`;
    };

    const getStatusClass = (record) => {
        return record.checkOut
            ? "bg-success"
            : "bg-warning text-dark";
    };

    return (
        <div className="container-fluid py-3">
            {/* Heading */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1">
                        Attendance Management
                    </h3>
                    <p className="text-secondary mb-0">
                        Monitor employee check-ins, check-outs, and working hours.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={fetchAttendance}
                    disabled={loading}
                >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}

                    <button
                        type="button"
                        className="btn-close float-end"
                        aria-label="Dismiss error"
                        onClick={() => setError("")}
                    />
                </div>
            )}

            {/* Summary cards */}
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-3 bg-info bg-opacity-10 p-3">
                                <i className="bi bi-calendar-check fs-3 text-info"></i>
                            </div>
                            <div>
                                <p className="text-secondary mb-1">
                                    Total records
                                </p>
                                <h4 className="fw-bold mb-0">
                                    {summary.totalRecords}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-sm-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-3 bg-success bg-opacity-10 p-3">
                                <i className="bi bi-check-circle fs-3 text-success"></i>
                            </div>
                            <div>
                                <p className="text-secondary mb-1">
                                    Completed records
                                </p>
                                <h4 className="fw-bold mb-0">
                                    {summary.completed}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-sm-6 col-xl-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-3 bg-warning bg-opacity-10 p-3">
                                <i className="bi bi-clock-history fs-3 text-warning"></i>
                            </div>
                            <div>
                                <p className="text-secondary mb-1">
                                    In-progress records
                                </p>
                                <h4 className="fw-bold mb-0">
                                    {summary.inProgress}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4 col-lg-3">
                                <label
                                    htmlFor="attendanceDate"
                                    className="form-label fw-semibold"
                                >
                                    Attendance date
                                </label>
                                <input
                                    type="date"
                                    id="attendanceDate"
                                    className="form-control"
                                    value={date}
                                    onChange={(event) => {
                                        setDate(event.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>

                            <div className="col-md-4 col-lg-3">
                                <label
                                    htmlFor="employeeId"
                                    className="form-label fw-semibold"
                                >
                                    Employee ID
                                </label>
                                <input
                                    type="text"
                                    id="employeeId"
                                    className="form-control"
                                    placeholder="e.g. EMP-12345678"
                                    value={employeeId}
                                    onChange={(event) =>
                                        setEmployeeId(event.target.value)
                                    }
                                />
                            </div>

                            <div className="col-md-4 col-lg-3">
                                <label
                                    htmlFor="attendanceStatus"
                                    className="form-label fw-semibold"
                                >
                                    Status
                                </label>
                                <select
                                    id="attendanceStatus"
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={handleStatusChange}
                                >
                                    <option value="All">All statuses</option>
                                    <option value="Completed">Completed</option>
                                    <option value="In Progress">In progress</option>
                                </select>
                            </div>

                            <div className="col-lg-3 d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-info text-white flex-grow-1"
                                    disabled={loading}
                                >
                                    <i className="bi bi-search me-1"></i>
                                    Search
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleReset}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Attendance table */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="fw-bold mb-0">
                        Attendance Records
                    </h5>
                    <p className="text-secondary small mb-0 mt-1">
                        Records matching your selected filters.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-info" role="status">
                            <span className="visually-hidden">
                                Loading...
                            </span>
                        </div>
                        <p className="text-secondary mt-3 mb-0">
                            Loading attendance records...
                        </p>
                    </div>
                ) : error && attendance.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="bi bi-exclamation-circle fs-1 text-danger"></i>
                        <p className="text-secondary mt-3">
                            Could not retrieve attendance records.
                        </p>
                        <button
                            type="button"
                            className="btn btn-info text-white"
                            onClick={fetchAttendance}
                        >
                            Try again
                        </button>
                    </div>
                ) : attendance.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="bi bi-calendar-x fs-1 text-secondary"></i>
                        <h5 className="mt-3">
                            No attendance records found
                        </h5>
                        <p className="text-secondary mb-0">
                            Try changing the date, employee ID, or status filter.
                        </p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="px-3">Employee</th>
                                    <th>Employee ID</th>
                                    <th>Department</th>
                                    <th>Date</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Working hours</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {attendance.map((record) => {
                                    const employee = record.employee || {};
                                    const department = employee.department;

                                    const departmentName =
                                        typeof department === "object"
                                            ? department?.departmentName
                                            : "";

                                    return (
                                        <tr key={record._id}>
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

                                            <td>
                                                {departmentName || "—"}
                                            </td>

                                            <td className="text-nowrap">
                                                {formatDate(record.dateKey || record.date)}
                                            </td>

                                            <td className="text-nowrap">
                                                {formatTime(record.checkIn)}
                                            </td>

                                            <td className="text-nowrap">
                                                {formatTime(record.checkOut)}
                                            </td>

                                            <td className="text-nowrap">
                                                {formatDuration(record.durationMinutes)}
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge ${getStatusClass(record)}`}
                                                >
                                                    {record.checkOut
                                                        ? "Completed"
                                                        : "In progress"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && pagination.totalRecords > 0 && (
                    <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <span className="small text-secondary">
                            Page {pagination.currentPage} of{" "}
                            {pagination.totalPages}
                            {" · "}
                            {pagination.totalRecords} matching records
                        </span>

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={page <= 1 || loading}
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1)
                                    )
                                }
                            >
                                <i className="bi bi-chevron-left me-1"></i>
                                Previous
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={
                                    page >= pagination.totalPages || loading
                                }
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(
                                            pagination.totalPages,
                                            current + 1
                                        )
                                    )
                                }
                            >
                                Next
                                <i className="bi bi-chevron-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceList;
