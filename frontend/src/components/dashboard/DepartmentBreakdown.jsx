
import { useEffect, useState } from "react";
import api from "../../utils/api";

const DepartmentBreakdown = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchBreakdown = async () => {
            try {
                const response = await api.get(
                    "/dashboard/department-breakdown"
                );

                if (!cancelled) {
                    setDepartments(
                        response.data.departments || []
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Unable to load department breakdown."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchBreakdown();

        return () => {
            cancelled = true;
        };
    }, []);

    const maximum = Math.max(
        1,
        ...departments.map((department) => department.employeeCount || 0)
    );

    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
                <h5 className="fw-bold mb-1">
                    Department Breakdown
                </h5>

                <p className="text-secondary small mb-4">
                    Employees in each department
                </p>

                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-info" />
                    </div>
                ) : error ? (
                    <div className="alert alert-warning mb-0">
                        {error}
                    </div>
                ) : departments.length === 0 ? (
                    <p className="text-secondary mb-0">
                        No department data available.
                    </p>
                ) : (
                    <div className="d-flex flex-column gap-4">
                        {departments.map((department) => {
                            const count = department.employeeCount || 0;
                            const percentage = Math.round(
                                (count / maximum) * 100
                            );

                            return (
                                <div key={department._id}>
                                    <div className="d-flex justify-content-between gap-3 mb-2">
                                        <span className="fw-semibold">
                                            {department.departmentName ||
                                                department.name}
                                        </span>

                                        <span className="text-secondary small">
                                            {count} employees
                                        </span>
                                    </div>

                                    <div
                                        className="progress"
                                        role="progressbar"
                                        aria-label={`${department.departmentName || department.name} employees`}
                                        aria-valuenow={percentage}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                        style={{ height: "8px" }}
                                    >
                                        <div
                                            className="progress-bar bg-info"
                                            style={{
                                                width: `${percentage}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentBreakdown;
