
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import FaceAttendance from "../components/attendance/FaceAttendance";

const formatTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
};

const formatDate = (dateKey) => {
    if (!dateKey) return "—";

    const [year, month, day] = dateKey.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined) return "—";

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${remainingMinutes} min`;

    return `${hours} hr ${remainingMinutes} min`;
};

const EmployeeDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [attendance, setAttendance] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [attendanceError, setAttendanceError] = useState("");

    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(true);
    const [leaveError, setLeaveError] = useState("");
    const [leaveNotice, setLeaveNotice] = useState("");
    const [leaveSubmitting, setLeaveSubmitting] = useState(false);

    const [leaveForm, setLeaveForm] = useState({
        leaveType: "Casual",
        startDate: "",
        endDate: "",
        reason: ""
    });

    const fetchMyProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/employees/me/profile");

            if (response.data.success) {
                setEmployee(response.data.employee);
            } else {
                setError("Unable to load your employee profile.");
            }
        } catch (err) {
            console.error("Failed to fetch employee profile:", err);
            setError(
                err.response?.data?.error ||
                "Unable to load your profile. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAttendance = useCallback(async () => {
        try {
            setAttendanceLoading(true);
            setAttendanceError("");

            const response = await api.get("/attendance/me");

            if (response.data.success) {
                setAttendance(response.data.attendance || []);
            } else {
                setAttendanceError("Unable to load your attendance history.");
            }
        } catch (err) {
            console.error("Failed to fetch attendance:", err);
            setAttendanceError(
                err.response?.data?.error ||
                "Unable to load attendance. Please try again."
            );
        } finally {
            setAttendanceLoading(false);
        }
    }, []);

    const fetchMyLeaves = useCallback(async () => {
        try {
            setLeavesLoading(true);
            setLeaveError("");

            const response = await api.get("/leaves/me");

            if (response.data.success) {
                setLeaves(response.data.leaves || []);
            } else {
                setLeaveError(
                    response.data.error || "Unable to load leave history."
                );
            }
        } catch (err) {
            console.error("Failed to fetch leave history:", err);
            setLeaveError(
                err.response?.data?.error ||
                "Unable to load leave history. Please try again."
            );
        } finally {
            setLeavesLoading(false);
        }
    }, []);

    const handleLeaveInput = (event) => {
        const { name, value } = event.target;

        setLeaveForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleLeaveSubmit = async (event) => {
        event.preventDefault();
        setLeaveError("");
        setLeaveNotice("");

        if (
            !leaveForm.leaveType ||
            !leaveForm.startDate ||
            !leaveForm.endDate ||
            !leaveForm.reason.trim()
        ) {
            setLeaveError("Please fill in all leave application fields.");
            return;
        }

        if (leaveForm.endDate < leaveForm.startDate) {
            setLeaveError("End date cannot be before the start date.");
            return;
        }

        try {
            setLeaveSubmitting(true);

            const response = await api.post("/leaves", {
                leaveType: leaveForm.leaveType,
                startDate: leaveForm.startDate,
                endDate: leaveForm.endDate,
                reason: leaveForm.reason.trim()
            });

            if (response.data.success) {
                setLeaveNotice(
                    response.data.message ||
                    "Leave request submitted successfully."
                );

                setLeaveForm({
                    leaveType: "Casual",
                    startDate: "",
                    endDate: "",
                    reason: ""
                });

                await fetchMyLeaves();
            } else {
                setLeaveError(
                    response.data.error || "Unable to submit leave request."
                );
            }
        } catch (err) {
            console.error("Leave application failed:", err);
            setLeaveError(
                err.response?.data?.error ||
                "Unable to submit your leave request. Please try again."
            );
        } finally {
            setLeaveSubmitting(false);
        }
    };

    const formatLeaveDate = (value) => {
        if (!value) return "—";

        return new Date(value).toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const leaveStatusClass = (status) => {
        if (status === "Approved") return "text-bg-success";
        if (status === "Rejected") return "text-bg-danger";
        return "text-bg-warning";
    };

    useEffect(() => {
        fetchMyProfile();
        fetchAttendance();
        fetchMyLeaves();
    }, [fetchMyProfile, fetchAttendance, fetchMyLeaves]);

    const todayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    const todayAttendance = attendance.find(
        (record) => record.dateKey === todayKey
    );

    const isCheckedIn =
        Boolean(todayAttendance?.checkIn) &&
        !todayAttendance?.checkOut;

    const isCompleted = Boolean(todayAttendance?.checkOut);

    const displayValue = (value) => {
        if (value === undefined || value === null || value === "") {
            return "Not available";
        }

        return value;
    };

    const joiningDate = employee?.joiningDate
        ? new Date(employee.joiningDate).toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric"
          })
        : "Not available";

    return (
        <div className="min-vh-100 bg-body-tertiary">
            <nav className="navbar bg-white border-bottom px-3 px-md-4">
                <span className="navbar-brand fw-bold mb-0">
                    Employee MS
                </span>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate("/ai-assistant")}
                    >
                        <i className="bi bi-robot me-2"></i>
                        AI Assistant
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={logout}
                    >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="container py-4 py-md-5">
                <div className="mb-4">
                    <p className="text-secondary mb-1">Employee Workspace</p>
                    <h2 className="fw-bold">
                        Welcome, {employee?.name || user?.name || "Employee"}!
                    </h2>
                    <p className="text-secondary">
                        Manage your attendance and view your employee information.
                    </p>
                </div>

                {loading && (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4 text-center">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-secondary mb-0">
                                Loading your employee profile...
                            </p>
                        </div>
                    </div>
                )}

                {!loading && error && (
                    <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3">
                        <span>{error}</span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger flex-shrink-0"
                            onClick={fetchMyProfile}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="row g-4">
                    {/* Employee profile */}
                    <div className="col-12 col-lg-7">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    {employee?.profileImage ? (
                                        <img
                                            src={employee.profileImage}
                                            alt="Employee profile"
                                            className="rounded-circle object-fit-cover"
                                            width="64"
                                            height="64"
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-3"
                                            style={{ width: "64px", height: "64px" }}
                                        >
                                            {(employee?.name || user?.name || "E")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}

                                    <div>
                                        <h5 className="fw-bold mb-1">My Profile</h5>
                                        <p className="text-secondary mb-0 small">
                                            Your employee information
                                        </p>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Full Name</label>
                                        <div className="fw-semibold">
                                            {displayValue(employee?.name || user?.name)}
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Email Address</label>
                                        <div className="fw-semibold text-break">
                                            {displayValue(employee?.email || user?.email)}
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Employee ID</label>
                                        <div className="fw-semibold">
                                            {displayValue(employee?.employeeId)}
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Designation</label>
                                        <div className="fw-semibold">
                                            {displayValue(employee?.designation)}
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Department</label>
                                        <div className="fw-semibold">
                                            {displayValue(employee?.department?.departmentName)}
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Joining Date</label>
                                        <div className="fw-semibold">{joiningDate}</div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Employment Status</label>
                                        <div>
                                            <span
                                                className={`badge ${
                                                    employee?.status === "Active"
                                                        ? "text-bg-success"
                                                        : employee?.status === "Inactive"
                                                          ? "text-bg-secondary"
                                                          : "text-bg-light"
                                                }`}
                                            >
                                                {displayValue(employee?.status)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <label className="form-label text-secondary small">Account Role</label>
                                        <div>
                                            <span className="badge text-bg-primary">
                                                {displayValue(user?.role || "employee")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {!loading && !error && !employee && (
                                    <div className="alert alert-warning mt-4 mb-0">
                                        No employee profile was returned for this account.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Today's attendance summary: display only */}
                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                    <div>
                                        <h5 className="fw-bold mb-1">Today's Attendance</h5>
                                        <p className="text-secondary small mb-0">
                                            {formatDate(todayKey)}
                                        </p>
                                    </div>
                                    <i className="bi bi-calendar-check text-primary fs-3"></i>
                                </div>

                                {attendanceLoading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                                            <span className="visually-hidden">Loading attendance...</span>
                                        </div>
                                        <p className="small text-secondary mt-2 mb-0">
                                            Loading attendance...
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-3 bg-body-tertiary p-3 mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <span className="text-secondary small">Status</span>
                                                <span
                                                    className={`badge ${
                                                        isCheckedIn
                                                            ? "text-bg-success"
                                                            : isCompleted
                                                              ? "text-bg-primary"
                                                              : "text-bg-secondary"
                                                    }`}
                                                >
                                                    {isCheckedIn
                                                        ? "Checked In"
                                                        : isCompleted
                                                          ? "Completed"
                                                          : "Not Checked In"}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary small">Check-in</span>
                                                <span className="fw-semibold small">
                                                    {formatTime(todayAttendance?.checkIn)}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="text-secondary small">Check-out</span>
                                                <span className="fw-semibold small">
                                                    {formatTime(todayAttendance?.checkOut)}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-between">
                                                <span className="text-secondary small">Duration</span>
                                                <span className="fw-semibold small">
                                                    {formatDuration(todayAttendance?.durationMinutes)}
                                                </span>
                                            </div>
                                        </div>

                                        {employee?.status !== "Active" ? (
                                            <div className="alert alert-warning small mb-0">
                                                Attendance requires an active employee profile.
                                            </div>
                                        ) : isCompleted ? (
                                            <div className="alert alert-success small mb-0">
                                                <i className="bi bi-check-circle me-2"></i>
                                                Your attendance for today is complete.
                                            </div>
                                        ) : (
                                            <p className="text-secondary small mb-0">
                                                Use the Face Attendance section below to verify your face and record attendance.
                                            </p>
                                        )}
                                    </>
                                )}

                                {attendanceError && (
                                    <div className="alert alert-danger small mt-3 mb-0">
                                        <div>{attendanceError}</div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger mt-2"
                                            onClick={fetchAttendance}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Face attendance and enrollment navigation */}
                    
<div className="col-12">
    <FaceAttendance onAttendanceRecorded={fetchAttendance} />
</div>

                    {/* Attendance history */}
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                                    <div>
                                        <h5 className="fw-bold mb-1">Attendance History</h5>
                                        <p className="text-secondary small mb-0">
                                            Your latest attendance records
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        disabled={attendanceLoading}
                                        onClick={fetchAttendance}
                                    >
                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                        Refresh
                                    </button>
                                </div>

                                {attendanceLoading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary"></div>
                                        <p className="text-secondary small mt-2 mb-0">Loading history...</p>
                                    </div>
                                ) : attendance.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-calendar-x fs-1 text-secondary"></i>
                                        <p className="fw-semibold mt-3 mb-1">No attendance records yet</p>
                                        <p className="text-secondary small mb-0">
                                            Your records will appear here after you check in.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Check-in</th>
                                                    <th>Check-out</th>
                                                    <th>Duration</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendance.map((record) => (
                                                    <tr key={record._id}>
                                                        <td className="fw-semibold text-nowrap">{formatDate(record.dateKey)}</td>
                                                        <td className="text-nowrap">{formatTime(record.checkIn)}</td>
                                                        <td className="text-nowrap">{formatTime(record.checkOut)}</td>
                                                        <td className="text-nowrap">{formatDuration(record.durationMinutes)}</td>
                                                        <td>
                                                            <span
                                                                className={`badge ${
                                                                    record.status === "Completed"
                                                                        ? "text-bg-primary"
                                                                        : "text-bg-success"
                                                                }`}
                                                            >
                                                                {record.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leave application */}
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="rounded-circle bg-success-subtle p-3">
                                        <i className="bi bi-calendar2-plus text-success fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-1">Apply for Leave</h5>
                                        <p className="text-secondary small mb-0">
                                            Submit a leave request for admin approval.
                                        </p>
                                    </div>
                                </div>

                                {leaveNotice && (
                                    <div className="alert alert-success" role="alert">
                                        <i className="bi bi-check-circle me-2"></i>
                                        {leaveNotice}
                                    </div>
                                )}

                                {leaveError && (
                                    <div className="alert alert-danger" role="alert">
                                        {leaveError}
                                    </div>
                                )}

                                {employee?.status !== "Active" ? (
                                    <div className="alert alert-warning mb-0">
                                        Only active employees can apply for leave.
                                    </div>
                                ) : (
                                    <form onSubmit={handleLeaveSubmit}>
                                        <div className="row g-3">
                                            <div className="col-12 col-md-6">
                                                <label className="form-label">Leave Type</label>
                                                <select
                                                    className="form-select"
                                                    name="leaveType"
                                                    value={leaveForm.leaveType}
                                                    onChange={handleLeaveInput}
                                                    required
                                                >
                                                    <option value="Casual">Casual Leave</option>
                                                    <option value="Sick">Sick Leave</option>
                                                    <option value="Earned">Earned Leave</option>
                                                    <option value="Unpaid">Unpaid Leave</option>
                                                </select>
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label className="form-label">Start Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    name="startDate"
                                                    value={leaveForm.startDate}
                                                    min={todayKey}
                                                    onChange={handleLeaveInput}
                                                    required
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label className="form-label">End Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    name="endDate"
                                                    value={leaveForm.endDate}
                                                    min={leaveForm.startDate || todayKey}
                                                    onChange={handleLeaveInput}
                                                    required
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label">Reason for Leave</label>
                                                <textarea
                                                    className="form-control"
                                                    name="reason"
                                                    rows="3"
                                                    minLength={5}
                                                    maxLength={500}
                                                    placeholder="Explain why you need leave..."
                                                    value={leaveForm.reason}
                                                    onChange={handleLeaveInput}
                                                    required
                                                />
                                                <div className="form-text">Enter at least 5 characters.</div>
                                            </div>

                                            <div className="col-12">
                                                <button
                                                    type="submit"
                                                    className="btn btn-success"
                                                    disabled={leaveSubmitting}
                                                >
                                                    {leaveSubmitting ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send me-2"></i>
                                                            Submit Leave Request
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leave history */}
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                                    <div>
                                        <h5 className="fw-bold mb-1">My Leave Requests</h5>
                                        <p className="text-secondary small mb-0">
                                            Track the status of your applications.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={fetchMyLeaves}
                                        disabled={leavesLoading}
                                    >
                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                        Refresh
                                    </button>
                                </div>

                                {leavesLoading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="text-secondary small mt-2 mb-0">
                                            Loading leave history...
                                        </p>
                                    </div>
                                ) : leaves.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-calendar2-x fs-1 text-secondary"></i>
                                        <p className="fw-semibold mt-3 mb-1">No leave requests yet</p>
                                        <p className="text-secondary small mb-0">
                                            Your applications will appear here after submission.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Leave Type</th>
                                                    <th>Start Date</th>
                                                    <th>End Date</th>
                                                    <th>Reason</th>
                                                    <th>Status</th>
                                                    <th>Decision Note</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaves.map((leave) => (
                                                    <tr key={leave._id}>
                                                        <td className="fw-semibold text-nowrap">{leave.leaveType}</td>
                                                        <td className="text-nowrap">{formatLeaveDate(leave.startDate)}</td>
                                                        <td className="text-nowrap">{formatLeaveDate(leave.endDate)}</td>
                                                        <td style={{ minWidth: "180px" }}>{leave.reason}</td>
                                                        <td>
                                                            <span className={`badge ${leaveStatusClass(leave.status)}`}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ minWidth: "180px" }}>
                                                            {leave.decisionNote || "Awaiting review"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EmployeeDashboard;
