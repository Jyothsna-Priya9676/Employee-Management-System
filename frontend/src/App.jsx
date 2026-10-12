
import {
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AIAssistant from "./pages/AIAssistant";

import DepartmentList from "./components/department/DepartmentList";
import EmployeeList from "./pages/EmployeeList";
import EmployeeDetails from "./pages/EmployeeDetails";
import LeaveList from "./components/leave/LeaveList";
import AttendanceList from "./components/attendance/AttendanceList";

import PrivateRoutes from "./utils/PrivateRoutes";
import RoleBaseRoutes from "./utils/RoleBaseRoutes";

const Unauthorized = () => (
    <main className="container py-5 text-center">
        <h1>403 — Access denied</h1>
        <p className="text-secondary">
            You do not have permission to access this page.
        </p>
        <a href="/" className="btn btn-info text-white">
            Return home
        </a>
    </main>
);

const App = () => {
    return (
        <Routes>
            {/* Default route */}
            <Route
                path="/"
                element={<Navigate to="/login" replace />}
            />

            {/* Login */}
            <Route
                path="/login"
                element={<Login />}
            />

            {/* Routes requiring login */}
            <Route element={<PrivateRoutes />}>

                {/* Admin-only routes */}
                <Route element={<RoleBaseRoutes requiredRole="admin" />}>
                    <Route
                        path="/admin-dashboard"
                        element={<AdminDashboard />}
                    >
                        <Route
                            path="employees"
                            element={<EmployeeList />}
                        />

                        <Route
                            path="employees/:id"
                            element={<EmployeeDetails />}
                        />

                        <Route
                            path="departments"
                            element={<DepartmentList />}
                        />

                        <Route
                            path="attendance"
                            element={<AttendanceList />}
                        />

                        <Route
                            path="leaves"
                            element={<LeaveList />}
                        />
                    </Route>
                </Route>

                {/* Employee-only routes */}
                <Route element={<RoleBaseRoutes requiredRole="employee" />}>
                    <Route
                        path="/employee-dashboard"
                        element={<EmployeeDashboard />}
                    />
                </Route>

                {/* AI Assistant for logged-in users */}
                <Route
                    path="/ai-assistant"
                    element={<AIAssistant />}
                />

            </Route>

            {/* Unauthorized access */}
            <Route
                path="/unauthorized"
                element={<Unauthorized />}
            />

            {/* Unknown routes */}
            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
};

export default App;
