
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import EmployeeForm from "./EmployeeForm";

const EmployeeList = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalEmployees: 0,
    limit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Load all departments from the backend.
  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.get("/departments");

      const departmentData = response.data;

      // Support both:
      // 1. { departments: [...] }
      // 2. [...]
      const departmentList = Array.isArray(departmentData)
        ? departmentData
        : Array.isArray(departmentData?.departments)
          ? departmentData.departments
          : [];

      setDepartments(departmentList);

      return departmentList;
    } catch (err) {
      console.error("Department loading error:", err);

      setError(
        err.response?.data?.error ||
          "Unable to load departments."
      );

      setDepartments([]);
      return [];
    }
  }, []);

  // Load employees with pagination and filters.
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/employees", {
        params: {
          search: search.trim() || undefined,
          status: status || undefined,
          page,
          limit: 10,
        },
      });

      setEmployees(response.data.employees || []);

      setPagination(
        response.data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalEmployees: 0,
          limit: 10,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to load employees. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const openCreateForm = async () => {
    setEditingEmployee(null);
    setError("");
    setSuccess("");

    // Refresh departments before opening the form.
    await loadDepartments();

    setShowForm(true);
  };

  const openEditForm = async (employee) => {
    setEditingEmployee(employee);
    setError("");
    setSuccess("");

    // Also refresh departments when editing.
    await loadDepartments();

    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingEmployee) {
        await api.put(
          `/employees/${editingEmployee._id}`,
          formData
        );

        setSuccess("Employee updated successfully.");
      } else {
        await api.post("/employees", formData);

        setSuccess("Employee created successfully.");
      }

      setShowForm(false);
      setEditingEmployee(null);
      setPage(1);

      await loadEmployees();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to save employee."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/employees/${employee._id}`);

      setSuccess("Employee deleted successfully.");

      if (employees.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadEmployees();
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to delete employee."
      );
    }
  };

  const formatSalary = (salary) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(salary || 0);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN")
      : "—";

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Employees</h2>
          <p className="text-secondary mb-0">
            Manage employee records, roles, and department assignments.
          </p>
        </div>

        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={openCreateForm}
          >
            + Add Employee
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      {showForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </h5>
          </div>

          <div className="card-body">
            {departments.length === 0 ? (
              <div className="alert alert-warning">
                No departments found. Please create departments
                before assigning employees.
              </div>
            ) : null}

            <EmployeeForm
              initialData={editingEmployee}
              departments={departments}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingEmployee(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-4">
            <div className="col-lg-7">
              <label htmlFor="employeeSearch" className="form-label">
                Search employees
              </label>

              <input
                id="employeeSearch"
                type="search"
                className="form-control"
                placeholder="Search name, email, ID, or designation..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-lg-3">
              <label htmlFor="employeeStatus" className="form-label">
                Filter by status
              </label>

              <select
                id="employeeStatus"
                className="form-select"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="col-lg-2 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Employee Directory</h5>

            <span className="text-secondary small">
              {pagination.totalEmployees} total employees
            </span>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>

              <p className="text-secondary mt-3">
                Loading employee records...
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-5">
              <h5>No employees found</h5>

              <p className="text-secondary">
                Try changing your filters or add a new employee.
              </p>

              {!search && !status && (
                <button
                  className="btn btn-primary"
                  onClick={openCreateForm}
                >
                  Add First Employee
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Salary / Month</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start text-decoration-none fw-semibold"
                            onClick={() =>
                              navigate(
                                `/admin-dashboard/employees/${employee._id}`
                              )
                            }
                          >
                            {employee.name}
                          </button>

                          <div className="small text-secondary">
                            {employee.employeeId}
                          </div>

                          <div className="small text-secondary">
                            {employee.email}
                          </div>
                        </td>

                        <td>{employee.designation}</td>

                        <td>
                          {employee.department?.departmentName || "—"}
                        </td>

                        <td>{formatSalary(employee.salary)}</td>

                        <td>
                          <span
                            className={`badge ${
                              employee.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {employee.status}
                          </span>
                        </td>

                        <td>{formatDate(employee.joiningDate)}</td>

                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditForm(employee)}
                            >
                              Edit
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(employee)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
                <span className="small text-secondary">
                  Page {pagination.currentPage} of{" "}
                  {Math.max(pagination.totalPages, 1)}
                </span>

                <div className="btn-group">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
