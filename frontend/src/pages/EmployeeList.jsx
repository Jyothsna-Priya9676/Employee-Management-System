
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPlus,
    FaSearch,
    FaEdit,
    FaTrash,
    FaEye,
    FaSyncAlt,
    FaUsers
} from "react-icons/fa";

import api from "../utils/api";
import EmployeeForm from "../components/employee/EmployeeForm";

const PAGE_SIZE = 8;

const EmployeeList = () => {
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    // Fetch employees and departments from the backend
    const loadData = async () => {
        setLoading(true);
        setError("");

        try {
            const [employeeResponse, departmentResponse] =
                await Promise.all([
                    api.get("/employees"),
                    api.get("/departments")
                ]);

            if (employeeResponse.data.success) {
                setEmployees(
                    employeeResponse.data.employees || []
                );
            } else {
                setEmployees(
                    employeeResponse.data.employees || []
                );
            }

            if (departmentResponse.data.success) {
                setDepartments(
                    departmentResponse.data.departments || []
                );
            } else {
                setDepartments(
                    departmentResponse.data.departments || []
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to load data. Please check your backend server and API routes."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Search and filter employees
    const filteredEmployees = useMemo(() => {
        const query = search.trim().toLowerCase();

        return employees.filter((employee) => {
            const departmentId =
                employee.department?._id ||
                employee.department ||
                "";

            const matchesSearch = [
                employee.name,
                employee.email,
                employee.employeeId,
                employee.designation
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesDepartment =
                !departmentFilter ||
                String(departmentId) === departmentFilter;

            const matchesStatus =
                !statusFilter ||
                employee.status === statusFilter;

            return (
                matchesSearch &&
                matchesDepartment &&
                matchesStatus
            );
        });
    }, [
        employees,
        search,
        departmentFilter,
        statusFilter
    ]);

    // Pagination
    const totalPages = Math.max(
        1,
        Math.ceil(filteredEmployees.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const visibleEmployees = filteredEmployees.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Open create form
    const openCreateForm = () => {
        setEditingEmployee(null);
        setError("");
        setNotice("");
        setShowForm(true);
    };

    // Open edit form
    const openEditForm = (employee) => {
        setEditingEmployee(employee);
        setError("");
        setNotice("");
        setShowForm(true);
    };

    // Create or update employee
    const handleSave = async (formData) => {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            if (editingEmployee) {
                await api.put(
                    `/employees/${editingEmployee._id}`,
                    formData
                );

                setNotice("Employee updated successfully.");
            } else {
                await api.post("/employees", formData);

                setNotice("Employee created successfully.");
                setPage(1);
            }

            setShowForm(false);
            setEditingEmployee(null);

            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to save employee. Please check the backend API."
            );
        } finally {
            setSaving(false);
        }
    };

    // Delete employee
    const handleDelete = async (employee) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${employee.name}? This action may not be reversible.`
        );

        if (!confirmed) return;

        setDeletingId(employee._id);
        setError("");
        setNotice("");

        try {
            await api.delete(`/employees/${employee._id}`);

            setNotice("Employee deleted successfully.");
            await loadData();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Unable to delete employee."
            );
        } finally {
            setDeletingId(null);
        }
    };

    // Reset all filters
    const resetFilters = () => {
        setSearch("");
        setDepartmentFilter("");
        setStatusFilter("");
        setPage(1);
    };

    return (
        <section className="container-fluid p-3 p-md-4">

            {/* Page heading */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                <div>
                    <h2 className="fw-bold mb-1">
                        Employee Management
                    </h2>

                    <p className="text-secondary mb-0">
                        Manage employee records, departments and employment status.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-info text-white d-flex align-items-center gap-2"
                    onClick={openCreateForm}
                >
                    <FaPlus />
                    Add Employee
                </button>
            </div>

            {/* Success message */}
            {notice && (
                <div
                    className="alert alert-success alert-dismissible fade show"
                    role="alert"
                >
                    {notice}

                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Dismiss"
                        onClick={() => setNotice("")}
                    />
                </div>
            )}

            {/* Error message */}
            {error && (
                <div
                    className="alert alert-danger alert-dismissible fade show"
                    role="alert"
                >
                    {error}

                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Dismiss"
                        onClick={() => setError("")}
                    />
                </div>
            )}

            {/* Summary */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div
                                className="bg-info-subtle text-info rounded-3 d-flex align-items-center justify-content-center"
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    fontSize: "22px"
                                }}
                            >
                                <FaUsers />
                            </div>

                            <div>
                                <p className="text-secondary mb-1">
                                    Total employees
                                </p>

                                <h4 className="fw-bold mb-0">
                                    {employees.length}
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-secondary mb-1">
                                Active employees
                            </p>

                            <h4 className="fw-bold text-success mb-0">
                                {
                                    employees.filter(
                                        (employee) =>
                                            employee.status === "Active"
                                    ).length
                                }
                            </h4>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-secondary mb-1">
                                Inactive employees
                            </p>

                            <h4 className="fw-bold text-secondary mb-0">
                                {
                                    employees.filter(
                                        (employee) =>
                                            employee.status === "Inactive"
                                    ).length
                                }
                            </h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and filters */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">

                        <div className="col-12 col-lg-5">
                            <div className="input-group">
                                <span className="input-group-text bg-white">
                                    <FaSearch />
                                </span>

                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Search name, email, ID or designation..."
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-6 col-lg-3">
                            <select
                                className="form-select"
                                value={departmentFilter}
                                onChange={(event) => {
                                    setDepartmentFilter(
                                        event.target.value
                                    );
                                    setPage(1);
                                }}
                                aria-label="Filter by department"
                            >
                                <option value="">
                                    All departments
                                </option>

                                {departments.map((department) => (
                                    <option
                                        key={department._id}
                                        value={department._id}
                                    >
                                        {department.departmentName ||
                                            department.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-6 col-lg-2">
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setPage(1);
                                }}
                                aria-label="Filter by employment status"
                            >
                                <option value="">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="col-12 col-lg-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary w-100"
                                onClick={resetFilters}
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee table */}
            <div className="card border-0 shadow-sm">

                <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold">
                        Employee Directory
                    </h5>

                    <button
                        type="button"
                        className="btn btn-sm btn-outline-info"
                        onClick={loadData}
                        disabled={loading}
                        title="Refresh employees"
                    >
                        <FaSyncAlt className={loading ? "fa-spin" : ""} />
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border text-info"
                            role="status"
                        />

                        <p className="text-secondary mt-2 mb-0">
                            Loading employee records...
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">

                                <thead className="table-light">
                                    <tr>
                                        <th>Employee</th>
                                        <th>Employee ID</th>
                                        <th>Department</th>
                                        <th>Designation</th>
                                        <th>Monthly Salary</th>
                                        <th>Status</th>
                                        <th className="text-center">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {visibleEmployees.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="7"
                                                className="text-center py-5"
                                            >
                                                <FaUsers
                                                    className="text-secondary mb-2"
                                                    size={28}
                                                />

                                                <p className="fw-semibold mb-1">
                                                    No employees found
                                                </p>

                                                <p className="text-secondary small mb-0">
                                                    Try changing the filters or add a new employee.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleEmployees.map((employee) => {
                                            const departmentName =
                                                employee.department?.departmentName ||
                                                employee.department?.name ||
                                                "—";

                                            return (
                                                <tr key={employee._id}>
                                                    <td>
                                                        <div className="fw-semibold">
                                                            {employee.name || "—"}
                                                        </div>

                                                        <small className="text-secondary">
                                                            {employee.email || "—"}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        {employee.employeeId || "—"}
                                                    </td>

                                                    <td>
                                                        {departmentName}
                                                    </td>

                                                    <td>
                                                        {employee.designation || "—"}
                                                    </td>

                                                    <td>
                                                        {employee.salary == null
                                                            ? "—"
                                                            : `₹${Number(
                                                                employee.salary
                                                            ).toLocaleString("en-IN")}`}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`badge ${
                                                                employee.status === "Active"
                                                                    ? "text-bg-success"
                                                                    : employee.status === "Inactive"
                                                                        ? "text-bg-secondary"
                                                                        : "text-bg-warning"
                                                            }`}
                                                        >
                                                            {employee.status || "Unknown"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="d-flex justify-content-center gap-2">

                                                            {/* View employee */}
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-info"
                                                                title="View employee"
                                                                aria-label={`View ${employee.name}`}
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/admin-dashboard/employees/${employee._id}`
                                                                    )
                                                                }
                                                            >
                                                                <FaEye />
                                                            </button>

                                                            {/* Edit employee */}
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary"
                                                                title="Edit employee"
                                                                aria-label={`Edit ${employee.name}`}
                                                                onClick={() =>
                                                                    openEditForm(employee)
                                                                }
                                                            >
                                                                <FaEdit />
                                                            </button>

                                                            {/* Delete employee */}
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                title="Delete employee"
                                                                aria-label={`Delete ${employee.name}`}
                                                                disabled={
                                                                    deletingId === employee._id
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(employee)
                                                                }
                                                            >
                                                                {deletingId === employee._id
                                                                    ? (
                                                                        <span
                                                                            className="spinner-border spinner-border-sm"
                                                                            role="status"
                                                                        />
                                                                    )
                                                                    : <FaTrash />}
                                                            </button>

                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 p-3 border-top">

                            <small className="text-secondary">
                                {filteredEmployees.length === 0
                                    ? "No records to display"
                                    : `Showing ${
                                        (currentPage - 1) * PAGE_SIZE + 1
                                    }–${
                                        Math.min(
                                            currentPage * PAGE_SIZE,
                                            filteredEmployees.length
                                        )
                                    } of ${filteredEmployees.length} employees`}
                            </small>

                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.max(1, current - 1)
                                        )
                                    }
                                >
                                    Previous
                                </button>

                                <span className="small text-nowrap">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(
                                                totalPages,
                                                current + 1
                                            )
                                        )
                                    }
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit employee modal */}
            {showForm && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 1050
                    }}
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !saving
                        ) {
                            setShowForm(false);
                        }
                    }}
                >
                    <div
                        className="card border-0 shadow-lg w-100"
                        style={{
                            maxWidth: "760px",
                            maxHeight: "95vh",
                            overflowY: "auto"
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="employee-form-title"
                    >
                        <div className="card-header bg-white d-flex justify-content-between align-items-center p-3">
                            <h5
                                id="employee-form-title"
                                className="fw-bold mb-0"
                            >
                                {editingEmployee
                                    ? "Edit Employee"
                                    : "Add New Employee"}
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                aria-label="Close form"
                                disabled={saving}
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingEmployee(null);
                                }}
                            />
                        </div>

                        <div className="card-body p-4">
                            <EmployeeForm
                                initialData={editingEmployee}
                                departments={departments}
                                saving={saving}
                                onSubmit={handleSave}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingEmployee(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </section>
    );
};

export default EmployeeList;
