
import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import DepartmentForm from "./DepartmentForm";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const loadDepartments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/departments");
      setDepartments(response.data.departments || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to load departments. Check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return departments;

    return departments.filter((department) =>
      `${department.departmentName} ${department.description || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [departments, search]);

  const openCreateForm = () => {
    setEditingDepartment(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (department) => {
    setEditingDepartment(department);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingDepartment) {
        await api.put(
          `/departments/${editingDepartment._id}`,
          formData
        );
        setSuccess("Department updated successfully.");
      } else {
        await api.post("/departments", formData);
        setSuccess("Department created successfully.");
      }

      setShowForm(false);
      setEditingDepartment(null);
      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to save department."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Delete the "${department.departmentName}" department?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/departments/${department._id}`);
      setSuccess("Department deleted successfully.");
      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to delete department."
      );
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Departments</h2>
          <p className="text-secondary mb-0">
            Organize teams and manage department information.
          </p>
        </div>

        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={openCreateForm}
          >
            <span className="me-2">+</span> Add Department
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
              {editingDepartment
                ? "Edit Department"
                : "Create Department"}
            </h5>
          </div>

          <div className="card-body">
            <DepartmentForm
              initialData={editingDepartment}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingDepartment(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row align-items-center g-3 mb-4">
            <div className="col-md-6">
              <h5 className="mb-1">All Departments</h5>
              <small className="text-secondary">
                {departments.length} department
                {departments.length === 1 ? "" : "s"} total
              </small>
            </div>

            <div className="col-md-6">
              <input
                type="search"
                className="form-control"
                placeholder="Search departments..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search departments"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border text-primary"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-secondary mt-3 mb-0">
                Loading departments...
              </p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-5">
              <h5>
                {search
                  ? "No matching departments"
                  : "No departments yet"}
              </h5>
              <p className="text-secondary mb-3">
                {search
                  ? "Try another search term."
                  : "Create your first department to get started."}
              </p>

              {!search && (
                <button
                  className="btn btn-primary"
                  onClick={openCreateForm}
                >
                  Add First Department
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Employees</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDepartments.map((department) => (
                    <tr key={department._id}>
                      <td>
                        <span className="fw-semibold">
                          {department.departmentName}
                        </span>
                      </td>

                      <td className="text-secondary">
                        {department.description || "—"}
                      </td>

                      <td>
                        <span className="badge text-bg-primary">
                          {department.employeeCount ?? 0}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditForm(department)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(department)}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentList;
