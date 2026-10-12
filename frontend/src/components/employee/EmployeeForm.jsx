
import { useEffect, useState } from "react";

const emptyForm = {
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    department: "",
    salary: "",
    joiningDate: "",
    status: "Active"
};

const EmployeeForm = ({
    initialData,
    departments = [],
    saving = false,
    onSubmit,
    onCancel
}) => {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setForm({
                ...emptyForm,
                ...initialData,
                department:
                    initialData.department?._id ||
                    initialData.department ||
                    "",
                joiningDate: initialData.joiningDate
                    ? String(initialData.joiningDate).slice(0, 10)
                    : "",
                salary: initialData.salary ?? ""
            });
        } else {
            setForm(emptyForm);
        }

        setErrors({});
    }, [initialData]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));

        setErrors((current) => ({
            ...current,
            [name]: ""
        }));
    };

    const validate = () => {
        const nextErrors = {};

        if (!form.name.trim()) {
            nextErrors.name = "Name is required.";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            nextErrors.email = "Enter a valid email address.";
        }

        if (!form.employeeId.trim()) {
            nextErrors.employeeId = "Employee ID is required.";
        }

        if (!form.designation.trim()) {
            nextErrors.designation = "Designation is required.";
        }

        if (form.salary === "" || Number(form.salary) < 0 ||
            !Number.isFinite(Number(form.salary))) {
            nextErrors.salary = "Enter a valid non-negative salary.";
        }

        if (!form.joiningDate) {
            nextErrors.joiningDate = "Joining date is required.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        onSubmit({
            ...form,
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            employeeId: form.employeeId.trim(),
            designation: form.designation.trim(),
            salary: Number(form.salary),
            department: form.department || null
        });
    };

    const fieldClass = (field) =>
        `form-control ${errors[field] ? "is-invalid" : ""}`;

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-name">
                        Full name *
                    </label>
                    <input
                        id="employee-name"
                        name="name"
                        className={fieldClass("name")}
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                    />
                    {errors.name && (
                        <div className="invalid-feedback">{errors.name}</div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-email">
                        Email *
                    </label>
                    <input
                        id="employee-email"
                        name="email"
                        type="email"
                        className={fieldClass("email")}
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                    />
                    {errors.email && (
                        <div className="invalid-feedback">{errors.email}</div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-id">
                        Employee ID *
                    </label>
                    <input
                        id="employee-id"
                        name="employeeId"
                        className={fieldClass("employeeId")}
                        value={form.employeeId}
                        onChange={handleChange}
                        required
                    />
                    {errors.employeeId && (
                        <div className="invalid-feedback">
                            {errors.employeeId}
                        </div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-designation">
                        Designation *
                    </label>
                    <input
                        id="employee-designation"
                        name="designation"
                        className={fieldClass("designation")}
                        value={form.designation}
                        onChange={handleChange}
                        required
                    />
                    {errors.designation && (
                        <div className="invalid-feedback">
                            {errors.designation}
                        </div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-department">
                        Department
                    </label>
                    <select
                        id="employee-department"
                        name="department"
                        className="form-select"
                        value={form.department}
                        onChange={handleChange}
                    >
                        <option value="">Unassigned</option>
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

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-salary">
                        Monthly salary (₹) *
                    </label>
                    <input
                        id="employee-salary"
                        name="salary"
                        type="number"
                        min="0"
                        step="0.01"
                        className={fieldClass("salary")}
                        value={form.salary}
                        onChange={handleChange}
                        required
                    />
                    {errors.salary && (
                        <div className="invalid-feedback">
                            {errors.salary}
                        </div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-joining-date">
                        Joining date *
                    </label>
                    <input
                        id="employee-joining-date"
                        name="joiningDate"
                        type="date"
                        className={fieldClass("joiningDate")}
                        value={form.joiningDate}
                        onChange={handleChange}
                        required
                    />
                    {errors.joiningDate && (
                        <div className="invalid-feedback">
                            {errors.joiningDate}
                        </div>
                    )}
                </div>

                <div className="col-md-6">
                    <label className="form-label" htmlFor="employee-status">
                        Employment status
                    </label>
                    <select
                        id="employee-status"
                        name="status"
                        className="form-select"
                        value={form.status}
                        onChange={handleChange}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    className="btn btn-info text-white"
                    disabled={saving}
                >
                    {saving
                        ? "Saving..."
                        : initialData
                            ? "Save Changes"
                            : "Create Employee"}
                </button>
            </div>
        </form>
    );
};

export default EmployeeForm;
