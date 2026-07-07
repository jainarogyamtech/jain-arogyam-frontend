import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faCircleExclamation, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:       "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-500 p-4",
  card:       "w-full max-w-md bg-white rounded-lg shadow-2xl p-6 sm:p-8",
  heading:    "text-3xl font-semibold text-center text-gray-800 mb-2",
  subheading: "text-sm text-center text-gray-500 mb-8",

  form:       "space-y-6",
  label:      "block text-sm font-medium text-gray-700 mb-1",
  input:      "block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition",
  inputError: "block w-full rounded-lg border border-red-400 bg-red-50 px-4 py-2.5 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition",
  hint:       "mt-1.5 text-xs text-gray-400",

  errorBox:   "flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3",
  errorIcon:  "mt-0.5 shrink-0",

  button:     "w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed transition",

  backRow:    "mt-6 text-center",
  backLink:   "inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition",
};

const BookAppoEntry = () => {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const handleChange = (e) => {
    setRegistrationNumber(e.target.value);
    if (error) setError(""); // clear the error as soon as the user starts fixing it
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    const trimmed = registrationNumber.trim();
    if (!trimmed) {
      setError("Registration Number is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.get(`${apiUrl}/users/by-reg/${trimmed}`);

      navigate("/appointment-details", {
        state: { registrationNumber: trimmed },
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setError("No user found with this registration number. Please check the number and try again.");
      } else {
        console.error("Error booking appointment:", err);
        setError("Something went wrong while looking up this registration number. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.heading}>Book an Appointment</h1>
        <p className={s.subheading}>Enter the patient's registration number to continue</p>

        <form onSubmit={handleBookAppointment} className={s.form} noValidate>
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
              aria-describedby={error ? "regnum-error" : undefined}
              className={error ? s.inputError : s.input}
            />
            <p className={s.hint}>Found on the patient's registration card or SMS.</p>
          </div>

          {error && (
            <div id="regnum-error" role="alert" className={s.errorBox}>
              <FontAwesomeIcon icon={faCircleExclamation} className={s.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={s.button}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Checking registration…
              </>
            ) : (
              "Book Appointment"
            )}
          </button>
        </form>

        <div className={s.backRow}>
          <Link to="/admin-dashboard" className={s.backLink}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Live Appointment Diary
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookAppoEntry;