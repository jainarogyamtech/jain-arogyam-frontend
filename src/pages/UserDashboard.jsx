import { useState, useEffect } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faCircleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Large-format screen: wide card, big typing area.                  */
/* ------------------------------------------------------------------ */
const s = {
  page:       "min-h-screen bg-gradient-to-br from-green-100 to-blue-500 flex flex-col items-center py-8 sm:py-12 px-4",
  card:       "bg-white rounded-lg shadow-2xl max-w-4xl w-full p-6 sm:p-10",
  heading:    "text-3xl font-bold text-gray-800 mb-1",
  regLine:    "text-sm text-gray-400 mb-4",
  intro:      "text-gray-600 text-lg mb-8",

  errorBox:   "flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6",
  errorIcon:  "mt-0.5 shrink-0",

  label:      "block text-base font-medium text-gray-700 mb-2",
  textarea:   "block w-full border border-gray-300 rounded-lg px-5 py-4 text-lg text-gray-700 leading-relaxed focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-y min-h-[280px] sm:min-h-[340px]",
  textareaError: "block w-full border border-red-400 bg-red-50 rounded-lg px-5 py-4 text-lg text-gray-700 leading-relaxed focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition resize-y min-h-[280px] sm:min-h-[340px]",
  hint:       "mt-2 text-sm text-gray-400",

  btnPrimary: "mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 px-4 rounded-lg text-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed transition",

  switchRow:  "mt-8 text-center",
  switchLink: "text-sm text-gray-500 hover:text-blue-600 underline underline-offset-2 transition",

  loaderWrap: "flex flex-col items-center justify-center gap-3 py-24 text-gray-500",
  loader:     "h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin",

  /* Success state */
  successWrap:  "text-center max-w-2xl mx-auto",
  successIcon:  "text-green-500 text-6xl mb-4",
  successTitle: "text-3xl font-bold text-gray-800 mb-2",
  successNote:  "text-gray-500 text-lg mb-8",
  summaryBox:   "bg-green-50 border border-green-200 rounded-lg text-left text-base text-gray-700 px-6 py-5 mb-8 space-y-2",
  summaryLabel: "font-semibold text-gray-800",
  btnAnother:   "mt-3 w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition",
};

const UserDashboard = ({ registrationNumber: regFromProp }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Registration number can arrive three ways; take the first available:
  // 1. as a prop, 2. via navigate("/user-dashboard", { state }), 3. saved
  // in localStorage from a previous login/signup.
  const registrationNumber =
    regFromProp ||
    location.state?.registrationNumber ||
    localStorage.getItem("registrationNumber") ||
    "";

  const [patientName, setPatientName] = useState("");
  const [patientProblem, setPatientProblem] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldError, setFieldError] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedProblem, setBookedProblem] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL;

  // No registration number from any source → back to login
  useEffect(() => {
    if (!registrationNumber) {
      navigate("/login", { replace: true });
    }
  }, [registrationNumber, navigate]);

  useEffect(() => {
    if (!registrationNumber) return;

    const fetchPatientData = async () => {
      try {
        setIsFetching(true);
        const response = await axios.get(`${apiUrl}/users/by-reg/${registrationNumber}`);
        const data = response.data;
        if (data) {
          // Users are stored with FirstName/LastName; fall back to
          // PatientName if the API provides it directly.
          const composedName =
            data.PatientName ||
            [data.FirstName, data.LastName].filter(Boolean).join(" ");
          setPatientName(composedName || "");
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("We couldn't find your details. Please log in again.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchPatientData();
  }, [registrationNumber, apiUrl]);

  const handleProblemChange = (e) => {
    setPatientProblem(e.target.value);
    if (fieldError) setFieldError(false);
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedProblem = patientProblem.trim();
    if (!trimmedProblem) {
      setFieldError(true);
      setErrorMessage("Please describe your problem so the doctor can prepare for your visit.");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${apiUrl}/appointments/upsert`, {
        PatientProblem: trimmedProblem,
        RegistrationNumber: registrationNumber,
        PatientName: patientName,
        AppointmentDate: new Date().toISOString(),
        Remarks: "",
        TreatmentDone: "",
        PaymentReceived: false,
        PackagePurchased: false,
        RemainingSessions: 0,
      });

      setBookedProblem(trimmedProblem);
      setBooked(true);
      setPatientProblem("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to book the appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setBooked(false);
    setBookedProblem("");
    setErrorMessage("");
  };

  /* ------------------------- Success screen ------------------------ */
  if (booked) {
    return (
      <div className={s.page}>
        <div className={s.card}>
          <div className={s.successWrap}>
            <FontAwesomeIcon icon={faCircleCheck} className={s.successIcon} />
            <h2 className={s.successTitle}>Appointment Booked</h2>
            <p className={s.successNote}>
              You're all set for today. Please arrive at the clinic and mention
              your registration number at the desk.
            </p>

            <div className={s.summaryBox}>
              <p><span className={s.summaryLabel}>Name:</span> {patientName || "—"}</p>
              <p><span className={s.summaryLabel}>Registration No:</span> {registrationNumber}</p>
              <p><span className={s.summaryLabel}>Date:</span> {new Date().toLocaleDateString("en-GB")}</p>
              <p><span className={s.summaryLabel}>Problem:</span> {bookedProblem}</p>
            </div>

            <button onClick={handleBookAnother} className={s.btnAnother}>
              Update Problem Description
            </button>

            <div className={s.switchRow}>
              <Link to="/login" className={s.switchLink}>
                Book for a different registration number
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------- Booking form ------------------------- */
  return (
    <div className={s.page}>
      <div className={s.card}>
        {isFetching ? (
          <div className={s.loaderWrap}>
            <div className={s.loader} aria-hidden="true"></div>
            <span>Loading your details…</span>
          </div>
        ) : (
          <>
            <h1 className={s.heading}>Hello, {patientName || "User"}!</h1>
            {registrationNumber && (
              <p className={s.regLine}>Registration No: {registrationNumber}</p>
            )}
            <p className={s.intro}>
              Tell us what's troubling you, and we'll book your appointment for today.
            </p>

            {errorMessage && (
              <div role="alert" className={s.errorBox}>
                <FontAwesomeIcon icon={faCircleExclamation} className={s.errorIcon} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDetails} noValidate>
              <label htmlFor="patientProblem" className={s.label}>
                Describe your problem
              </label>
              <textarea
                id="patientProblem"
                value={patientProblem}
                onChange={handleProblemChange}
                autoFocus
                rows={12}
                placeholder="e.g. Lower back pain for the past two weeks, worse in the mornings. Tried a hot compress but it hasn't helped…"
                disabled={isSubmitting}
                aria-invalid={fieldError}
                className={fieldError ? s.textareaError : s.textarea}
              />
              <p className={s.hint}>
                Take your time — the more detail you share, the better the doctor can prepare for your visit.
              </p>

              <button type="submit" disabled={isSubmitting} className={s.btnPrimary}>
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Booking…
                  </>
                ) : (
                  "Book Appointment"
                )}
              </button>
            </form>

            <div className={s.switchRow}>
              <Link to="/login" className={s.switchLink}>
                Not {patientName || "you"}? Use a different registration number
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

UserDashboard.propTypes = {
  registrationNumber: PropTypes.string,
};

export default UserDashboard;