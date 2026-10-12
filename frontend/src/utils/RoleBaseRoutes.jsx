
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

const RoleBaseRoutes = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center">
                <div
                    className="spinner-border text-info"
                    role="status"
                />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const allowedRoles = Array.isArray(requiredRole)
        ? requiredRole
        : [requiredRole];

    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user.role)
    ) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children || <Outlet />;
};

export default RoleBaseRoutes;
