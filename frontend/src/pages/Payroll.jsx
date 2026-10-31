
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

const STATUS_OPTIONS = [
  "All",
  "Draft",
  "Reviewed",
  "Approved",
  "Paid",
];

const STATUS_BADGES = {
  Draft: "bg-secondary",
  Reviewed: "bg-info text-dark",
  Approved: "bg-primary",
  Paid: "bg-success",
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN");
};

function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [status, setStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  // ------------------------------------------
  // FETCH PAYROLLS
  // ------------------------------------------

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        month,
        page: pagination.page,
        limit: pagination.limit,
      };

      if (status !== "All") {
        params.status = status;
      }

      const response = await api.get("/payroll", {
        params,
      });

      setPayrolls(response.data.payrolls || []);

      setPagination((previous) => ({
        ...previous,
        ...(response.data.pagination || {}),
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to fetch payroll records."
      );
    } finally {
      setLoading(false);
    }
  }, [month, status, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  // ------------------------------------------
  // DASHBOARD SUMMARY
  // ------------------------------------------

  const summary = useMemo(() => {
    return payrolls.reduce(
      (result, payroll) => {
        result.totalGross += Number(payroll.grossSalary || 0);
        result.totalNet += Number(payroll.netSalary || 0);
        result.totalDeductions += Number(
          payroll.totalDeductions || 0
        );

        if (payroll.status === "Draft") {
          result.draft++;
        }

        if (payroll.status === "Reviewed") {
          result.reviewed++;
        }

        if (payroll.status === "Approved") {
          result.approved++;
        }

        if (payroll.status === "Paid") {
          result.paid++;
        }

        return result;
      },
      {
        totalGross: 0,
        totalNet: 0,
        totalDeductions: 0,
        draft: 0,
        reviewed: 0,
        approved: 0,
        paid: 0,
      }
    );
  }, [payrolls]);

  // ------------------------------------------
  // GENERATE PAYROLL
  // ------------------------------------------

  const handleGeneratePayroll = async () => {
    const confirmed = window.confirm(
      `Generate payroll for ${month}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post("/payroll/generate", {
        month,
      });

      setSuccess(
        response.data.message ||
          "Payroll generation completed."
      );

      setPagination((previous) => ({
        ...previous,
        page: 1,
      }));

      // Fetch latest records.
      await fetchPayrolls();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Payroll generation failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------------------------------
  // RECALCULATE DRAFT PAYROLL
  // ------------------------------------------

  const handleRecalculate = async () => {
    const confirmed = window.confirm(
      `Recalculate all Draft payroll records for ${month}? Reviewed, Approved and Paid records will not be modified.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        "/payroll/recalculate-drafts",
        { month }
      );

      const result = response.data.result;

      setSuccess(
        `${response.data.message} Updated: ${result.updated}, Created: ${result.created}, Skipped: ${result.skipped}.`
      );

      await fetchPayrolls();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Payroll recalculation failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------------------------------
  // UPDATE PAYROLL STATUS
  // ------------------------------------------

  const handleStatusUpdate = async (payroll, nextStatus) => {
    const confirmed = window.confirm(
      `Change ${payroll.employeeName}'s payroll status from ${payroll.status} to ${nextStatus}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/payroll/${payroll._id}/status`,
        { status: nextStatus }
      );

      setSuccess(response.data.message);

      setSelectedPayroll(null);

      await fetchPayrolls();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update payroll status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------------------------------
  // STATUS ACTION BUTTON
  // ------------------------------------------

  const getNextAction = (payroll) => {
    const actions = {
      Draft: {
        label: "Mark Reviewed",
        next: "Reviewed",
        className: "btn-info",
      },
      Reviewed: {
        label: "Approve",
        next: "Approved",
        className: "btn-primary",
      },
      Approved: {
        label: "Mark Paid",
        next: "Paid",
        className: "btn-success",
      },
    };

    return actions[payroll.status] || null;
  };

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Payroll Management</h2>
          <p className="text-muted mb-0">
            Manage employee salaries, deductions and payments.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={handleRecalculate}
            disabled={actionLoading || loading}
          >
            {actionLoading ? "Processing..." : "Recalculate Drafts"}
          </button>

          <button
            className="btn btn-primary"
            onClick={handleGeneratePayroll}
            disabled={actionLoading || loading}
          >
            {actionLoading ? "Processing..." : "Generate Payroll"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          />
        </div>
      )}

      {/* FILTERS */}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Payroll Month
              </label>

              <input
                type="month"
                className="form-control"
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Payroll Status
              </label>

              <select
                className="form-select"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPagination((previous) => ({
                    ...previous,
                    page: 1,
                  }));
                }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={fetchPayrolls}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-2" />
                Refresh Payroll
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Gross Payroll"
          value={formatCurrency(summary.totalGross)}
          icon="bi-cash-stack"
          color="primary"
        />

        <SummaryCard
          title="Net Payroll"
          value={formatCurrency(summary.totalNet)}
          icon="bi-wallet2"
          color="success"
        />

        <SummaryCard
          title="Total Deductions"
          value={formatCurrency(summary.totalDeductions)}
          icon="bi-receipt"
          color="danger"
        />

        <SummaryCard
          title="Employees Processed"
          value={pagination.total}
          icon="bi-people"
          color="info"
        />
      </div>

      {/* WORKFLOW SUMMARY */}

      <div className="row g-3 mb-4">
        <WorkflowCard
          title="Draft"
          count={summary.draft}
          color="secondary"
        />

        <WorkflowCard
          title="Reviewed"
          count={summary.reviewed}
          color="info"
        />

        <WorkflowCard
          title="Approved"
          count={summary.approved}
          color="primary"
        />

        <WorkflowCard
          title="Paid"
          count={summary.paid}
          color="success"
        />
      </div>

      {/* PAYROLL TABLE */}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="fw-bold mb-0">
            Employee Payroll Records
          </h5>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border text-primary"
                role="status"
              />
              <p className="text-muted mt-2 mb-0">
                Loading payroll records...
              </p>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-receipt fs-1 text-muted" />
              <h6 className="mt-3">No payroll records found</h6>
              <p className="text-muted mb-0">
                Generate payroll for the selected month.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Working Days</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {payrolls.map((payroll) => {
                    const action = getNextAction(payroll);

                    return (
                      <tr key={payroll._id}>
                        <td>
                          <div className="fw-semibold">
                            {payroll.employeeName}
                          </div>
                          <small className="text-muted">
                            {payroll.employeeId}
                          </small>
                        </td>

                        <td>{payroll.departmentName || "—"}</td>

                        <td>{payroll.workingDays}</td>

                        <td>
                          <span className="text-success fw-semibold">
                            {payroll.presentDays}
                          </span>
                        </td>

                        <td>
                          <span className="text-danger fw-semibold">
                            {payroll.absentDays}
                          </span>
                        </td>

                        <td>
                          {formatCurrency(payroll.grossSalary)}
                        </td>

                        <td className="text-danger">
                          {formatCurrency(payroll.totalDeductions)}
                        </td>

                        <td className="fw-semibold">
                          {formatCurrency(payroll.netSalary)}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              STATUS_BADGES[payroll.status] ||
                              "bg-secondary"
                            }`}
                          >
                            {payroll.status}
                          </span>
                        </td>

                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              title="View details"
                              onClick={() =>
                                setSelectedPayroll(payroll)
                              }
                            >
                              <i className="bi bi-eye" />
                            </button>

                            {action && (
                              <button
                                className={`btn btn-sm ${action.className}`}
                                disabled={actionLoading}
                                onClick={() =>
                                  handleStatusUpdate(
                                    payroll,
                                    action.next
                                  )
                                }
                              >
                                {action.label}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINATION */}

        {pagination.totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </small>

            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((previous) => ({
                    ...previous,
                    page: previous.page - 1,
                  }))
                }
              >
                Previous
              </button>

              <button
                className="btn btn-sm btn-outline-primary"
                disabled={
                  pagination.page >= pagination.totalPages ||
                  loading
                }
                onClick={() =>
                  setPagination((previous) => ({
                    ...previous,
                    page: previous.page + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PAYROLL DETAILS MODAL */}

      {selectedPayroll && (
        <PayrollDetails
          payroll={selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ title, value, icon, color }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex align-items-center justify-content-between">
          <div>
            <p className="text-muted mb-2">{title}</p>
            <h5 className="fw-bold mb-0">{value}</h5>
          </div>

          <div
            className={`bg-${color} bg-opacity-10 text-${color} rounded-3 p-3`}
          >
            <i className={`${icon} fs-4`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// WORKFLOW CARD
// --------------------------------------------------

function WorkflowCard({ title, count, color }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <small className="text-muted">{title}</small>
          <h4 className={`fw-bold text-${color} mb-0`}>
            {count}
          </h4>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// PAYROLL DETAILS
// --------------------------------------------------

function PayrollDetails({ payroll, onClose }) {
  const rows = [
    ["Employee ID", payroll.employeeId],
    ["Employee Name", payroll.employeeName],
    ["Email", payroll.employeeEmail],
    ["Designation", payroll.designation],
    ["Department", payroll.departmentName],
    ["Payroll Month", payroll.month],
    ["Working Days", payroll.workingDays],
    ["Present Days", payroll.presentDays],
    ["Paid Leave Days", payroll.paidLeaveDays],
    ["Unpaid Leave Days", payroll.unpaidLeaveDays],
    ["Absent Days", payroll.absentDays],
    ["Monthly Salary Snapshot", formatCurrency(payroll.salarySnapshot)],
    ["Per Day Salary", formatCurrency(payroll.perDaySalary)],
    ["Basic Salary", formatCurrency(payroll.basicSalary)],
    ["HRA", formatCurrency(payroll.allowances?.hra)],
    ["Transport", formatCurrency(payroll.allowances?.transport)],
    ["Bonus", formatCurrency(payroll.allowances?.bonus)],
    ["Other Allowances", formatCurrency(payroll.allowances?.other)],
    ["Total Allowances", formatCurrency(payroll.totalAllowances)],
    ["Gross Salary", formatCurrency(payroll.grossSalary)],
    ["Unpaid Leave / Absence Deduction", formatCurrency(payroll.unpaidLeaveDeduction)],
    ["Other Deductions", formatCurrency(payroll.otherDeductions)],
    ["Total Deductions", formatCurrency(payroll.totalDeductions)],
  ];

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        backgroundColor: "rgba(0,0,0,0.5)",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title fw-bold">
                Payroll Details
              </h5>
              <small className="text-muted">
                {payroll.employeeName} · {payroll.month}
              </small>
            </div>

            <button
              className="btn-close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body">
            <div className="row g-3">
              {rows.map(([label, value]) => (
                <div className="col-md-6" key={label}>
                  <small className="text-muted d-block">
                    {label}
                  </small>
                  <strong>{value ?? "—"}</strong>
                </div>
              ))}
            </div>

            <hr />

            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Net Salary</h6>
              <h4 className="fw-bold text-success mb-0">
                {formatCurrency(payroll.netSalary)}
              </h4>
            </div>

            <div className="mt-3">
              <span className="text-muted me-2">Status:</span>
              <span
                className={`badge ${
                  STATUS_BADGES[payroll.status] ||
                  "bg-secondary"
                }`}
              >
                {payroll.status}
              </span>
            </div>

            <div className="mt-3 text-muted small">
              Generated: {formatDate(payroll.createdAt)}
              <br />
              Last updated: {formatDate(payroll.updatedAt)}
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payroll;
