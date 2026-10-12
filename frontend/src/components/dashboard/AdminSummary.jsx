
import { useEffect, useState } from "react";
import {
    FaUsers,
    FaBuilding,
    FaMoneyBillWave,
    FaUserCheck,
    FaUserTimes,
    FaChartLine
} from "react-icons/fa";
import api from "../../utils/api";

const initialSummary = {
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    totalDepartments: 0,
    monthlySalary: 0,
    averageSalary: 0
};

const formatRupees = (amount) =>
    `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;

const AdminSummary = () => {
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get("/dashboard/summary");

                if (!cancelled) {
                    setSummary({
                        ...initialSummary,
                        ...(response.data.summary || {})
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Could not load dashboard summary."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchSummary();

        return () => {
            cancelled = true;
        };
    }, []);

    const cards = [
        {
            title: "Total Employees",
            value: summary.totalEmployees,
            icon: <FaUsers />,
            color: "primary"
        },
        {
            title: "Departments",
            value: summary.totalDepartments,
            icon: <FaBuilding />,
            color: "info"
        },
        {
            title: "Active Employees",
            value: summary.activeEmployees,
            icon: <FaUserCheck />,
            color: "success"
        },
        {
            title: "Inactive Employees",
            value: summary.inactiveEmployees,
            icon: <FaUserTimes />,
            color: "secondary"
        },
        {
            title: "Monthly Payroll",
            value: formatRupees(summary.monthlySalary),
            icon: <FaMoneyBillWave />,
            color: "warning"
        },
        {
            title: "Average Salary",
            value: formatRupees(summary.averageSalary),
            icon: <FaChartLine />,
            color: "danger"
        }
    ];

    return (
        <section className="container-fluid p-3 p-md-4">
            <div className="mb-4">
                <h2 className="fw-bold mb-1">Dashboard Overview</h2>
                <p className="text-secondary mb-0">
                    Monitor workforce, departments and monthly payroll.
                </p>
            </div>

            {error && (
                <div className="alert alert-warning" role="alert">
                    {error}
                </div>
            )}

            <div className="row g-3">
                {cards.map((card) => (
                    <div
                        className="col-12 col-sm-6 col-xl-4"
                        key={card.title}
                    >
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body d-flex align-items-center gap-3">
                                <div
                                    className={`bg-${card.color}-subtle text-${card.color} rounded-3 d-flex align-items-center justify-content-center flex-shrink-0`}
                                    style={{
                                        width: "56px",
                                        height: "56px",
                                        fontSize: "24px"
                                    }}
                                >
                                    {card.icon}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-secondary mb-1">
                                        {card.title}
                                    </p>

                                    <h4 className="fw-bold mb-0 text-break">
                                        {loading ? "..." : card.value}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default AdminSummary;
