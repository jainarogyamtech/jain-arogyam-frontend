import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:        "min-h-screen bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 p-4 sm:p-6",
  card:        "max-w-full mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-6",
  title:       "text-3xl font-bold text-gray-800 mb-2 text-center",
  subtitle:    "text-md text-gray-500 mb-6 text-center",

  navRow:      "mb-6 flex flex-wrap gap-3 justify-between",
  navBlue:     "bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all",
  navPurple:   "bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-all",
  navYellow:   "bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-all",

  searchForm:  "mb-6 flex flex-col md:flex-row gap-4",
  input:       "border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green-400",
  btnSearch:   "bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all",
  btnClear:    "bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all",

  errorBox:    "bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-center",

  loaderWrap:  "flex flex-col items-center justify-center gap-3 py-16 text-gray-500",
  loader:      "h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin",

  tableWrap:   "w-full overflow-x-auto rounded-lg border border-gray-200",
  table:       "table-auto w-full border-collapse text-sm",
  thead:       "bg-gray-100 sticky top-0 z-10",
  th:          "px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-gray-200 transition",
  thAction:    "px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap",
  sortIcon:    "ml-2 text-gray-400",
  row:         "border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors",
  td:          "px-4 py-2 border-b align-top",
  tdCenter:    "px-4 py-2 border-b text-center align-middle",
  cellInput:   "border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-300",
  cellSelect:  "border border-gray-300 rounded px-2 py-1 w-full bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400",
  checkbox:    "h-5 w-5 accent-indigo-600",
  emptyCell:   "text-center py-10 text-sm text-gray-500",

  btnUpdate:   "bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 block w-full mb-1 transition",
  btnFinalize: "bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 block w-full transition",

  pagerBar:    "mt-4 flex flex-col sm:flex-row items-center justify-between gap-3",
  pagerInfo:   "text-sm text-gray-600",
  pagerNav:    "flex items-center flex-wrap justify-center gap-1",
  pageBtn:     "min-w-[2.25rem] px-2 py-1 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition",
  pageBtnOn:   "min-w-[2.25rem] px-2 py-1 rounded text-sm bg-blue-600 text-white font-semibold",
  pageEdge:    "px-3 py-1 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed",
  ellipsis:    "px-1 text-gray-400 select-none",
};

/* ------------------------------------------------------------------ */
/*  Windowed page list: 1 … 5 6 [7] 8 9 … 200                          */
/* ------------------------------------------------------------------ */
const getPageWindow = (current, total, siblings = 2) => {
  if (total <= 7 + siblings) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const start = Math.max(current - siblings, 2);
  const end   = Math.min(current + siblings, total - 1);

  const pages = [1];
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
};

/* Per-type sorting hints */
const DATE_KEYS    = new Set(["AppointmentDate", "AppointmentTime"]);
const NUMBER_KEYS  = new Set(["Payment", "RemainingSessions"]);
const BOOLEAN_KEYS = new Set(["PackagePurchased", "PaymentReceived"]);

/* AppointmentTime is a virtual column: there's no separate time field in
   the DB, it's read out of / written back into AppointmentDate (already a
   full datetime under the hood). */
const getDatePart = (v) =>
  v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString().slice(0, 10) : "";
const getTimePart = (v) =>
  v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString().slice(11, 16) : "";
const combineDateTime = (datePart, timePart) => {
  if (!datePart && !timePart) return null;
  const d = datePart || new Date().toISOString().slice(0, 10);
  const t = timePart || "00:00";
  return new Date(`${d}T${t}:00.000Z`).toISOString();
};

/* RemainingSessions column added — it was editable in code and sent on
   finalize, but had no column, so staff could never actually set it and
   Historical Data always showed a stale value. */
const HEADERS = [
  { label: "Registration Number", field: "RegistrationNumber" },
  { label: "Appointment Date",    field: "AppointmentDate" },
  { label: "Appointment Time",    field: "AppointmentTime" },
  { label: "Patient Name",        field: "PatientName" },
  { label: "Patient Problem",     field: "PatientProblem" },
  { label: "Doctor Attended",     field: "DoctorAttended" },
  { label: "Treatment Done",      field: "TreatmentDone" },
  { label: "Package Purchased",   field: "PackagePurchased" },
  { label: "Remaining Sessions",  field: "RemainingSessions" },
  { label: "Payment Received",    field: "PaymentReceived" },
  { label: "Payment",             field: "Payment" },
  { label: "Payment Mode",        field: "PaymentMode" },
  { label: "Remarks",             field: "Remarks" },
];

const TEXT_CELLS = [
  { field: "RegistrationNumber", type: "text", minWidth: "200px" },
  {
    field: "AppointmentDate",
    type: "date",
    minWidth: "150px",
    formatValue: (v) => getDatePart(v),
    onValueChange: (patient, value) => combineDateTime(value, getTimePart(patient.AppointmentDate)),
  },
  {
    field: "AppointmentTime",
    type: "time",
    minWidth: "110px",
    formatValue: (_v, patient) => getTimePart(patient.AppointmentDate),
    onValueChange: (patient, value) => combineDateTime(getDatePart(patient.AppointmentDate), value),
  },
  { field: "PatientName",    type: "text", minWidth: "250px" },
  { field: "PatientProblem", type: "text", minWidth: "300px" },
  { field: "DoctorAttended", type: "text", minWidth: "200px" },
  { field: "TreatmentDone",  type: "text", minWidth: "200px" },
];

const EMPTY_FILTERS = { dateFrom: "", dateTo: "", regNumber: "", name: "" };

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: null });
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchRegNumber, setSearchRegNumber] = useState("");
  const [searchName, setSearchName] = useState("");
  // Filters are applied on Search click (not while typing) so that editing
  // a row's name/date fields can't make the row vanish mid-edit.
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchActivePatients = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${apiUrl}/appointments`);
      setPatients(response.data.documents || []);
    } catch (error) {
      console.error("Error fetching active patients:", error);
      setErrorMessage("Failed to fetch patient records. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePatients();
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Client-side search — applied on Search click; Clear resets.      */
  /* ---------------------------------------------------------------- */
  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters({
      dateFrom:  searchDateFrom,
      dateTo:    searchDateTo,
      regNumber: searchRegNumber,
      name:      searchName,
    });
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchRegNumber("");
    setSearchName("");
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  /* ---------------------------------------------------------------- */
  /*  Sorting — derived, never mutates state (edits stay intact and    */
  /*  the sort re-applies automatically). Dates sort as dates,        */
  /*  numbers as numbers, checkboxes as yes/no, text                  */
  /*  case-insensitively; missing values sink to the bottom.          */
  /* ---------------------------------------------------------------- */
  const sortedPatients = useMemo(() => {
    const { field, direction } = sortConfig;
    if (!field || !direction) return patients;

    const dir = direction === "asc" ? 1 : -1;

    return [...patients].sort((a, b) => {
      const valA = field === "AppointmentTime" ? a.AppointmentDate : a[field];
      const valB = field === "AppointmentTime" ? b.AppointmentDate : b[field];

      if (BOOLEAN_KEYS.has(field)) {
        return ((valA === true ? 1 : 0) - (valB === true ? 1 : 0)) * dir;
      }

      const missingA = valA === null || valA === undefined || valA === "";
      const missingB = valB === null || valB === undefined || valB === "";
      if (missingA && missingB) return 0;
      if (missingA) return 1;
      if (missingB) return -1;

      if (DATE_KEYS.has(field)) {
        const tA = new Date(valA).getTime();
        const tB = new Date(valB).getTime();
        if (!Number.isNaN(tA) && !Number.isNaN(tB)) return (tA - tB) * dir;
      }

      if (NUMBER_KEYS.has(field)) {
        const nA = Number(valA);
        const nB = Number(valB);
        if (!Number.isNaN(nA) && !Number.isNaN(nB)) return (nA - nB) * dir;
      }

      return String(valA).localeCompare(String(valB), undefined, {
        sensitivity: "base",
        numeric: true,
      }) * dir;
    });
  }, [patients, sortConfig]);

  const filteredPatients = useMemo(() => {
    const reg  = appliedFilters.regNumber.trim().toLowerCase();
    const name = appliedFilters.name.trim().toLowerCase();
    const from = appliedFilters.dateFrom ? new Date(appliedFilters.dateFrom) : null;
    const to   = appliedFilters.dateTo ? new Date(appliedFilters.dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999); // include the whole end day

    return sortedPatients.filter((p) => {
      if (reg && !String(p.RegistrationNumber || "").toLowerCase().includes(reg)) return false;
      if (name && !String(p.PatientName || "").toLowerCase().includes(name)) return false;

      if (from || to) {
        if (!p.AppointmentDate) return false;
        const d = new Date(p.AppointmentDate);
        if (Number.isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [sortedPatients, appliedFilters]);

  /* ------------------------- Pagination ---------------------------- */
  const totalPages        = Math.max(1, Math.ceil(filteredPatients.length / rowsPerPage));
  const safePage          = Math.min(currentPage, totalPages);
  const displayedPatients = filteredPatients.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );
  const pageWindow = useMemo(() => getPageWindow(safePage, totalPages), [safePage, totalPages]);
  const rangeStart = filteredPatients.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const rangeEnd   = Math.min(safePage * rowsPerPage, filteredPatients.length);

  /* --------------------------- Actions ----------------------------- */
  // Store edits as typed; numbers are normalized once, at save/finalize
  // time. (parseInt-on-keystroke made number fields impossible to clear.)
  const handleFieldChange = (id, field, value) => {
    setPatients((prev) =>
      prev.map((patient) =>
        patient._id === id ? { ...patient, [field]: value } : patient
      )
    );
  };

  const handleFinalizeRecord = async (patient) => {
    const requiredFields = [
      { field: "PatientProblem", label: "Patient Problem" },
      { field: "DoctorAttended", label: "Doctor Attended" },
      { field: "TreatmentDone",  label: "Treatment Done" },
      { field: "PaymentMode",    label: "Payment Mode" },
    ];

    const missingFields = requiredFields.filter(
      ({ field }) => !patient[field] || patient[field].toString().trim() === ""
    );

    // Payment is required but 0 is a legitimate amount (e.g. "At
    // Subscription") — only empty/non-numeric values are invalid.
    const paymentValue = patient.Payment;
    const paymentMissing =
      paymentValue === null ||
      paymentValue === undefined ||
      String(paymentValue).trim() === "" ||
      Number.isNaN(Number(paymentValue));
    if (paymentMissing) {
      missingFields.push({ field: "Payment", label: "Payment" });
    }

    if (missingFields.length > 0) {
      const missingFieldNames = missingFields.map((f) => f.label).join(", ");
      toast.error(`Please fill in the following required fields: ${missingFieldNames}`);
      return;
    }

    // Finalizing removes the record from the live diary — confirm first.
    const confirmed = window.confirm(
      `Finalize the record for ${patient.PatientName || "this patient"}? ` +
      `It will move to Historical Data and leave the live diary.`
    );
    if (!confirmed) return;

    try {
      const { _id, __v, createdAt, updatedAt, AppointmentDate, ...dataToMove } = patient;

      await axios.post(`${apiUrl}/finalized`, {
        appointmentId: _id,
        AppointmentDate: AppointmentDate || null,
        ...dataToMove,
        // Normalize types so Historical Data receives clean values
        Payment: Number(patient.Payment) || 0,
        RemainingSessions: Number(patient.RemainingSessions) || 0,
        PackagePurchased: Boolean(patient.PackagePurchased),
        PaymentReceived: Boolean(patient.PaymentReceived),
      });

      setPatients((prev) => prev.filter((p) => p._id !== _id));
      toast.success("Record successfully finalized.");
    } catch (error) {
      console.error("Error finalizing record:", error);
      toast.error(`Failed to finalize the record. Error: ${error.message}`);
    }
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      const { _id, __v, createdAt, updatedAt, ...dataToUpdate } = updatedData;

      if ("PackagePurchased" in dataToUpdate)
        dataToUpdate.PackagePurchased = Boolean(dataToUpdate.PackagePurchased);
      if ("PaymentReceived" in dataToUpdate)
        dataToUpdate.PaymentReceived = Boolean(dataToUpdate.PaymentReceived);
      if ("RemainingSessions" in dataToUpdate)
        dataToUpdate.RemainingSessions = Number(dataToUpdate.RemainingSessions) || 0;
      if ("Payment" in dataToUpdate)
        dataToUpdate.Payment = Number(dataToUpdate.Payment) || 0;

      const response = await axios.put(`${apiUrl}/appointments/${id}`, dataToUpdate);

      setPatients((prev) =>
        prev.map((patient) =>
          patient._id === id ? { ...patient, ...response.data } : patient
        )
      );

      toast.success("Record updated successfully!");
    } catch (error) {
      console.error("Failed to update record:", error);
      toast.error(`Failed to update the record. Error: ${error.message}`);
    }
  };

  const sortPatients = (field) => {
    const direction =
      sortConfig.field === field && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ field, direction });
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Jain Arogyam</h1>
        <h3 className={s.subtitle}>Live appointment diary</h3>

        {/* Navigation Buttons */}
        <div className={s.navRow}>
          <button onClick={() => navigate("/registered-users-data")} className={s.navBlue}>
            Registered Users
          </button>
          <button onClick={() => navigate("/finalData")} className={s.navPurple}>
            Historical Data
          </button>
          <button onClick={() => navigate("/login")} className={s.navYellow}>
            Book Appointment
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className={s.searchForm}>
          <input
            type="date"
            value={searchDateFrom}
            onChange={(e) => setSearchDateFrom(e.target.value)}
            aria-label="From Date"
            className={s.input}
          />
          <input
            type="date"
            value={searchDateTo}
            onChange={(e) => setSearchDateTo(e.target.value)}
            aria-label="To Date"
            className={s.input}
          />
          <input
            type="text"
            value={searchRegNumber}
            onChange={(e) => setSearchRegNumber(e.target.value)}
            placeholder="Registration Number"
            className={s.input}
          />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Name"
            className={s.input}
          />
          <button type="submit" className={s.btnSearch}>
            Search
          </button>
          <button type="button" onClick={handleClearSearch} className={s.btnClear}>
            Clear
          </button>
        </form>

        {errorMessage && <div className={s.errorBox}>{errorMessage}</div>}

        {isLoading ? (
          <div className={s.loaderWrap}>
            <div className={s.loader} aria-hidden="true"></div>
            <span>Loading appointments…</span>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {HEADERS.map(({ label, field }) => (
                    <th key={field} className={s.th} onClick={() => sortPatients(field)}>
                      {label}
                      <span className={s.sortIcon}>
                        {sortConfig.field === field &&
                          (sortConfig.direction === "asc" ? (
                            <i className="fas fa-arrow-up"></i>
                          ) : (
                            <i className="fas fa-arrow-down"></i>
                          ))}
                      </span>
                    </th>
                  ))}
                  <th className={s.thAction}>Action</th>
                </tr>
              </thead>

              <tbody>
                {displayedPatients.length > 0 ? (
                  displayedPatients.map((patient) => (
                    <tr key={patient._id} className={s.row}>
                      {TEXT_CELLS.map(({ field, type, minWidth, formatValue, onValueChange }) => (
                        <td key={`${patient._id}-${field}`} className={s.td} style={{ minWidth }}>
                          <input
                            type={type}
                            value={formatValue ? formatValue(patient[field], patient) : patient[field] || ""}
                            onChange={(e) => {
                              if (onValueChange) {
                                handleFieldChange(patient._id, "AppointmentDate", onValueChange(patient, e.target.value));
                              } else {
                                handleFieldChange(patient._id, field, e.target.value);
                              }
                            }}
                            className={s.cellInput}
                          />
                        </td>
                      ))}

                      {/* Package Purchased */}
                      <td className={s.tdCenter}>
                        <input
                          type="checkbox"
                          checked={patient.PackagePurchased || false}
                          onChange={(e) => handleFieldChange(patient._id, "PackagePurchased", e.target.checked)}
                          className={s.checkbox}
                        />
                      </td>

                      {/* Remaining Sessions */}
                      <td className={s.td} style={{ minWidth: "110px" }}>
                        <input
                          type="number"
                          min="0"
                          value={patient.RemainingSessions ?? ""}
                          onChange={(e) => handleFieldChange(patient._id, "RemainingSessions", e.target.value)}
                          className={s.cellInput}
                        />
                      </td>

                      {/* Payment Received */}
                      <td className={s.tdCenter}>
                        <input
                          type="checkbox"
                          checked={patient.PaymentReceived || false}
                          onChange={(e) => handleFieldChange(patient._id, "PaymentReceived", e.target.checked)}
                          className={s.checkbox}
                        />
                      </td>

                      {/* Payment — clearable while typing; normalized on save */}
                      <td className={s.td} style={{ minWidth: "110px" }}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={patient.Payment ?? ""}
                          onChange={(e) => handleFieldChange(patient._id, "Payment", e.target.value)}
                          className={s.cellInput}
                        />
                      </td>

                      {/* Payment Mode */}
                      <td className={s.td}>
                        <select
                          value={patient.PaymentMode || ""}
                          onChange={(e) => handleFieldChange(patient._id, "PaymentMode", e.target.value)}
                          className={s.cellSelect}
                        >
                          <option value="" disabled>Select Payment Mode</option>
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="at subscription">At Subscription</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className={s.td}>
                        <input
                          type="text"
                          value={patient.Remarks || ""}
                          onChange={(e) => handleFieldChange(patient._id, "Remarks", e.target.value)}
                          className={s.cellInput}
                        />
                      </td>

                      {/* Actions */}
                      <td className={s.tdCenter}>
                        <button onClick={() => handleUpdate(patient._id, patient)} className={s.btnUpdate}>
                          Update
                        </button>
                        <button
                          onClick={() => handleFinalizeRecord(patient)}
                          className={s.btnFinalize}
                          aria-label={`Finalize record for ${patient.PatientName}`}
                        >
                          Finalize
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={HEADERS.length + 1} className={s.emptyCell}>
                      No records found. Try adjusting the search or clearing filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — windowed, never overflows */}
        {!isLoading && (
          <div className={s.pagerBar}>
            <span className={s.pagerInfo}>
              Showing {rangeStart}–{rangeEnd} of {filteredPatients.length} appointments
            </span>

            <nav className={s.pagerNav} aria-label="Pagination">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={s.pageEdge}
              >
                Previous
              </button>

              {pageWindow.map((page, idx) =>
                page === "…" ? (
                  <span key={`gap-${idx}`} className={s.ellipsis}>…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={page === safePage ? s.pageBtnOn : s.pageBtn}
                    aria-current={page === safePage ? "page" : undefined}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={s.pageEdge}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;