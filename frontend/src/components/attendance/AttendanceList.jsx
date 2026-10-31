
import { useCallback, useEffect, useState } from "react";
import api from "../../utils/api";

const INITIAL_PAGINATION = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
};

const INITIAL_SUMMARY = {
    totalRecords: 0,
    completed: 0,
    inProgress: 0,
};

const INITIAL_TODAY_SUMMARY = {
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    notCheckedIn: 0,
};

const AttendanceList = () => {
    const [attendance, setAttendance] = useState([]);
    const [date, setDate] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);

    const [pagination, setPagination] = useState(INITIAL_PAGINATION);
    const [summary, setSummary] = useState(INITIAL_SUMMARY);
    const [todaySummary, setTodaySummary] = useState(
        INITIAL_TODAY_SUMMARY
    );

    const [todayLoading, setTodayLoading] = useState(true);
    const [todayError, setTodayError] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTodaySummary = useCallback(async () => {
        setTodayLoading(true);
        setTodayError("");

        try {
            const response = await api.get(
                "/attendance/admin/today-summary"
            );

            const data = response.data?.summary ?? {};

            setTodaySummary({
                totalEmployees: data.totalEmployees ?? 0,
                checkedIn: data.checkedIn ?? 0,
                checkedOut: data.checkedOut ?? 0,
                notCheckedIn: data.notCheckedIn ?? 0,
            });
        } catch (err) {
            setTodayError(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    "Unable to load today's attendance summary."
            );
        } finally {
            setTodayLoading(false);
        }
    }, []);

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = {
                page,
                limit: 10,
            };

            if (date) {
                params.date = date;
            }

            if (employeeId.trim()) {
                params.employeeId = employeeId.trim();
            }

            if (statusFilter !== "All") {
                params.status = statusFilter;
            }

            const response = await api.get("/attendance", { params });
            const data = response.data ?? {};

            setAttendance(
                Array.isArray(data.attendance) ? data.attendance : []
            );

            setSummary({
                totalRecords: data.summary?.totalRecords ?? 0,
                completed: data.summary?.completed ?? 0,
                inProgress: data.summary?.inProgress ?? 0,
            });

            const serverPagination = data.pagination ?? {};
            const totalPages = Math.max(
                1,
                Number(serverPagination.totalPages) || 1
            );
            const currentPage = Math.min(
                totalPages,
                Math.max(
                    1,
                    Number(serverPagination.currentPage) || page
                )
            );

            setPagination({
                currentPage,
                totalPages,
                totalRecords: Number(serverPagination.totalRecords) || 0,
            });

            // Keep the page state aligned with the server's valid page.
            if (currentPage !== page) {
                setPage(currentPage);
            }
        } catch (err) {
            setError(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    "Unable to load attendance records."
            );

            setAttendance([]);
            setSummary(INITIAL_SUMMARY);
            setPagination(INITIAL_PAGINATION);
        } finally {
            setLoading(false);
        }
    }, [date, employeeId, statusFilter, page]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    useEffect(() => {
        fetchTodaySummary();
    }, [fetchTodaySummary]);

    const handleSearch = (event) => {
        event.preventDefault();

        if (page !== 1) {
            setPage(1);
            return;
        }

        fetchAttendance();
    };

    const handleReset = () => {
        setDate("");
        setEmployeeId("");
        setStatusFilter("All");
        setPage(1);
        setError("");
    };

    const handleRefresh = () => {
        fetchAttendance();
        fetchTodaySummary();
    };

    const formatDate = (value) => {
        if (!value) return "—";

        const dateString = String(value);
        const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (match) {
            const [, year, month, day] = match;

            return new Date(
                Date.UTC(Number(year), Number(month) - 1, Number(day))
            ).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            });
        }

        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) return "—";

        return parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
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
            timeZone: "Asia/Kolkata",
        });
    };

   const formatDuration = (minutes, checkIn, checkOut) => {
    let totalMinutes;

    // Prefer actual timestamps for completed attendance.
    if (checkIn && checkOut) {
        const start = new Date(checkIn).getTime();
        const end = new Date(checkOut).getTime();

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end < start
        ) {
            return "—";
        }

        totalMinutes = Math.floor((end - start) / 60000);
    } else if (checkIn) {
        return "In progress";
    } else if (
        minutes !== null &&
        minutes !== undefined &&
        minutes !== "" &&
        Number.isFinite(Number(minutes)) &&
        Number(minutes) >= 0
    ) {
        totalMinutes = Number(minutes);
    } else {
        return "—";
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return `${hours}h ${remainingMinutes}m`;
};

    const getStatusClass = (record) =>
        record.checkOut ? "bg-success" : "bg-warning text-dark";

    const todayCards = [
        {
            label: "Total employees",
            value: todaySummary.totalEmployees,
            icon: "bi-people",
            color: "info",
        },
        {
            label: "Checked in",
            value: todaySummary.checkedIn,
            icon: "bi-box-arrow-in-right",
            color: "success",
        },
        {
            label: "Checked out",
            value: todaySummary.checkedOut,
            icon: "bi-box-arrow-right",
            color: "primary",
        },
        {
            label: "Not checked in",
            value: todaySummary.notCheckedIn,
            icon: "bi-clock-history",
            color: "warning",
        },
    ];

    return (
        <div className="container-fluid py-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h3 className="fw-bold mb-1">Attendance Management</h3>
                    <p className="text-secondary mb-0">
                        Monitor employee check-ins, check-outs, and working
                        hours.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={handleRefresh}
                    disabled={loading || todayLoading}
                >
                    <i className="bi bi-arrow-clockwise me-2" />
                    {loading || todayLoading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {error}
                    <button
                        type="button"
                        className="btn-close float-end"
                        aria-label="Dismiss error"
                        onClick={() => setError("")}
                    />
                </div>
            )}

            <section className="mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">Today's Attendance</h5>
                        <p className="text-secondary small mb-0">
                            Daily employee attendance overview.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={fetchTodaySummary}
                        disabled={todayLoading}
                    >
                        <i className="bi bi-arrow-clockwise me-1" />
                        Refresh summary
                    </button>
                </div>

                {todayError && (
                    <div className="alert alert-warning" role="alert">
                        <i className="bi bi-exclamation-triangle me-2" />
                        {todayError}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary ms-2"
                            onClick={fetchTodaySummary}
                            disabled={todayLoading}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="row g-3">
                    {todayCards.map((item) => (
                        <div
                            className="col-sm-6 col-xl-3"
                            key={item.label}
                        >
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center gap-3">
                                    <div
                                        className={`rounded-3 bg-${item.color} bg-opacity-10 p-3`}
                                    >
                                        <i
                                            className={`bi ${item.icon} fs-3 text-${item.color}`}
                                        />
                                    </div>

                                    <div>
                                        <p className="text-secondary mb-1">
                                            {item.label}
                                        </p>
                                        <h4 className="fw-bold mb-0">
                                            {todayLoading ? (
                                                <span
                                                    className="spinner-border spinner-border-sm"
                                                    role="status"
                                                    aria-label="Loading"
                                                />
                                            ) : todayError ? (
                                                "—"
                                            ) : (
                                                item.value
                                            )}
                                        </h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="row g-3 mb-4">
                {[
                    {
                        label: "Total records",
                        value: summary.totalRecords,
                        icon: "bi-calendar-check",
                        color: "info",
                    },
                    {
                        label: "Completed records",
                        value: summary.completed,
                        icon: "bi-check-circle",
                        color: "success",
                    },
                    {
                        label: "In-progress records",
                        value: summary.inProgress,
                        icon: "bi-clock-history",
                        color: "warning",
                    },
                ].map((item) => (
                    <div className="col-sm-6 col-xl-4" key={item.label}>
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body d-flex align-items-center gap-3">
                                <div
                                    className={`rounded-3 bg-${item.color} bg-opacity-10 p-3`}
                                >
                                    <i
                                        className={`bi ${item.icon} fs-3 text-${item.color}`}
                                    />
                                </div>
                                <div>
                                    <p className="text-secondary mb-1">
                                        {item.label}
                                    </p>
                                    <h4 className="fw-bold mb-0">
                                        {summary.totalRecords === 0 && loading
                                            ? "—"
                                            : item.value}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
                                    onChange={(event) =>
                                        setDate(event.target.value)
                                    }
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
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                >
                                    <option value="All">All statuses</option>
                                    <option value="Completed">Completed</option>
                                    <option value="In Progress">
                                        In progress
                                    </option>
                                </select>
                            </div>

                            <div className="col-lg-3 d-flex gap-2">
                                <button
                                    type="submit"
                                    className="btn btn-info text-white flex-grow-1"
                                    disabled={loading}
                                >
                                    <i className="bi bi-search me-1" />
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

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="fw-bold mb-0">Attendance Records</h5>
                    <p className="text-secondary small mb-0 mt-1">
                        Records matching your selected filters.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border text-info"
                            role="status"
                        >
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
                        <i className="bi bi-exclamation-circle fs-1 text-danger" />
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
                        <i className="bi bi-calendar-x fs-1 text-secondary" />
                        <h5 className="mt-3">
                            No attendance records found
                        </h5>
                        <p className="text-secondary mb-0">
                            Try changing the date, employee ID, or status
                            filter.
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
                                    const employee = record.employee ?? {};
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
                                            <td>{departmentName || "—"}</td>
                                            <td className="text-nowrap">
                                                {formatDate(
                                                    record.dateKey || record.date
                                                )}
                                            </td>
                                            <td className="text-nowrap">
                                                {formatTime(record.checkIn)}
                                            </td>
                                            <td className="text-nowrap">
                                                {formatTime(record.checkOut)}
                                            </td>
                                            <td className="text-nowrap">
                                                {formatDuration(
                                                    record.durationMinutes,
                                                    record.checkIn,
                                                    record.checkOut
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge ${getStatusClass(
                                                        record
                                                    )}`}
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

                {!loading && pagination.totalRecords > 0 && (
                    <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <span className="small text-secondary">
                            Page {pagination.currentPage} of{" "}
                            {pagination.totalPages} ·{" "}
                            {pagination.totalRecords} matching records
                        </span>

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={
                                    pagination.currentPage <= 1 || loading
                                }
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1)
                                    )
                                }
                            >
                                <i className="bi bi-chevron-left me-1" />
                                Previous
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={
                                    pagination.currentPage >=
                                        pagination.totalPages ||
                                    loading
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
                                <i className="bi bi-chevron-right ms-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceList;
