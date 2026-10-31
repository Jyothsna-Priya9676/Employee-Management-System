
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as faceapi from "face-api.js";
import api from "../../utils/api";

const MODEL_URL = "/models";

const getTodayKey = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

export default function FaceAttendance({ onAttendanceRecorded }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mountedRef = useRef(true);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [enrolled, setEnrolled] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [attendanceStatus, setAttendanceStatus] = useState({
        checkedIn: false,
        completed: false,
    });

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

    const fetchEnrollmentStatus = useCallback(async () => {
        try {
            setStatusLoading(true);
            setError("");

            const response = await api.get("/face/status");
            const data = response.data;

            const isEnrolled =
                data.faceEnrolled === true ||
                data.enrolled === true ||
                data.data?.faceEnrolled === true ||
                data.data?.enrolled === true;

            setEnrolled(isEnrolled);
        } catch (err) {
            console.error(
                "Failed to load face enrollment status:",
                err.response?.data || err
            );

            setEnrolled(false);
            setError(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    "Unable to check face enrollment status. Please refresh."
            );
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const fetchTodayAttendance = useCallback(async () => {
        try {
            const response = await api.get("/attendance/me");
            const records = response.data.attendance || [];
            const today = records.find(
                (record) => record.dateKey === getTodayKey()
            );

            setAttendanceStatus({
                checkedIn: Boolean(today?.checkIn) && !today?.checkOut,
                completed: Boolean(today?.checkOut),
            });
        } catch (err) {
            console.error(
                "Failed to fetch attendance:",
                err.response?.data || err
            );

            throw err;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        async function initialize() {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);

                if (mountedRef.current) {
                    setModelsLoaded(true);
                }
            } catch (err) {
                console.error("Face model loading failed:", err);

                if (mountedRef.current) {
                    setError(
                        "Unable to load face models. Check frontend/public/models."
                    );
                }
            }
        }

        initialize();
        fetchEnrollmentStatus();
        fetchTodayAttendance().catch(() => {});

        return () => {
            mountedRef.current = false;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [fetchEnrollmentStatus, fetchTodayAttendance]);

    async function startCamera() {
        setError("");
        setMessage("");

        try {
            if (!modelsLoaded) {
                throw new Error("Face models are still loading.");
            }

            if (!enrolled) {
                throw new Error("Enroll your face before recording attendance.");
            }

            if (attendanceStatus.completed) {
                throw new Error("Today's attendance is already completed.");
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    "Camera access is unavailable. Use localhost or HTTPS."
                );
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

            if (!videoRef.current) {
                throw new Error("Camera preview is unavailable.");
            }

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraOn(true);
        } catch (err) {
            console.error("Camera error:", err);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            setCameraOn(false);
            setError(
                err.name === "NotAllowedError"
                    ? "Camera permission denied. Allow camera access in your browser."
                    : err.message || "Unable to start the camera."
            );
        }
    }

    async function handleAttendance(action) {
        setError("");
        setMessage("");

        if (!enrolled || !modelsLoaded) {
            setError("Face enrollment or face models are not ready.");
            return;
        }

        if (
            !cameraOn ||
            !videoRef.current ||
            !streamRef.current ||
            videoRef.current.readyState < 2
        ) {
            setError("Start the camera and wait for the preview before continuing.");
            return;
        }

        if (action === "check-in" && attendanceStatus.checkedIn) {
            setError("You have already checked in today.");
            return;
        }

        if (action === "check-out" && !attendanceStatus.checkedIn) {
            setError("Check in before checking out.");
            return;
        }

        if (attendanceStatus.completed) {
            setError("Today's attendance is already completed.");
            return;
        }

        setActionLoading(true);

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
                    "No clear face detected. Look at the camera and try again."
                );
            }

            const descriptor = Array.from(result.descriptor);

            if (
                descriptor.length !== 128 ||
                !descriptor.every(Number.isFinite)
            ) {
                throw new Error("Invalid face descriptor. Please try again.");
            }

            const response = await api.post(`/attendance/${action}`, {
                descriptor,
            });

            if (!response.data.success) {
                throw new Error(
                    response.data.error ||
                        response.data.message ||
                        "Attendance could not be recorded."
                );
            }

            setMessage(
                response.data.message ||
                    (action === "check-in"
                        ? "Face verified. Check-in recorded successfully."
                        : "Face verified. Check-out recorded successfully.")
            );

            // Refresh this component's attendance status.
            await fetchTodayAttendance();

            // Refresh dashboard attendance/history.
            if (onAttendanceRecorded) {
                await onAttendanceRecorded();
            }
        } catch (err) {
            console.error(
                "Attendance request failed:",
                err.response?.data || err
            );

            setError(
                err.response?.data?.error ||
                    err.response?.data?.message ||
                    err.message ||
                    "Unable to record attendance."
            );

            // A failed refresh should not erase a successful server response.
            if (err.response?.status >= 500) {
                setError(
                    err.response?.data?.error ||
                        "The server encountered an error. Check the backend logs."
                );
            }
        } finally {
            setActionLoading(false);
        }
    }

    const attendanceComplete = attendanceStatus.completed;

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                    <div>
                        <h5 className="fw-bold mb-1">Face Attendance</h5>
                        <p className="text-secondary small mb-0">
                            Verify your enrolled face before checking in or out.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={async () => {
                            await fetchEnrollmentStatus();
                            await fetchTodayAttendance().catch(() => {});
                        }}
                        disabled={statusLoading || actionLoading}
                    >
                        <i className="bi bi-arrow-clockwise me-1" />
                        Refresh Status
                    </button>
                </div>

                {statusLoading ? (
                    <div className="alert alert-info">
                        Checking your face enrollment status...
                    </div>
                ) : !enrolled ? (
                    <div className="alert alert-warning">
                        <p className="mb-2">
                            Your face is not enrolled yet. Enroll it first.
                        </p>
                        <Link to="/face-enrollment" className="btn btn-primary">
                            <i className="bi bi-person-bounding-box me-2" />
                            Enroll My Face
                        </Link>
                    </div>
                ) : (
                    <div className="alert alert-success">
                        <i className="bi bi-check-circle me-2" />
                        Face enrollment is active for your account.
                    </div>
                )}

                <div className="mb-3">
                    <span
                        className={`badge ${
                            modelsLoaded ? "text-bg-success" : "text-bg-warning"
                        }`}
                    >
                        {modelsLoaded
                            ? "Face-recognition models loaded successfully"
                            : "Loading face-recognition models..."}
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
                            minHeight: "220px",
                            maxHeight: "400px",
                            objectFit: "cover",
                            transform: "scaleX(-1)",
                        }}
                    />

                    {!cameraOn && (
                        <div className="text-center text-white py-3">
                            <i className="bi bi-camera-video me-2" />
                            Camera preview will appear here.
                        </div>
                    )}
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                    {!cameraOn ? (
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={startCamera}
                            disabled={
                                !modelsLoaded ||
                                !enrolled ||
                                statusLoading ||
                                actionLoading ||
                                attendanceComplete
                            }
                        >
                            <i className="bi bi-camera-video me-2" />
                            Start Camera
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={stopCamera}
                            disabled={actionLoading}
                        >
                            <i className="bi bi-camera-video-off me-2" />
                            Stop Camera
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleAttendance("check-in")}
                        disabled={
                            !enrolled ||
                            !modelsLoaded ||
                            !cameraOn ||
                            statusLoading ||
                            actionLoading ||
                            attendanceStatus.checkedIn ||
                            attendanceComplete
                        }
                    >
                        {actionLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-box-arrow-in-right me-2" />
                                Check In
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleAttendance("check-out")}
                        disabled={
                            !enrolled ||
                            !modelsLoaded ||
                            !cameraOn ||
                            statusLoading ||
                            actionLoading ||
                            !attendanceStatus.checkedIn ||
                            attendanceComplete
                        }
                    >
                        <i className="bi bi-box-arrow-right me-2" />
                        Check Out
                    </button>
                </div>

                {message && (
                    <div className="alert alert-success mb-3" role="status">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger mb-3" role="alert">
                        {error}
                    </div>
                )}

                <p className="text-secondary small mb-0">
                    Face matching is a prototype and does not yet include
                    liveness detection. Camera video is processed in your
                    browser; the face descriptor is sent to the server for
                    comparison with your enrolled descriptor.
                </p>
            </div>
        </div>
    );
}
