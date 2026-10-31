
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";

const API_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

const MODEL_URL = "/models";

export default function FaceEnrollment() {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [consent, setConsent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraOn(false);
    }, []);

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/login", { replace: true });
                return;
            }

            try {
                const [statusResponse] = await Promise.all([
                    fetch(`${API_URL}/face/status`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                    Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    ]),
                ]);

                const statusData = await statusResponse.json().catch(() => ({}));

                if (!statusResponse.ok) {
                    throw new Error(
                        statusData.message ||
                        statusData.error ||
                        "Unable to check face enrollment status."
                    );
                }

                if (mounted) {
                    setAlreadyEnrolled(statusData.faceEnrolled === true);
                    setModelsLoaded(true);
                }
            } catch (err) {
                console.error("Face enrollment initialization failed:", err);

                if (mounted) {
                    setError(
                        err.message ||
                        "Could not initialize face enrollment."
                    );
                }
            } finally {
                if (mounted) {
                    setStatusLoading(false);
                }
            }
        }

        initialize();

        return () => {
            mounted = false;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [navigate]);

    async function startCamera() {
        setError("");
        setMessage("");

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera access is unavailable in this browser.");
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
                setCameraOn(true);
            }
        } catch (err) {
            console.error("Camera error:", err);

            stopCamera();

            setError(
                err.name === "NotAllowedError"
                    ? "Camera permission denied. Allow camera access in your browser."
                    : err.message || "Unable to start the camera."
            );
        }
    }

    async function enrollFace() {
        setError("");
        setMessage("");

        if (alreadyEnrolled) {
            setError(
                "Your face is already enrolled. You can use Face Login from the main login page."
            );
            return;
        }

        if (!consent) {
            setError("Please provide consent before enrolling your face.");
            return;
        }

        if (!modelsLoaded || !cameraOn || !videoRef.current) {
            setError("Load the face models and start the camera first.");
            return;
        }

        if (videoRef.current.readyState < 2) {
            setError("The camera is not ready. Please try again.");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            setError("Your session has expired. Please log in again.");
            return;
        }

        setLoading(true);

        try {
            const result = await faceapi
                .detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.5,
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!result) {
                throw new Error(
                    "No clear face detected. Look toward the camera and try again."
                );
            }

            const response = await fetch(`${API_URL}/face/enroll`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    descriptor: Array.from(result.descriptor),
                    consent: true,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                if (response.status === 409 && data.faceEnrolled) {
                    setAlreadyEnrolled(true);
                }

                throw new Error(
                    data.message ||
                    data.error ||
                    "Face enrollment failed."
                );
            }

            setAlreadyEnrolled(true);
            setMessage("Face enrolled successfully. Returning to your dashboard...");

            stopCamera();

            // Give the success message a moment to appear.
            setTimeout(() => {
                navigate("/employee-dashboard", { replace: true });
            }, 1200);
        } catch (err) {
            console.error("Face enrollment error:", err);

            setError(
                err.message || "Something went wrong during enrollment."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <h2 className="mb-2">Face Enrollment</h2>

                            <p className="text-muted">
                                Register your face once to use face login and
                                attendance verification.
                            </p>

                            {statusLoading ? (
                                <div className="alert alert-info">
                                    Checking your enrollment status...
                                </div>
                            ) : alreadyEnrolled ? (
                                <div className="alert alert-success">
                                    <h6 className="fw-bold">
                                        <i className="bi bi-check-circle me-2"></i>
                                        Your face is already enrolled
                                    </h6>
                                    You do not need to enroll again. Use Face
                                    Login on the main login page.
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() =>
                                                navigate("/employee-dashboard")
                                            }
                                        >
                                            Return to Dashboard
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <span
                                            className={`badge ${
                                                modelsLoaded
                                                    ? "text-bg-success"
                                                    : "text-bg-warning"
                                            }`}
                                        >
                                            {modelsLoaded
                                                ? "Face models loaded"
                                                : "Loading face models..."}
                                        </span>
                                    </div>

                                    <div className="bg-dark rounded overflow-hidden mb-3">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-100"
                                            style={{
                                                display: "block",
                                                minHeight: "280px",
                                                maxHeight: "420px",
                                                objectFit: "cover",
                                                transform: "scaleX(-1)",
                                            }}
                                        />
                                    </div>

                                    <div className="d-flex flex-wrap gap-2 mb-4">
                                        {!cameraOn ? (
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary"
                                                onClick={startCamera}
                                                disabled={
                                                    !modelsLoaded || loading
                                                }
                                            >
                                                <i className="bi bi-camera-video me-2"></i>
                                                Start Camera
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={stopCamera}
                                                disabled={loading}
                                            >
                                                <i className="bi bi-camera-video-off me-2"></i>
                                                Stop Camera
                                            </button>
                                        )}
                                    </div>

                                    <div className="form-check mb-3">
                                        <input
                                            id="faceConsent"
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={consent}
                                            onChange={(event) =>
                                                setConsent(event.target.checked)
                                            }
                                        />

                                        <label
                                            className="form-check-label"
                                            htmlFor="faceConsent"
                                        >
                                            I consent to registering and storing
                                            my face descriptor for employee
                                            login and attendance verification.
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={enrollFace}
                                        disabled={
                                            !modelsLoaded ||
                                            !cameraOn ||
                                            !consent ||
                                            loading
                                        }
                                    >
                                        {loading
                                            ? "Enrolling..."
                                            : "Enroll My Face"}
                                    </button>
                                </>
                            )}

                            {message && (
                                <div
                                    className="alert alert-success mt-3 mb-0"
                                    role="status"
                                >
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div
                                    className="alert alert-danger mt-3 mb-0"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="alert alert-info mt-4 mb-0">
                                <strong>Privacy:</strong> Your face descriptor
                                is biometric data. This prototype does not
                                include liveness detection, so it should not be
                                treated as production-grade identity security.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
