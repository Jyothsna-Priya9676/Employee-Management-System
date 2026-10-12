
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../components/dashboard/AdminSidebar";
import Navbar from "../components/dashboard/Navbar";
import AdminSummary from "../components/dashboard/AdminSummary";
import DepartmentBreakdown from "../components/dashboard/DepartmentBreakdown";
import AttendanceTrends from "../components/dashboard/AttendanceTrends";
import LeaveStatistics from "../components/dashboard/LeaveStatistics";
import { useAuth } from "../context/authContext";

const AdminDashboard = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    const isDashboardHome =
        location.pathname === "/admin-dashboard" ||
        location.pathname === "/admin-dashboard/";

    if (loading) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center">
                <div
                    className="spinner-border text-info"
                    role="status"
                    aria-label="Loading dashboard"
                />
            </div>
        );
    }

    if (!user || user.role !== "admin") {
        return (
            <div className="container py-5">
                <div className="alert alert-danger">
                    You do not have permission to view the admin dashboard.
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex min-vh-100 bg-body-tertiary">
            <AdminSidebar />

            <main
                className="flex-grow-1"
                style={{
                    marginLeft: "250px",
                    minWidth: 0
                }}
            >
                <Navbar />

                {isDashboardHome && (
                    <>
                        <AdminSummary />

                        <div className="container-fluid px-3 px-md-4 pb-4">
                            <div className="row g-4 mb-4">
                                <div className="col-12 col-xl-8">
                                    <DepartmentBreakdown />
                                </div>

                                <div className="col-12 col-xl-4">
                                    <div className="card border-0 shadow-sm h-100">
                                        <div className="card-body p-4">
                                            <h5 className="fw-bold mb-2">
                                                Workforce Insights
                                            </h5>

                                            <p className="text-secondary mb-0">
                                                Review your workforce size,
                                                department distribution,
                                                employee activity and payroll
                                                using current database records.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-4 mb-4">
                                <div className="col-12">
                                    <AttendanceTrends />
                                </div>
                            </div>

                            <div className="row g-4">
                                <div className="col-12">
                                    <LeaveStatistics />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <Outlet />
            </main>
        </div>
    );
};

export default AdminDashboard;
