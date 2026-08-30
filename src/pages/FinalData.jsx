import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:        "min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6",
  card:        "max-w-full mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-6",
  heading:     "text-3xl sm:text-4xl font-bold text-blue-800 text-center mb-8",

  navRow:      "flex flex-wrap justify-center gap-4 mb-8",
  navLinkBlue: "bg-blue-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105",
  navLinkIndigo: "bg-indigo-600 text-white py-3 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105",

  filterRow:   "flex flex-wrap gap-4 sm:gap-6 mb-6 items-end justify-center",
  filterGroup: "flex flex-col",
  label:       "text-sm font-semibold mb-2 text-gray-700",
  input:       "border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400",

  btnClear:    "bg-gray-100 text-gray-700 border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 transition-all",
  btnDownload: "bg-green-500 text-white px-6 py-2 mb-6 rounded-lg hover:bg-green-600 transition-all",

  loaderWrap:  "flex flex-col items-center justify-center gap-3 py-16 text-gray-500",
  loader:      "h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin",

  tableWrap:   "overflow-x-auto rounded-lg border border-gray-200",
  table:       "min-w-full table-auto border-collapse text-sm",
  thead:       "bg-indigo-50 sticky top-0 z-10",
  th:          "px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-indigo-100 transition",
  sortIcon:    "ml-1 text-gray-400 text-xs",
  row:         "border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors",
  td:          "px-4 py-2 whitespace-nowrap text-gray-700",
  checkbox:    "w-5 h-5 accent-indigo-600",
  emptyCell:   "text-center py-10 text-sm text-gray-500",

  pagerBar:    "mt-6 flex flex-col sm:flex-row items-center justify-between gap-3",
  pagerInfo:   "text-sm text-gray-600",
  pagerNav:    "flex items-center flex-wrap justify-center gap-1",
  pageBtn:     "min-w-[2.25rem] px-2 py-1 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition",
  pageBtnOn:   "min-w-[2.25rem] px-2 py-1 rounded text-sm bg-indigo-600 text-white font-semibold",
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

/* ------------------------------------------------------------------ */
/*  CSV escaping (RFC 4180): wrap every value in quotes and double     */
/*  any internal quotes, so commas, quotes, and newlines in remarks    */
/*  or problems can't shift or break columns.                          */
/* ------------------------------------------------------------------ */
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const EMPTY_FILTERS = { startDate: "", endDate: "", regNumber: "", name: "" };

const COLUMNS = [
  { key: "RegistrationNumber", label: "Registration Number" },
  { key: "AppointmentDates",   label: "Appointment Date" },
  { key: "PatientName",        label: "Patient Name" },
  { key: "PatientProblem",     label: "Patient Problem" },
  { key: "DoctorAttended",     label: "Doctor Attended" },
  { key: "TreatmentDone",      label: "Treatment Done" },
  { key: "PackagePurchased",   label: "Package Purchased" },
  { key: "RemainingSessions",  label: "Remaining Sessions" },
  { key: "PaymentReceived",    label: "Payment Received" },
  { key: "Payment",            label: "Payment" },
  { key: "PaymentMode",        label: "Payment Mode" },
  { key: "Remarks",            label: "Remarks" },
];

const FinalData = () => {
  const [patients, setPatients] = useState([]); // current page only
  const [totalPatients, setTotalPatients] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(10);

  // Draft inputs, bound directly to the fields. They only take effect (and
  // trigger a fetch) once Search is clicked, avoiding a server round trip
  // per keystroke.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const apiUrl = import.meta.env.VITE_API_URL;

  /* ---------------------------------------------------------------- */
  /*  Server-side pagination — only the current page's records are     */
  /*  fetched; sorting and filtering happen on the backend. An         */
  /*  AbortController cancels a stale request if the user pages/sorts  */
  /*  again before it returns, so responses can't arrive out of order. */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const controller = new AbortController();

    const fetchFinalizedPatients = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${apiUrl}/finalized`, {
          signal: controller.signal,
          params: {
            page: currentPage,
            limit: patientsPerPage,
            sortKey: sortConfig.key || undefined,
            sortDir: sortConfig.direction || undefined,
            regNumber: appliedFilters.regNumber || undefined,
            name: appliedFilters.name || undefined,
            startDate: appliedFilters.startDate || undefined,
            endDate: appliedFilters.endDate || undefined,
          },
        });
        setPatients(response.data.documents || []);
        setTotalPatients(response.data.total || 0);
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error("Error fetching finalized patients:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchFinalizedPatients();
    return () => controller.abort();
  }, [apiUrl, currentPage, patientsPerPage, sortConfig, appliedFilters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters({ startDate, endDate, regNumber: registrationSearch, name: nameSearch });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setRegistrationSearch("");
    setNameSearch("");
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const sortData = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) return sortConfig.direction === "asc" ? "▲" : "▼";
    return "⇅";
  };

  /* ------------------------- Pagination ---------------------------- */
  const totalPages = Math.max(1, Math.ceil(totalPatients / patientsPerPage));
  const pageWindow = useMemo(() => getPageWindow(currentPage, totalPages), [currentPage, totalPages]);
  const rangeStart = totalPatients === 0 ? 0 : (currentPage - 1) * patientsPerPage + 1;
  const rangeEnd   = Math.min(currentPage * patientsPerPage, totalPatients);

  const paginate       = (n) => setCurrentPage(n);
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  /* -------------------- CSV export (filtered view) ----------------- */
  // Pulls every row matching the current filters from the backend (not just
  // the loaded page), since the client no longer holds the full dataset.
  // ?? keeps real zeros (Payment: 0, RemainingSessions: 0), and
  // checkbox fields export as explicit Yes/No instead of vanishing
  // when false.
  const downloadData = async () => {
    try {
      setIsExporting(true);
      const response = await axios.get(`${apiUrl}/finalized/export`, {
        params: {
          sortKey: sortConfig.key || undefined,
          sortDir: sortConfig.direction || undefined,
          regNumber: appliedFilters.regNumber || undefined,
          name: appliedFilters.name || undefined,
          startDate: appliedFilters.startDate || undefined,
          endDate: appliedFilters.endDate || undefined,
        },
      });
      const rows = response.data.documents || [];

      const csvHeaders = [
        "Registration Number", "Appointment Date", "Patient Name", "Patient Problem",
        "Doctor Attended", "Treatment Done", "Package Purchased",
        "Remaining Sessions", "Payment Received", "Payment", "Payment Mode", "Remarks",
      ];

      const csvContent = [
        csvHeaders.map(escapeCsv).join(","),
        ...rows.map((p) =>
          [
            p.RegistrationNumber ?? "",
            p.AppointmentDates ? new Date(p.AppointmentDates).toLocaleDateString() : "N/A",
            p.PatientName    ?? "",
            p.PatientProblem ?? "",
            p.DoctorAttended ?? "",
            p.TreatmentDone  ?? "",
            p.PackagePurchased === true ? "Yes" : "No",
            p.RemainingSessions ?? "",
            p.PaymentReceived === true ? "Yes" : "No",
            p.Payment     ?? "",
            p.PaymentMode ?? "",
            p.Remarks     ?? "",
          ].map(escapeCsv).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = "finalized_patients_data.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting finalized patients:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.heading}>Historical Data</h1>

        <div className={s.navRow}>
          <Link to="/admin-dashboard" className={s.navLinkBlue}>
            Live Appointment Diary
          </Link>
          <Link to="/registered-users-data" className={s.navLinkIndigo}>
            Registered Users
          </Link>
        </div>

        {/* Filters — apply when Search is clicked */}
        <form onSubmit={handleSearch} className={s.filterRow}>
          <div className={s.filterGroup}>
            <label htmlFor="startDate" className={s.label}>Start Date</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={s.input} />
          </div>
          <div className={s.filterGroup}>
            <label htmlFor="endDate" className={s.label}>End Date</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={s.input} />
          </div>
          <div className={s.filterGroup}>
            <label htmlFor="registrationSearch" className={s.label}>Registration Number</label>
            <input type="text" id="registrationSearch" value={registrationSearch} onChange={(e) => setRegistrationSearch(e.target.value)} className={s.input} placeholder="e.g. JAP26..." />
          </div>
          <div className={s.filterGroup}>
            <label htmlFor="nameSearch" className={s.label}>Patient Name</label>
            <input type="text" id="nameSearch" value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} className={s.input} placeholder="Type to search…" />
          </div>
          <button type="submit" className={s.btnClear}>
            Search
          </button>
          <button type="button" onClick={clearFilters} className={s.btnClear}>
            Clear Filters
          </button>
        </form>

        <button onClick={downloadData} disabled={isExporting} className={s.btnDownload}>
          {isExporting ? "Exporting…" : "Download Data"}
        </button>

        {isLoading ? (
          <div className={s.loaderWrap}>
            <div className={s.loader} aria-hidden="true"></div>
            <span>Loading historical records…</span>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={s.th} onClick={() => sortData(col.key)}>
                      {col.label} <span className={s.sortIcon}>{getSortIcon(col.key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  // Some legacy records (migrated from Appwrite) have a malformed
                  // string _id that Mongoose can't cast, hydrating as undefined —
                  // RegistrationNumber is the guaranteed-unique fallback.
                  <tr key={patient._id || patient.RegistrationNumber} className={s.row}>
                    {COLUMNS.map(({ key: field }) => (
                      <td key={field} className={s.td}>
                        {field === "AppointmentDates" ? (
                          patient[field] ? new Date(patient[field]).toLocaleDateString() : "N/A"
                        ) : field === "PackagePurchased" || field === "PaymentReceived" ? (
                          <input type="checkbox" checked={patient[field] === true} disabled className={s.checkbox} />
                        ) : field === "Payment" || field === "RemainingSessions" ? (
                          patient[field] ?? "N/A" // keep real zeros visible
                        ) : (
                          patient[field] || "N/A"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {patients.length === 0 && (
              <div className={s.emptyCell}>
                No records found. Try widening the date range or clearing a filter.
              </div>
            )}
          </div>
        )}

        {/* Pagination — windowed, never overflows */}
        {!isLoading && (
          <div className={s.pagerBar}>
            <span className={s.pagerInfo}>
              Showing {rangeStart}–{rangeEnd} of {totalPatients} records
            </span>

            <nav className={s.pagerNav} aria-label="Pagination">
              <button onClick={handlePrevPage} disabled={currentPage === 1} className={s.pageEdge}>
                Prev
              </button>

              {pageWindow.map((page, idx) =>
                page === "…" ? (
                  <span key={`gap-${idx}`} className={s.ellipsis}>…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={page === currentPage ? s.pageBtnOn : s.pageBtn}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                )
              )}

              <button onClick={handleNextPage} disabled={currentPage >= totalPages} className={s.pageEdge}>
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalData;