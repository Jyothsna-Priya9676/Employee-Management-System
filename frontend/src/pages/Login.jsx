
import { useState } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import { FaUsers, FaChartBar, FaShieldAlt, FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import { useAuth } from "../context/authContext";
import "./Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="login-loading">
                <div className="spinner-border text-primary" />
                <p>Preparing your workspace...</p>
            </div>
        );
    }

    if (user) {
        return (
            <Navigate
                to={
                    user.role === "admin"
                        ? "/admin-dashboard"
                        : "/employee-dashboard"
                }
                replace
            />
        );
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const response = await axios.post(
                "http://localhost:3000/api/auth/login",
                {
                    email: email.trim(),
                    password
                }
            );

            const data = response.data;

            if (!data.success || !data.token || !data.user) {
                setError("Invalid login response from server.");
                return;
            }

            localStorage.setItem("token", data.token);
            login(data.user);

            navigate(
                data.user.role === "admin"
                    ? "/admin-dashboard"
                    : "/employee-dashboard",
                { replace: true }
            );
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to log in. Please check your credentials and server."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="login-page">
            <div className="login-layout">

                {/* Left: Introduction */}
                <section className="login-intro">
                    <div className="login-brand">
                        <span className="login-brand-icon">
                            <FaUsers />
                        </span>
                        <span>EMPLOYEE MS</span>
                    </div>

                    <h1>
                        Manage your workforce with{" "}
                        <span>clarity.</span>
                    </h1>

                    <p>
                        One workspace for your people, teams, and
                        operations. Bring your employee information
                        together and make better decisions.
                    </p>

                    <div className="login-feature">
                        <div className="login-feature-icon">
                            <FaUsers />
                        </div>
                        <div>
                            <h6>Employee directory</h6>
                            <p>
                                Keep employee information organized
                                and accessible in one place.
                            </p>
                        </div>
                    </div>

                    <div className="login-feature">
                        <div className="login-feature-icon">
                            <FaChartBar />
                        </div>
                        <div>
                            <h6>Team insights</h6>
                            <p>
                                Manage departments and understand
                                your workforce at a glance.
                            </p>
                        </div>
                    </div>

                    <div className="login-feature">
                        <div className="login-feature-icon">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <h6>Secure access</h6>
                            <p>
                                Protected sign-in for administrators
                                and employees.
                            </p>
                        </div>
                    </div>

                    <div className="login-decoration" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </section>

                {/* Right: Login form */}
                <section className="login-card">
                    <div className="login-card-header">
                        <div className="login-card-logo">
                            <FaUsers />
                        </div>

                        <h2>Welcome back</h2>
                        <p>Sign in to continue to your workspace</p>
                    </div>

                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-form-group">
                            <label
                                htmlFor="email"
                                className="login-label"
                            >
                                Email address
                            </label>

                            <div className="login-input-wrap">
                                <FaEnvelope className="login-input-icon" />

                                <input
                                    id="email"
                                    type="email"
                                    className="login-input"
                                    placeholder="Enter your email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-form-group">
                            <label
                                htmlFor="password"
                                className="login-label"
                            >
                                Password
                            </label>

                            <div className="login-input-wrap">
                                <FaLock className="login-input-icon" />

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    className="login-input login-password-input"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    required
                                />

                                <button
                                    type="button"
                                    className="login-password-toggle"
                                    onClick={() =>
                                        setShowPassword((previous) => !previous)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="login-options">
                            <span className="login-remember">
                                <FaShieldAlt />
                                Secure employee workspace
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={submitting}
                        >
                            <span>
                                {submitting ? "Signing in..." : "Sign in"}
                            </span>

                            {!submitting && <FaArrowRight />}
                            {submitting && (
                                <span
                                    className="spinner-border spinner-border-sm"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <span className="login-footer-line" />
                        <FaLock />
                        <span>Secure employee workspace</span>
                        <span className="login-footer-line" />
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Login;
