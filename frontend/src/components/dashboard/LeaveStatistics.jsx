
import { useEffect, useState } from "react";
import api from "../../utils/api";

const LeaveStatistics = () => {
    const [statistics, setStatistics] = useState({
        totalLeaves: 0,
        byStatus: {
            Pending: 0,
            Approved: 0,
            Rejected: 0
        },
        byType: []
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchStatistics = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(
                    "/dashboard/leave-statistics"
                );

                if (!cancelled) {
                    const data = response.data;

                    setStatistics({
                        totalLeaves: Number(data.totalLeaves) || 0,
                        byStatus: {
                            Pending: Number(data.byStatus?.Pending) || 0,
                            Approved: Number(data.byStatus?.Approved) || 0,
                            Rejected: Number(data.byStatus?.Rejected) || 0
                        },
                        byType: Array.isArray(data.byType)
                            ? data.byType
                            : []
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Could not load leave statistics."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchStatistics();

        return () => {
            cancelled = true;
        };
    }, []);

    const statusCards = [
        {
            title: "Pending",
            value: statistics.byStatus.Pending,
            color: "warning"
        },
        {
            title: "Approved",
            value: statistics.byStatus.Approved,
            color: "success"
        },
        {
            title: "Rejected",
            value: statistics.byStatus.Rejected,
            color: "danger"
        }
    ];

    const maxTypeCount = Math.max(
        1,
        ...statistics.byType.map((item) => Number(item.count) || 0)
    );

    return (
        <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                    <div>
                        <h5 className="fw-bold mb-1">
                            Leave Statistics
                        </h5>
                        <p className="text-secondary small mb-0">
                            Overview of employee leave requests
                        </p>
                    </div>

                    <span className="badge text-bg-primary fs-6">
                        Total: {loading ? "..." : statistics.totalLeaves}
                    </span>
                </div>

                {loading && (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" />
                        <p className="text-secondary mt-2 mb-0">
                            Loading leave statistics...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="alert alert-warning mb-0">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <div className="row g-3 mb-4">
                            {statusCards.map((card) => (
                                <div
                                    className="col-12 col-md-4"
                                    key={card.title}
                                >
                                    <div
                                        className={`border-start border-4 border-${card.color} rounded-3 bg-body-tertiary p-3 h-100`}
                                    >
                                        <p className="text-secondary mb-1">
                                            {card.title} Requests
                                        </p>

                                        <h3 className="fw-bold mb-0">
                                            {card.value}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h6 className="fw-bold mb-3">
                            Leave Requests by Type
                        </h6>

                        {statistics.byType.length === 0 ? (
                            <p className="text-secondary mb-0">
                                No leave requests are available yet.
                            </p>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {statistics.byType.map((item) => {
                                    const count = Number(item.count) || 0;
                                    const width =
                                        (count / maxTypeCount) * 100;

                                    return (
                                        <div key={item.leaveType}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="text-capitalize">
                                                    {item.leaveType}
                                                </span>

                                                <span className="fw-semibold">
                                                    {count}
                                                </span>
                                            </div>

                                            <div
                                                className="progress"
                                                role="progressbar"
                                                aria-label={`${item.leaveType} leave requests`}
                                                aria-valuenow={count}
                                                aria-valuemin={0}
                                                aria-valuemax={maxTypeCount}
                                                style={{ height: "10px" }}
                                            >
                                                <div
                                                    className="progress-bar bg-info"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default LeaveStatistics;
