
import { useEffect, useState } from "react";
import api from "../../utils/api";

const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getCurrentMonthStart = () => {
    const now = new Date();
    return getDateString(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getToday = () => getDateString(new Date());

const formatPercentage = (value) =>
    `${(Number(value) || 0).toFixed(2)}%`;

const AttendanceRateAnalytics = () => {
    const [startDate, setStartDate] = useState(getCurrentMonthStart);
    const [endDate, setEndDate] = useState(getToday);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/dashboard/attendance-rate", {
                params: {
                    startDate,
                    endDate
                }
            });

            setAnalytics(response.data);
        } catch (err) {
            setAnalytics(null);
            setError(
                err.response?.data?.error ||
                "Could not load attendance rate analytics."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const summary = analytics?.summary;
    const employees = analytics?.employees || [];

    const metrics = [
        {
            label: "Overall Attendance Rate",
            value: formatPercentage(summary?.attendanceRate),
            color: "primary"
        },
        {
            label: "Expected Working Days",
            value: summary?.expectedWorkingDays ?? 0,
            color: "info"
        },
        {
            label: "Present Days",
            value: summary?.presentDays ?? 0,
            color: "success"
        },
        {
            label: "Absent Days",
            value: summary?.absentDays ?? 0,
            color: "danger"
        },
        {
            label: "Approved Leave Days",
            value: summary?.approvedLeaveDays ?? 0,
            color: "warning"
        }
    ];

    const handleApply = () => {
        if (!startDate || !endDate) {
            setError("Please select both dates.");
            return;
        }

        if (startDate > endDate) {
            setError("Start date cannot be after end date.");
            return;
        }

        fetchAnalytics();
    };

    return (
        <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h5 className="fw-bold mb-1">
                            Attendance Rate Analytics
                        </h5>
                        <p className="text-secondary small mb-0">
                            Compare employee attendance against expected
                            working days.
                        </p>
                    </div>

                    <div className="d-flex flex-wrap align-items-end gap-2">
                        <div>
                            <label className="form-label small mb-1">
                                From
                            </label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={startDate}
                                max={endDate || undefined}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label className="form-label small mb-1">
                                To
                            </label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={endDate}
                                min={startDate || undefined}
                                max={getToday()}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                            />
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleApply}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Apply"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-warning" role="alert">
                        {error}
                    </div>
                )}

                {loading && !analytics && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                        <p className="text-secondary mt-2 mb-0">
                            Calculating attendance rates...
                        </p>
                    </div>
                )}

                {!loading && !error && summary && (
                    <>
                        <div className="row g-3 mb-4">
                            {metrics.map((metric) => (
                                <div
                                    className="col-12 col-sm-6 col-xl"
                                    key={metric.label}
                                >
                                    <div className="border rounded-3 p-3 h-100">
                                        <p className="text-secondary small mb-2">
                                            {metric.label}
                                        </p>

                                        <h4 className={`fw-bold text-${metric.color} mb-0`}>
                                            {metric.value}
                                        </h4>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                            <h6 className="fw-bold mb-0">
                                Employee-wise Attendance
                            </h6>

                            <span className="text-secondary small">
                                {summary.totalEmployees} employees
                            </span>
                        </div>

                        {employees.length === 0 ? (
                            <div className="text-center text-secondary py-4">
                                No employee attendance data found for this period.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Employee</th>
                                            <th>Department</th>
                                            <th>Expected</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Attendance Rate</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {employees.map((employee) => {
                                            const rate = Number(
                                                employee.attendanceRate
                                            ) || 0;

                                            const progressColor =
                                                rate >= 90
                                                    ? "bg-success"
                                                    : rate >= 75
                                                        ? "bg-info"
                                                        : rate >= 50
                                                            ? "bg-warning"
                                                            : "bg-danger";

                                            return (
                                                <tr key={employee.employeeId}>
                                                    <td>
                                                        <div className="fw-semibold">
                                                            {employee.name}
                                                        </div>
                                                        <small className="text-secondary">
                                                            {employee.employeeId}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        {employee.department || "N/A"}
                                                    </td>

                                                    <td>
                                                        {employee.expectedWorkingDays}
                                                    </td>

                                                    <td className="text-success fw-semibold">
                                                        {employee.presentDays}
                                                    </td>

                                                    <td className="text-danger fw-semibold">
                                                        {employee.absentDays}
                                                    </td>

                                                    <td style={{ minWidth: "150px" }}>
                                                        <div className="d-flex justify-content-between small mb-1">
                                                            <span className="fw-semibold">
                                                                {formatPercentage(rate)}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="progress"
                                                            style={{ height: "8px" }}
                                                            role="progressbar"
                                                            aria-valuenow={rate}
                                                            aria-valuemin={0}
                                                            aria-valuemax={100}
                                                        >
                                                            <div
                                                                className={`progress-bar ${progressColor}`}
                                                                style={{
                                                                    width: `${Math.min(100, Math.max(0, rate))}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p className="text-secondary small mb-0 mt-3">
                            Attendance rate is calculated using present days
                            divided by expected working days. Saturdays and
                            Sundays are excluded by default, along with
                            approved leave days.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
};

export default AttendanceRateAnalytics;
