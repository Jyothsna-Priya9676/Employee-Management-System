
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import {
    FaUsers,
    FaChartBar,
    FaShieldAlt,
    FaEnvelope,
    FaLock,
    FaArrowRight,
    FaCamera,
} from "react-icons/fa";
import { useAuth } from "../context/authContext";
import "./Login.css";

const API_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

const MODEL_URL = "/models";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [loginMode, setLoginMode] = useState("password");
    const [modelsReady, setModelsReady] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [faceSubmitting, setFaceSubmitting] = useState(false);
    const [faceMessage, setFaceMessage] = useState("");

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        async function loadModels() {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                if (!cancelled) {
                    setModelsReady(true);
                }
            } catch (err) {
                console.error("Face model loading error:", err);

                if (!cancelled) {
                    setFaceMessage(
                        "Face models could not load. Password login is still available."
                    );
                }
            }
        }

        loadModels();

        return () => {
            cancelled = true;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

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
                `${API_URL}/auth/login`,
                {
                    email: email.trim(),
                    password,
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

    const startCamera = async () => {
        setError("");
        setFaceMessage("");

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera access is unavailable in this browser.");
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraReady(true);
            }
        } catch (err) {
            console.error("Camera error:", err);

            setCameraReady(false);
            setError(
                err.name === "NotAllowedError"
                    ? "Camera permission denied. Allow camera access in your browser."
                    : "Could not start the camera. Check that your camera is connected and available."
            );
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraReady(false);
    };

    const handleFaceLogin = async (event) => {
        event.preventDefault();
        setError("");
        setFaceMessage("");

        if (!email.trim()) {
            setError("Enter your enrolled employee email first.");
            return;
        }

        if (!modelsReady || !cameraReady || !videoRef.current) {
            setError("Wait for the face models and start the camera first.");
            return;
        }

        setFaceSubmitting(true);

        try {
            const result = await faceapi
                .detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions()
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!result) {
                setError("No face detected. Look toward the camera and try again.");
                return;
            }

            const response = await axios.post(
                `${API_URL}/face/verify`,
                {
                    email: email.trim().toLowerCase(),
                    descriptor: Array.from(result.descriptor),
                }
            );

            const data = response.data;

            if (!data.success || !data.token || !data.user) {
                setError(
                    data.message ||
                    "Face login failed. Please use your password."
                );
                return;
            }

            localStorage.setItem("token", data.token);
            login(data.user);

            stopCamera();

            navigate(
                data.user.role === "admin"
                    ? "/admin-dashboard"
                    : "/employee-dashboard",
                { replace: true }
            );
        } catch (err) {
            console.error("Face login error:", err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Face verification failed. Check your enrollment and use password login if needed."
            );
        } finally {
            setFaceSubmitting(false);
        }
    };

    const changeLoginMode = (mode) => {
        setLoginMode(mode);
        setError("");
        setFaceMessage("");

        if (mode !== "face") {
            stopCamera();
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

                {/* Right: Login card */}
                <section className="login-card">
                    <div className="login-card-header">
                        <div className="login-card-logo">
                            <FaUsers />
                        </div>

                        <h2>Welcome back</h2>
                        <p>Sign in to continue to your workspace</p>
                    </div>

                    {/* Switch between existing password login and face login */}
                    <div className="d-flex gap-2 mb-4">
                        <button
                            type="button"
                            className={`btn flex-fill ${
                                loginMode === "password"
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                            }`}
                            onClick={() => changeLoginMode("password")}
                        >
                            <FaLock className="me-2" />
                            Password
                        </button>

                        <button
                            type="button"
                            className={`btn flex-fill ${
                                loginMode === "face"
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                            }`}
                            onClick={() => changeLoginMode("face")}
                        >
                            <FaCamera className="me-2" />
                            Face login
                        </button>
                    </div>

                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    {loginMode === "password" ? (
                        <form onSubmit={handleSubmit}>
                            <div className="login-form-group">
                                <label htmlFor="email" className="login-label">
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
                                <label htmlFor="password" className="login-label">
                                    Password
                                </label>

                                <div className="login-input-wrap">
                                    <FaLock className="login-input-icon" />

                                    <input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
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
                    ) : (
                        <form onSubmit={handleFaceLogin}>
                            <div className="login-form-group">
                                <label htmlFor="faceEmail" className="login-label">
                                    Enrolled employee email
                                </label>

                                <div className="login-input-wrap">
                                    <FaEnvelope className="login-input-icon" />

                                    <input
                                        id="faceEmail"
                                        type="email"
                                        className="login-input"
                                        placeholder="Enter your employee email"
                                        autoComplete="username"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="login-label mb-0">
                                        Camera preview
                                    </label>

                                    <small className="text-muted">
                                        {modelsReady
                                            ? "Models ready"
                                            : "Loading models..."}
                                    </small>
                                </div>

                                <video
                                    ref={videoRef}
                                    className="w-100 rounded bg-dark"
                                    style={{
                                        minHeight: "220px",
                                        maxHeight: "320px",
                                        objectFit: "cover",
                                    }}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                            </div>

                            {faceMessage && (
                                <div className="alert alert-info" role="status">
                                    {faceMessage}
                                </div>
                            )}

                            <div className="d-flex gap-2 mb-3">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary flex-fill"
                                    onClick={startCamera}
                                    disabled={
                                        !modelsReady ||
                                        cameraReady ||
                                        faceSubmitting
                                    }
                                >
                                    <FaCamera className="me-2" />
                                    Start camera
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary flex-fill"
                                    onClick={stopCamera}
                                    disabled={!cameraReady || faceSubmitting}
                                >
                                    Stop camera
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={
                                    !modelsReady ||
                                    !cameraReady ||
                                    faceSubmitting
                                }
                            >
                                <span>
                                    {faceSubmitting
                                        ? "Verifying face..."
                                        : "Verify face & sign in"}
                                </span>

                                {!faceSubmitting && <FaArrowRight />}
                                {faceSubmitting && (
                                    <span
                                        className="spinner-border spinner-border-sm"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>

                            <p className="small text-muted mt-3 mb-0">
                                Face login is a prototype and does not reliably
                                detect spoofing. If verification fails, switch
                                to password login.
                            </p>
                        </form>
                    )}

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
