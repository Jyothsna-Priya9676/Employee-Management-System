
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

const MODEL_URL = "/models";

function FaceLogin() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        if (!cancelled) setModelsReady(true);
      } catch (err) {
        console.error("Face login model loading error:", err);
        if (!cancelled) {
          setError("Unable to load face models. Check public/models.");
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }

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
        setCameraReady(true);
      }
    } catch (err) {
      console.error("Face login camera error:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser."
          : "Unable to start the camera. Check your camera connection."
      );
    }
  }

  async function handleFaceLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Enter your employee email.");
      return;
    }

    if (!modelsReady || !cameraReady || !videoRef.current) {
      setError("Load the models and start the camera first.");
      return;
    }

    setLoading(true);

    try {
      const result = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setError("No face detected. Look at the camera and try again.");
        return;
      }

      const response = await fetch(`${API_URL}/face/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          descriptor: Array.from(result.descriptor),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.token) {
        setError(data.message || "Face verification failed. Try password login.");
        return;
      }

      // Match the token storage convention used by your existing login page.
      localStorage.setItem("token", data.token);

      setMessage("Face verification successful. Redirecting...");
      stopCamera();
      navigate("/employee-dashboard", { replace: true });
    } catch (err) {
      console.error("Face login error:", err);
      setError("Unable to verify your face. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="mb-2">Employee Face Login</h2>
              <p className="text-muted">
                Enter your email and position your face in the camera.
              </p>

              <form onSubmit={handleFaceLogin}>
                <div className="mb-3">
                  <label htmlFor="faceEmail" className="form-label">
                    Employee email
                  </label>
                  <input
                    id="faceEmail"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="form-label">Camera preview</span>
                    <span className="small text-muted">
                      {modelsReady ? "Models ready" : "Loading models..."}
                    </span>
                  </div>

                  <video
                    ref={videoRef}
                    className="w-100 rounded bg-dark"
                    style={{ maxHeight: "360px", objectFit: "cover" }}
                    autoPlay
                    muted
                    playsInline
                  />
                </div>

                <div className="d-flex gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={startCamera}
                    disabled={!modelsReady || cameraReady || loading}
                  >
                    Start Camera
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={stopCamera}
                    disabled={!cameraReady || loading}
                  >
                    Stop Camera
                  </button>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="alert alert-success" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={!modelsReady || !cameraReady || loading}
                >
                  {loading ? "Verifying..." : "Verify Face & Log In"}
                </button>
              </form>

              <p className="small text-muted mt-3 mb-0">
                This prototype does not provide reliable liveness detection.
                Use password login if verification fails.
              </p>

              <div className="mt-3">
                <Link to="/login">Back to password login</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FaceLogin;
