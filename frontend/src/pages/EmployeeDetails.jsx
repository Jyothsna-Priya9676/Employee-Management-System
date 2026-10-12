
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import {
    FaArrowLeft,
    FaEnvelope,
    FaIdBadge,
    FaBuilding,
    FaBriefcase,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaUser
} from "react-icons/fa";

const EmployeeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchEmployee = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/employees/${id}`);

                if (!cancelled && response.data.success) {
                    setEmployee(response.data.employee);
                } else if (!cancelled) {
                    setError("Employee details were not returned.");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.response?.data?.error ||
                        "Unable to load employee details."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchEmployee();

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-info" />
                <p className="text-secondary mt-2">Loading profile...</p>
            </div>
        );
    }

    if (error || !employee) {
        return (
            <div className="container py-4">
                <button
                    className="btn btn-outline-secondary mb-3"
                    onClick={() => navigate("/admin-dashboard/employees")}
                >
                    <FaArrowLeft className="me-2" />
                    Back to employees
                </button>

                <div className="alert alert-danger">
                    {error || "Employee not found."}
                </div>
            </div>
        );
    }

    const department =
        employee.department?.departmentName ||
        employee.department?.name ||
        (typeof employee.department === "string"
            ? employee.department
            : "Not assigned");

    const details = [
        {
            label: "Employee ID",
            value: employee.employeeId,
            icon: <FaIdBadge />
        },
        {
            label: "Email",
            value: employee.email,
            icon: <FaEnvelope />
        },
        {
            label: "Designation",
            value: employee.designation,
            icon: <FaBriefcase />
        },
        {
            label: "Department",
            value: department,
            icon: <FaBuilding />
        },
        {
            label: "Monthly salary",
            value: employee.salary == null
                ? "Not provided"
                : `₹${Number(employee.salary).toLocaleString("en-IN")}`,
            icon: <FaMoneyBillWave />
        },
        {
            label: "Joining date",
            value: employee.joiningDate
                ? new Date(employee.joiningDate).toLocaleDateString("en-IN")
                : "Not provided",
            icon: <FaCalendarAlt />
        }
    ];

    return (
        <section className="container-fluid p-3 p-md-4">
            <button
                className="btn btn-outline-secondary mb-4"
                onClick={() => navigate("/admin-dashboard/employees")}
            >
                <FaArrowLeft className="me-2" />
                Back to employees
            </button>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4 d-flex flex-wrap align-items-center gap-3">
                    <div
                        className="rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center"
                        style={{
                            width: "76px",
                            height: "76px",
                            fontSize: "30px"
                        }}
                    >
                        <FaUser />
                    </div>

                    <div className="flex-grow-1">
                        <h2 className="fw-bold mb-1">
                            {employee.name || "Employee"}
                        </h2>
                        <p className="text-secondary mb-2">
                            {employee.designation || "No designation"}
                        </p>

                        <span
                            className={`badge ${
                                employee.status === "Active"
                                    ? "text-bg-success"
                                    : "text-bg-secondary"
                            }`}
                        >
                            {employee.status || "Unknown status"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold">Employment information</h5>
                </div>

                <div className="card-body p-3 p-md-4">
                    <div className="row g-4">
                        {details.map((detail) => (
                            <div
                                className="col-12 col-md-6"
                                key={detail.label}
                            >
                                <div className="d-flex gap-3">
                                    <div className="text-info fs-5">
                                        {detail.icon}
                                    </div>

                                    <div>
                                        <div className="text-secondary small">
                                            {detail.label}
                                        </div>
                                        <div className="fw-semibold">
                                            {detail.value || "Not provided"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EmployeeDetails;
