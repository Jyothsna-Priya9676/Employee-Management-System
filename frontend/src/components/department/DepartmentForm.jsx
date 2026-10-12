
import { useEffect, useState } from "react";

const DepartmentForm = ({
  initialData,
  saving,
  onSubmit,
  onCancel,
}) => {
  const [departmentName, setDepartmentName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDepartmentName(initialData?.departmentName || "");
    setDescription(initialData?.description || "");
  }, [initialData]);

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      departmentName: departmentName.trim(),
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="departmentName" className="form-label">
          Department Name *
        </label>

        <input
          id="departmentName"
          className="form-control"
          type="text"
          value={departmentName}
          onChange={(event) => setDepartmentName(event.target.value)}
          placeholder="e.g. Engineering"
          maxLength={100}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="departmentDescription" className="form-label">
          Description
        </label>

        <textarea
          id="departmentDescription"
          className="form-control"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this department"
          rows={4}
          maxLength={500}
        />

        <div className="form-text">
          {description.length}/500 characters
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2">
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
          className="btn btn-primary"
          disabled={saving || !departmentName.trim()}
        >
          {saving
            ? "Saving..."
            : initialData
              ? "Update Department"
              : "Create Department"}
        </button>
      </div>
    </form>
  );
};

export default DepartmentForm;
