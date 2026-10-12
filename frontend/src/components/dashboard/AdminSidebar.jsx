
import { NavLink } from "react-router-dom";
import {
    FaTachometerAlt,
    FaUsers,
    FaBuilding,
    FaCalendarCheck,
    FaClipboardList,
    FaRobot
} from "react-icons/fa";

const AdminSidebar = () => {
    const linkClass = ({ isActive }) =>
        `d-flex align-items-center gap-3 text-white text-decoration-none px-3 py-3 rounded ${
            isActive ? "bg-info" : "sidebar-link"
        }`;

    return (
        <aside
            className="bg-dark text-white position-fixed top-0 start-0 vh-100 d-flex flex-column"
            style={{ width: "250px", zIndex: 1030 }}
        >
            <div
                className="bg-info d-flex align-items-center justify-content-center"
                style={{ minHeight: "64px" }}
            >
                <h4 className="mb-0 fw-bold">Employee MS</h4>
            </div>

            <nav className="p-3 d-flex flex-column gap-2">
                <NavLink
                    to="/admin-dashboard"
                    end
                    className={linkClass}
                >
                    <FaTachometerAlt />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink
                    to="/admin-dashboard/employees"
                    className={linkClass}
                >
                    <FaUsers />
                    <span>Employees</span>
                </NavLink>

                <NavLink
                    to="/admin-dashboard/departments"
                    className={linkClass}
                >
                    <FaBuilding />
                    <span>Departments</span>
                </NavLink>

                <NavLink
                    to="/admin-dashboard/attendance"
                    className={linkClass}
                >
                    <FaClipboardList />
                    <span>Attendance</span>
                </NavLink>

                <NavLink
                    to="/admin-dashboard/leaves"
                    className={linkClass}
                >
                    <FaCalendarCheck />
                    <span>Leave Requests</span>
                </NavLink>

                {/* AI HR Assistant */}
                <NavLink
                    to="/ai-assistant"
                    className={linkClass}
                >
                    <FaRobot />
                    <span>AI HR Assistant</span>
                </NavLink>
            </nav>

            <div className="mt-auto p-3 text-secondary small">
                Employee Management System
            </div>
        </aside>
    );
};

export default AdminSidebar;
