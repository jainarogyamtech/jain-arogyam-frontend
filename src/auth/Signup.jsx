import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faCircleExclamation,
  faCircleCheck,
  faCopy,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:       "flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-500 p-4",
  card:       "bg-white shadow-xl rounded-xl p-6 sm:p-10 max-w-lg w-full",
  heading:    "text-3xl font-extrabold text-center text-blue-800 mb-2",
  subheading: "text-sm text-center text-gray-500 mb-8",

  form:       "space-y-4",
  nameGrid:   "grid grid-cols-1 sm:grid-cols-2 gap-4",
  label:      "block text-sm font-medium text-gray-700 mb-1",
  optional:   "text-gray-400 font-normal",
  input:      "w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition",
  select:     "w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition",

  errorBox:   "flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3",
  errorIcon:  "mt-0.5 shrink-0",

  btnPrimary: "w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-2.5 rounded-lg font-bold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed transition",
  loginRow:   "mt-4 text-center text-gray-700 text-sm",
  loginLink:  "text-blue-700 font-semibold underline underline-offset-2 hover:text-blue-900 transition",

  divider:    "my-6 flex items-center gap-3 text-xs text-gray-400 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200",
  staffRow:   "text-center",
  staffLink:  "text-sm text-gray-500 hover:text-indigo-700 underline underline-offset-2 transition",

  /* Success state — the registration number is the patient's only
     credential, so it gets the whole card, not a banner. */
  successWrap:   "text-center",
  successIcon:   "text-green-500 text-5xl mb-4",
  successTitle:  "text-2xl font-bold text-gray-800 mb-2",
  successNote:   "text-sm text-gray-500 mb-6",
  regBox:        "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg py-5 px-4 mb-2",
  regLabel:      "text-xs uppercase tracking-wide text-gray-500 mb-1",
  regNumber:     "text-3xl font-mono font-bold text-blue-800 tracking-wider break-all",
  btnCopy:       "mt-3 inline-flex items-center gap-2 text-sm text-blue-700 border border-blue-300 rounded-lg px-4 py-2 hover:bg-blue-50 transition",
  copiedText:    "text-green-600",
  keepSafe:      "text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 mb-6",
  btnBook:       "w-full bg-blue-700 text-white py-2.5 rounded-lg font-bold hover:bg-blue-800 transition",
  btnAnother:    "mt-3 w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition",
};

const EMPTY_ALERT = { type: "", message: "", registrationNumber: null };

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [alert, setAlert] = useState(EMPTY_ALERT);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;
  const today = new Date().toISOString().slice(0, 10); // DOB can't be in the future

  // Produces MM/DD/YYYY (unchanged storage format). Parses the string
  // directly instead of via new Date(), which could shift the day by one
  // in some timezones.
  const formatDateForStorage = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-");
    return `${month}/${day}/${year}`;
  };

  // Digits only, capped at 10 — bad characters can't be typed at all
  const handleMobileChange = (e) => {
    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setAlert(EMPTY_ALERT);

    if (!firstName.trim() || !lastName.trim() || !gender || !dob) {
      setAlert({
        ...EMPTY_ALERT,
        type: "error",
        message: "First name, last name, gender, and date of birth are required.",
      });
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAlert({ ...EMPTY_ALERT, type: "error", message: "Please enter a valid email address." });
      return;
    }

    if (mobile && !/^\d{10}$/.test(mobile)) {
      setAlert({ ...EMPTY_ALERT, type: "error", message: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${apiUrl}/users`, {
        FirstName: firstName.trim(),
        LastName: lastName.trim(),
        PatientEmail: email || null,
        MobileNumber: mobile || null,
        Gender: gender,
        Date_Of_Birth: formatDateForStorage(dob),
      });

      const { RegistrationNumber } = response.data;
      localStorage.setItem("registrationNumber", RegistrationNumber);

      setAlert({
        type: "success",
        message: "Signup successful!",
        registrationNumber: RegistrationNumber,
      });

      setFirstName("");
      setLastName("");
      setEmail("");
      setMobile("");
      setGender("");
      setDob("");
    } catch (error) {
      if (error.response?.status === 409) {
        setAlert({
          ...EMPTY_ALERT,
          type: "error",
          message: "A user already exists with the same details. Try logging in instead.",
        });
      } else {
        console.error("Signup error:", error);
        setAlert({ ...EMPTY_ALERT, type: "error", message: "Signup failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRegistrationNumber = async () => {
    if (!alert.registrationNumber) return;
    try {
      await navigator.clipboard.writeText(String(alert.registrationNumber));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard unavailable (e.g. non-HTTPS) — the number is still on screen
    }
  };

  const handleRegisterAnother = () => {
    setAlert(EMPTY_ALERT);
    setCopied(false);
  };

  const isSuccess = alert.type === "success" && alert.registrationNumber;

  /* ------------------------- Success screen ------------------------ */
  if (isSuccess) {
    return (
      <div className={s.page}>
        <div className={s.card}>
          <div className={s.successWrap}>
            <FontAwesomeIcon icon={faCircleCheck} className={s.successIcon} />
            <h2 className={s.successTitle}>Registration Successful</h2>
            <p className={s.successNote}>Your registration number is ready.</p>

            <div className={s.regBox}>
              <p className={s.regLabel}>Registration Number</p>
              <p className={s.regNumber}>{alert.registrationNumber}</p>
              <button onClick={handleCopyRegistrationNumber} className={s.btnCopy}>
                {copied ? (
                  <>
                    <FontAwesomeIcon icon={faCheck} className={s.copiedText} />
                    <span className={s.copiedText}>Copied!</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCopy} />
                    Copy number
                  </>
                )}
              </button>
            </div>

            <p className={s.keepSafe}>
              Please save this number — you'll need it every time you book an appointment.
            </p>

            <button onClick={() => navigate("/login")} className={s.btnBook}>
              Book an Appointment
            </button>
            <button onClick={handleRegisterAnother} className={s.btnAnother}>
              Register Another Patient
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------- Signup form -------------------------- */
  return (
    <div className={s.page}>
      <div className={s.card}>
        <h2 className={s.heading}>Signup</h2>
        <p className={s.subheading}>Register once to get your registration number</p>

        {alert.type === "error" && alert.message && (
          <div role="alert" className={`${s.errorBox} mb-4`}>
            <FontAwesomeIcon icon={faCircleExclamation} className={s.errorIcon} />
            <span>{alert.message}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className={s.form} noValidate>
          <div className={s.nameGrid}>
            <div>
              <label htmlFor="firstName" className={s.label}>First Name *</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                autoComplete="given-name"
                className={s.input}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={s.label}>Last Name *</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className={s.input}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={s.label}>
              Email <span className={s.optional}>(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              className={s.input}
            />
          </div>

          <div>
            <label htmlFor="mobile" className={s.label}>
              Mobile <span className={s.optional}>(optional)</span>
            </label>
            <input
              type="tel"
              id="mobile"
              inputMode="numeric"
              value={mobile}
              onChange={handleMobileChange}
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              className={s.input}
            />
          </div>

          <div>
            <label htmlFor="gender" className={s.label}>Gender *</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={s.select}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="dob" className={s.label}>Date of Birth *</label>
            <input
              type="date"
              id="dob"
              value={dob}
              max={today}
              onChange={(e) => setDob(e.target.value)}
              className={s.input}
            />
          </div>

          <button type="submit" disabled={loading} className={s.btnPrimary}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Signing Up…
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className={s.loginRow}>
          Already have an account?{" "}
          <Link to="/login" className={s.loginLink}>
            Login here
          </Link>
        </p>

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

export default Signup;