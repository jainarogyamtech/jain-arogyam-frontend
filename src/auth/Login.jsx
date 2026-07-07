import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:       "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-500 p-4",
  card:       "w-full max-w-md bg-white rounded-lg shadow-2xl p-6 sm:p-8",
  heading:    "text-3xl font-semibold text-center text-blue-600 mb-2",
  subheading: "text-sm text-center text-gray-500 mb-8",

  form:       "space-y-6",
  label:      "block text-sm font-medium text-gray-700 mb-1",
  input:      "block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition",
  inputError: "block w-full rounded-lg border border-red-400 bg-red-50 px-4 py-2.5 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition",
  hint:       "mt-1.5 text-xs text-gray-400",

  errorBox:   "flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3",
  errorIcon:  "mt-0.5 shrink-0",

  // Clear hierarchy: one solid primary action, one outlined secondary, one quiet text link
  btnPrimary:   "w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed transition",
  btnSecondary: "mt-4 block w-full text-center py-2.5 px-4 rounded-lg border border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 transition",

  divider:      "my-6 flex items-center gap-3 text-xs text-gray-400 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200",
  staffRow:     "text-center",
  staffLink:    "text-sm text-gray-500 hover:text-green-700 underline underline-offset-2 transition",
};

const Login = () => {
  const [registrationNumber, setRegistrationNumber] = useState(
    localStorage.getItem("registrationNumber") || ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const handleChange = (e) => {
    setRegistrationNumber(e.target.value);
    if (error) setError(""); // clear the error as soon as the user starts fixing it
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const trimmed = registrationNumber.trim();
    if (!trimmed) {
      setError("Registration Number is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${apiUrl}/users/by-reg/${trimmed}`);
      if (response.data) {
        localStorage.setItem("registrationNumber", trimmed); // remember for next visit
        navigate("/user-dashboard", {
          state: { registrationNumber: trimmed },
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError("No user found with this registration number. Please check the number, or sign up below.");
      } else {
        console.error("Login error:", err);
        setError("Something went wrong. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.heading}>Book Appointment</h1>
        <p className={s.subheading}>Enter your registration number to continue</p>

        <form onSubmit={handleLogin} className={s.form} noValidate>
          <div>
            <label htmlFor="registrationNumber" className={s.label}>
              Registration Number
            </label>
            <input
              type="text"
              id="registrationNumber"
              value={registrationNumber}
              onChange={handleChange}
              autoFocus
              autoComplete="off"
              placeholder="e.g. REG-1024"
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              className={error ? s.inputError : s.input}
            />
            <p className={s.hint}>You received this when you registered.</p>
          </div>

          {error && (
            <div id="login-error" role="alert" className={s.errorBox}>
              <FontAwesomeIcon icon={faCircleExclamation} className={s.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={s.btnPrimary}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Checking…
              </>
            ) : (
              "Book Appointment"
            )}
          </button>
        </form>

        <Link to="/signup" className={s.btnSecondary}>
          Don&apos;t have an account? Sign Up
        </Link>

        <div className={s.divider}>Clinic staff</div>

        <div className={s.staffRow}>
          <Link to="/admin-dashboard" className={s.staffLink}>
            Open Live Appointment Diary
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;