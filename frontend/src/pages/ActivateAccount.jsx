
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
function ActivateAccount() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!token) {
            setError(
                "The activation link is missing its token. Please use the link from your email."
            );
            return;
        }

        if (password.length < 8 || password.length > 128) {
            setError("Password must contain between 8 and 128 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/auth/activate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to activate your account."
                );
            }

            setSuccess(
                data.message ||
                    "Your account has been activated successfully."
            );

            setPassword("");
            setConfirmPassword("");

            // Give the employee time to read the success message.
            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1800);
        } catch (err) {
            setError(
                err.message ||
                    "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
            <div
                className="card border-0 shadow-sm"
                style={{ width: "100%", maxWidth: "460px" }}
            >
                <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold">Activate Your Account</h2>
                        <p className="text-secondary mb-0">
                            Create a password to access Smart HRMS.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="alert alert-success"
                            role="status"
                        >
                            {success}
                        </div>
                    )}

                    {!token && (
                        <div className="alert alert-warning" role="alert">
                            No activation token was found in this link.
                            Please open the complete link from your email.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label
                                htmlFor="password"
                                className="form-label"
                            >
                                New password
                            </label>

                            <input
                                id="password"
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                minLength={8}
                                maxLength={128}
                                autoComplete="new-password"
                                required
                                disabled={loading || !token || !!success}
                            />

                            <div className="form-text">
                                Use at least 8 characters.
                            </div>
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="confirmPassword"
                                className="form-label"
                            >
                                Confirm password
                            </label>

                            <input
                                id="confirmPassword"
                                type="password"
                                className="form-control"
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                minLength={8}
                                maxLength={128}
                                autoComplete="new-password"
                                required
                                disabled={loading || !token || !!success}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={loading || !token || !!success}
                        >
                            {loading
                                ? "Activating account..."
                                : "Activate Account"}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-decoration-none">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ActivateAccount;
