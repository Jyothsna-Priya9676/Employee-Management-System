
import { useAuth } from "../../context/authContext";

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <header className="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
            <div>
                <h5 className="mb-0">Employee Portal</h5>
                <small className="text-secondary">
                    Workforce management
                </small>
            </div>

            <div className="d-flex align-items-center gap-3">
                <div className="text-end">
                    <div className="fw-semibold">
                        {user?.name || "User"}
                    </div>
                    <small className="text-secondary text-capitalize">
                        {user?.role || ""}
                    </small>
                </div>

                <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Navbar;
