
import User from "../models/User.js";

const DESCRIPTOR_LENGTH = 128;
const FACE_MATCH_THRESHOLD = 0.6;

const isValidDescriptor = (descriptor) =>
  Array.isArray(descriptor) &&
  descriptor.length === DESCRIPTOR_LENGTH &&
  descriptor.every(
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= -1 &&
      value <= 1
  );

const calculateDistance = (first, second) => {
  let sum = 0;

  for (let i = 0; i < DESCRIPTOR_LENGTH; i++) {
    sum += (first[i] - second[i]) ** 2;
  }

  return Math.sqrt(sum);
};

const faceAttendanceMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "employee") {
      return res.status(403).json({
        success: false,
        error: "Only authenticated employees can record attendance.",
      });
    }

    const { descriptor } = req.body;

    if (!isValidDescriptor(descriptor)) {
      return res.status(400).json({
        success: false,
        error: "A valid face descriptor is required.",
      });
    }

    const user = await User.findById(req.user._id)
      .select("+faceDescriptor");

    if (!user || user.isActivated === false) {
      return res.status(403).json({
        success: false,
        error: "Your employee account is unavailable.",
      });
    }

    if (
      user.role !== "employee" ||
      user.faceEnrolled !== true ||
      !Array.isArray(user.faceDescriptor) ||
      !isValidDescriptor(user.faceDescriptor)
    ) {
      return res.status(403).json({
        success: false,
        error: "Enroll your face before recording attendance.",
      });
    }

    const distance = calculateDistance(
      descriptor,
      user.faceDescriptor
    );

    if (distance > FACE_MATCH_THRESHOLD) {
      return res.status(401).json({
        success: false,
        error: "Face verification failed. Attendance was not recorded.",
      });
    }

    // Continue only after the face comparison succeeds.
    req.faceVerified = true;

    next();
  } catch (error) {
    console.error("Face attendance middleware:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to verify your face.",
    });
  }
};

export default faceAttendanceMiddleware;
