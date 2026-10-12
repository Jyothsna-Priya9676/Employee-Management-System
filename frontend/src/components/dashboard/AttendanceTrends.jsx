
import { useEffect, useState } from "react";
import api from "../../utils/api";

const formatMonth = (month) => {
    if (!month) return "Unknown";

    const [year, monthNumber] = month.split("-");
    const date = new Date(Number(year), Number(monthNumber) - 1, 1);

    return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric"
    });
};

const formatDuration = (minutes) => {
    const value = Number(minutes) || 0;
    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;

    return `${hours}h ${remainingMinutes}m`;
};

const AttendanceTrends = () => {
    const [trends, setTrends] = useState([]);
    const [months, setMonths] = useState(6);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchTrends = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(
                    `/dashboard/attendance-trends?months=${months}`
                );

                if (!cancelled) {
                    setTrends(response.data.trends || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Could not load attendance trends."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchTrends();

        return () => {
            cancelled = true;
        };
    }, [months]);

    const maxRecords = Math.max(
        1,
        ...trends.map((item) => Number(item.totalRecords) || 0)
    );

    return (
        <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h5 className="fw-bold mb-1">
                            Attendance Trends
                        </h5>
                        <p className="text-secondary small mb-0">
                            Monthly attendance records and working duration
                        </p>
                    </div>

                    <select
                        className="form-select form-select-sm"
                        style={{ width: "140px" }}
                        value={months}
                        onChange={(event) =>
                            setMonths(Number(event.target.value))
                        }
                        aria-label="Attendance trend period"
                    >
                        <option value={3}>Last 3 months</option>
                        <option value={6}>Last 6 months</option>
                        <option value={12}>Last 12 months</option>
                    </select>
                </div>

                {loading && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                        <p className="text-secondary mt-2 mb-0">
                            Loading attendance data...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="alert alert-warning mb-0">
                        {error}
                    </div>
                )}

                {!loading && !error && trends.length === 0 && (
                    <div className="text-center text-secondary py-5">
                        <h6>No attendance records found</h6>
                        <p className="mb-0">
                            Attendance statistics will appear when records
                            are available.
                        </p>
                    </div>
                )}

                {!loading && !error && trends.length > 0 && (
                    <>
                        <div className="d-flex flex-column gap-4">
                            {trends.map((item) => {
                                const total = Number(item.totalRecords) || 0;
                                const completed = Number(item.completed) || 0;
                                const inProgress = Number(item.inProgress) || 0;
                                const width = (total / maxRecords) * 100;

                                return (
                                    <div key={item.month}>
                                        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                                            <span className="fw-semibold">
                                                {formatMonth(item.month)}
                                            </span>

                                            <span className="text-secondary small">
                                                {total} record{total !== 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        <div
                                            className="progress"
                                            role="progressbar"
                                            aria-label={`Attendance records for ${formatMonth(item.month)}`}
                                            aria-valuenow={total}
                                            aria-valuemin={0}
                                            aria-valuemax={maxRecords}
                                            style={{ height: "12px" }}
                                        >
                                            <div
                                                className="progress-bar bg-primary"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>

                                        <div className="d-flex flex-wrap gap-3 mt-2 small text-secondary">
                                            <span>
                                                <span className="text-success fw-semibold">
                                                    {completed}
                                                </span>{" "}
                                                completed
                                            </span>

                                            <span>
                                                <span className="text-warning fw-semibold">
                                                    {inProgress}
                                                </span>{" "}
                                                in progress
                                            </span>

                                            <span>
                                                Average duration:{" "}
                                                <strong>
                                                    {formatDuration(
                                                        item.averageDurationMinutes
                                                    )}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-secondary small mt-4 mb-0">
                            These figures represent attendance records,
                            not the total number of unique employees present.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
};

export default AttendanceTrends;
