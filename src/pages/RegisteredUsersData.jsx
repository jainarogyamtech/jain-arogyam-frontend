import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSortUp, faSortDown, faArrowsUpDown, faSpinner } from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — every Tailwind class string lives here, in one place.     */
/* ------------------------------------------------------------------ */
const s = {
  page:        "min-h-screen bg-gradient-to-br from-green-100 to-blue-500 p-4 sm:p-6",
  card:        "max-w-full mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-6",
  heading:     "text-2xl sm:text-3xl font-bold text-gray-800 mb-6",

  toolbar:     "mb-4 flex flex-wrap gap-3",
  btnPrimary:  "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition",
  btnSuccess:  "bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition",
  btnNeutral:  "bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 transition",

  errorBox:    "bg-red-100 text-red-700 p-4 rounded-md mb-4",

  filterRow:   "mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4",
  filterGroup: "flex flex-col",
  label:       "text-xs font-semibold text-gray-500 mb-1",
  input:       "p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400",

  loadingWrap: "flex items-center justify-center gap-3 py-16 text-gray-500",

  tableWrap:   "mt-6 overflow-x-auto rounded-lg border border-gray-200",
  table:       "min-w-full border-collapse text-sm",
  thead:       "bg-gray-100 sticky top-0 z-10",
  th:          "px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-gray-200 transition",
  sortIcon:    "ml-1 text-gray-400",
  row:         "border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-blue-50 transition-colors",
  td:          "px-4 py-2 whitespace-nowrap text-gray-700",

  emptyState:  "py-12 text-center text-gray-500",

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

/* ------------------------------------------------------------------ */
/*  CSV escaping (RFC 4180): wrap every value in quotes and double     */
/*  any internal quotes, so commas, quotes, and newlines in data       */
/*  can't shift or break columns.                                      */
/* ------------------------------------------------------------------ */
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const EMPTY_FILTERS = { fromDate: "", toDate: "", mobile: "", name: "" };

const COLUMNS = [
  { label: "Registration No", key: "RegistrationNumber" },
  { label: "First Name",       key: "FirstName" },
  { label: "Last Name",        key: "LastName" },
  { label: "Gender",           key: "Gender" },
  { label: "Email",            key: "PatientEmail" },
  { label: "Date Of Birth",    key: "Date_Of_Birth" },
  { label: "Mobile",           key: "MobileNumber" },
  { label: "Created Date",     key: "createdAt" },
];

const RegisteredUsersData = () => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Draft inputs, bound directly to the fields. They only take effect (and
  // trigger a fetch) once Search is clicked — matching AdminDashboard, and
  // avoiding a server round trip per keystroke.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchName, setSearchName] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  /* ---------------------------------------------------------------- */
  /*  Server-side pagination — only the current page's records are     */
  /*  fetched; sorting and filtering happen on the backend. An         */
  /*  AbortController cancels a stale request if the user pages/sorts  */
  /*  again before it returns, so responses can't arrive out of order. */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        const response = await axios.get(`${apiUrl}/users`, {
          signal: controller.signal,
          params: {
            page: currentPage,
            limit: itemsPerPage,
            sortKey: sortConfig.key || undefined,
            sortDir: sortConfig.direction || undefined,
            mobile: appliedFilters.mobile || undefined,
            name: appliedFilters.name || undefined,
            fromDate: appliedFilters.fromDate || undefined,
            toDate: appliedFilters.toDate || undefined,
          },
        });
        setUsers(response.data.documents || []);
        setTotalUsers(response.data.total || 0);
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error("Error fetching users:", error);
        setErrorMessage("Failed to fetch users data. Please try again later.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchUsers();
    return () => controller.abort();
  }, [apiUrl, currentPage, itemsPerPage, sortConfig, appliedFilters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters({ fromDate, toDate, mobile: searchMobile, name: searchName });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setSearchMobile("");
    setSearchName("");
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const sortData = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc"
        ? <FontAwesomeIcon icon={faSortUp} className={s.sortIcon} />
        : <FontAwesomeIcon icon={faSortDown} className={s.sortIcon} />;
    }
    return <FontAwesomeIcon icon={faArrowsUpDown} className={s.sortIcon} />;
  };

  /* -------------------- CSV export (filtered view) ----------------- */
  // Pulls every row matching the current filters from the backend (not just
  // the loaded page), since the client no longer holds the full dataset.
  const downloadData = async () => {
    try {
      setIsExporting(true);
      const response = await axios.get(`${apiUrl}/users/export`, {
        params: {
          sortKey: sortConfig.key || undefined,
          sortDir: sortConfig.direction || undefined,
          mobile: appliedFilters.mobile || undefined,
          name: appliedFilters.name || undefined,
          fromDate: appliedFilters.fromDate || undefined,
          toDate: appliedFilters.toDate || undefined,
        },
      });
      const rows = response.data.documents || [];

      const csvHeaders = ["Registration No", "First Name", "Last Name", "Gender", "Email", "Date Of Birth", "Mobile", "Created Date"];
      const csvContent = [
        csvHeaders.map(escapeCsv).join(","),
        ...rows.map((user) =>
          [
            user.RegistrationNumber || "",
            user.FirstName          || "",
            user.LastName           || "",
            user.Gender             || "",
            user.PatientEmail       || "",
            user.Date_Of_Birth ? new Date(user.Date_Of_Birth).toLocaleDateString() : "",
            user.MobileNumber || "",
            user.createdAt ? new Date(user.createdAt).toLocaleString("en-GB") : "",
          ].map(escapeCsv).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = "registered_users_data.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting users:", error);
      setErrorMessage("Failed to export users data. Please try again later.");
    } finally {
      setIsExporting(false);
    }
  };

  /* ------------------------- Pagination ---------------------------- */
  const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));
  const pageWindow = useMemo(() => getPageWindow(currentPage, totalPages), [currentPage, totalPages]);
  const rangeStart = totalUsers === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd   = Math.min(currentPage * itemsPerPage, totalUsers);

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.heading}>Registered Users Data</h1>

        <div className={s.toolbar}>
          <button onClick={() => navigate("/admin-dashboard")} className={s.btnSuccess}>
            Live Appointment Diary
          </button>
          <button onClick={downloadData} disabled={isExporting} className={s.btnPrimary}>
            {isExporting ? "Exporting…" : "Download Data"}
          </button>
        </div>

        {errorMessage && <div className={s.errorBox}>{errorMessage}</div>}

        {/* Filters — all combine (date range AND mobile AND name), applied on Search */}
        <form onSubmit={handleSearch}>
          <div className={s.filterRow}>
            <div className={s.filterGroup}>
              <label htmlFor="fromDate" className={s.label}>Registered From</label>
              <input type="date" id="fromDate" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={s.input} />
            </div>
            <div className={s.filterGroup}>
              <label htmlFor="toDate" className={s.label}>Registered To</label>
              <input type="date" id="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)} className={s.input} />
            </div>
            <div className={s.filterGroup}>
              <label className={s.label}>&nbsp;</label>
              <button type="button" onClick={clearFilters} className={s.btnNeutral}>
                Clear Filters
              </button>
            </div>
          </div>

          <div className={s.filterRow}>
            <input type="text" value={searchMobile} onChange={(e) => setSearchMobile(e.target.value)} className={s.input} placeholder="Search by Mobile Number..." />
            <input type="text" value={searchName}   onChange={(e) => setSearchName(e.target.value)}   className={s.input} placeholder="Search by Name (First/Last)..." />
            <button type="submit" className={s.btnPrimary}>Search</button>
          </div>
        </form>

        {loading && (
          <div className={s.loadingWrap}>
            <FontAwesomeIcon icon={faSpinner} spin />
            <span>Loading registered users…</span>
          </div>
        )}

        {!loading && (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead className={s.thead}>
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className={s.th} onClick={() => sortData(col.key)}>
                        {col.label} {getSortIcon(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    // Some legacy records (migrated from Appwrite) have a malformed
                    // string _id that Mongoose can't cast, hydrating as undefined —
                    // RegistrationNumber is the guaranteed-unique fallback.
                    <tr key={user._id || user.RegistrationNumber} className={s.row}>
                      <td className={s.td}>{user.RegistrationNumber || "N/A"}</td>
                      <td className={s.td}>{user.FirstName          || "N/A"}</td>
                      <td className={s.td}>{user.LastName           || "N/A"}</td>
                      <td className={s.td}>{user.Gender             || "N/A"}</td>
                      <td className={s.td}>{user.PatientEmail       || "N/A"}</td>
                      <td className={s.td}>
                        {user.Date_Of_Birth ? new Date(user.Date_Of_Birth).toLocaleDateString() : "N/A"}
                      </td>
                      <td className={s.td}>{user.MobileNumber || "N/A"}</td>
                      <td className={s.td}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleString("en-GB") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className={s.emptyState}>No users match the current filters.</div>
              )}
            </div>

            {/* Pagination — windowed, never overflows */}
            <div className={s.pagerBar}>
              <span className={s.pagerInfo}>
                Showing {rangeStart}–{rangeEnd} of {totalUsers} users
              </span>

              <nav className={s.pagerNav} aria-label="Pagination">
                <button
                  className={s.pageEdge}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      className={page === currentPage ? s.pageBtnOn : s.pageBtn}
                      aria-current={page === currentPage ? "page" : undefined}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className={s.pageEdge}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisteredUsersData;