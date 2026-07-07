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

/* Columns that should sort as dates rather than text */
const DATE_KEYS = new Set(["Date_Of_Birth", "createdAt"]);

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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchMobile, setSearchMobile] = useState("");
  const [searchName, setSearchName] = useState("");
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchUsers = async () => {
    let allUsers = [];
    let offset   = 0;
    const limit  = 100;
    let hasMore  = true;

    try {
      while (hasMore) {
        const response = await axios.get(`${apiUrl}/users`, { params: { limit, offset } });
        const docs = response.data.documents || [];
        if (docs.length > 0) {
          allUsers = [...allUsers, ...docs];
          offset  += docs.length;
          if (docs.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("Failed to fetch users data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Sorting — applied to the master list, so filtering never wipes   */
  /*  the sort order. Dates sort as dates, numbers as numbers, and    */
  /*  text sorts case-insensitively; missing values go last.          */
  /* ---------------------------------------------------------------- */
  const sortedUsers = useMemo(() => {
    const { key, direction } = sortConfig;
    if (!key || !direction) return users;

    const dir = direction === "asc" ? 1 : -1;

    return [...users].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      // Missing values always sort to the end
      const missingA = valA === null || valA === undefined || valA === "";
      const missingB = valB === null || valB === undefined || valB === "";
      if (missingA && missingB) return 0;
      if (missingA) return 1;
      if (missingB) return -1;

      if (DATE_KEYS.has(key)) {
        const tA = new Date(valA).getTime();
        const tB = new Date(valB).getTime();
        if (!Number.isNaN(tA) && !Number.isNaN(tB)) return (tA - tB) * dir;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return (valA - valB) * dir;
      }

      return String(valA).localeCompare(String(valB), undefined, {
        sensitivity: "base",
        numeric: true, // "REG-9" < "REG-10"
      }) * dir;
    });
  }, [users, sortConfig]);

  /* ---------------------------------------------------------------- */
  /*  Filtering — ALL filters (date range + mobile + name) combine     */
  /*  with AND, derived from the sorted master list. End date is      */
  /*  inclusive of its whole day.                                     */
  /* ---------------------------------------------------------------- */
  const filteredUsers = useMemo(() => {
    const lowerMobile = searchMobile.trim().toLowerCase();
    const lowerName   = searchName.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to   = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return sortedUsers.filter((user) => {
      if (lowerMobile && !String(user.MobileNumber || "").toLowerCase().includes(lowerMobile)) {
        return false;
      }
      if (lowerName) {
        const first = String(user.FirstName || "").toLowerCase();
        const last  = String(user.LastName || "").toLowerCase();
        const full  = `${first} ${last}`;
        if (!first.includes(lowerName) && !last.includes(lowerName) && !full.includes(lowerName)) {
          return false;
        }
      }
      if (from || to) {
        const d = new Date(user.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [sortedUsers, searchMobile, searchName, fromDate, toDate]);

  // Back to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchMobile, searchName, fromDate, toDate]);

  const clearFilters = () => {
    setSearchMobile("");
    setSearchName("");
    setFromDate("");
    setToDate("");
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
  const downloadData = () => {
    const csvHeaders = ["Registration No", "First Name", "Last Name", "Gender", "Email", "Date Of Birth", "Mobile", "Created Date"];
    const csvContent = [
      csvHeaders.map(escapeCsv).join(","),
      ...filteredUsers.map((user) =>
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
  };

  /* ------------------------- Pagination ---------------------------- */
  const totalPages      = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safePage        = Math.min(currentPage, totalPages);
  const currentPageData = filteredUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const pageWindow      = useMemo(() => getPageWindow(safePage, totalPages), [safePage, totalPages]);
  const rangeStart      = filteredUsers.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const rangeEnd        = Math.min(safePage * itemsPerPage, filteredUsers.length);

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.heading}>Registered Users Data</h1>

        <div className={s.toolbar}>
          <button onClick={() => navigate("/admin-dashboard")} className={s.btnSuccess}>
            Live Appointment Diary
          </button>
          <button onClick={downloadData} className={s.btnPrimary}>
            Download Data
          </button>
        </div>

        {errorMessage && <div className={s.errorBox}>{errorMessage}</div>}

        {/* Filters — all combine (date range AND mobile AND name), applied live */}
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
            <button onClick={clearFilters} className={s.btnNeutral}>
              Clear Filters
            </button>
          </div>
        </div>

        <div className={s.filterRow}>
          <input type="text" value={searchMobile} onChange={(e) => setSearchMobile(e.target.value)} className={s.input} placeholder="Search by Mobile Number..." />
          <input type="text" value={searchName}   onChange={(e) => setSearchName(e.target.value)}   className={s.input} placeholder="Search by Name (First/Last)..." />
        </div>

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
                  {currentPageData.map((user) => (
                    <tr key={user._id} className={s.row}>
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

              {filteredUsers.length === 0 && (
                <div className={s.emptyState}>No users match the current filters.</div>
              )}
            </div>

            {/* Pagination — windowed, never overflows */}
            <div className={s.pagerBar}>
              <span className={s.pagerInfo}>
                Showing {rangeStart}–{rangeEnd} of {filteredUsers.length} users
              </span>

              <nav className={s.pagerNav} aria-label="Pagination">
                <button
                  className={s.pageEdge}
                  disabled={safePage === 1}
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
                      className={page === safePage ? s.pageBtnOn : s.pageBtn}
                      aria-current={page === safePage ? "page" : undefined}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className={s.pageEdge}
                  disabled={safePage >= totalPages}
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