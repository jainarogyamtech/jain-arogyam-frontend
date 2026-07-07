import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faEye,
  faEyeSlash,
  faArrowLeft,
  faUserDoctor,
} from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  Styles — all Tailwind class strings in one place.                  */
/*  Restyle the whole screen here without touching the markup.        */
/* ------------------------------------------------------------------ */
const s = {
  page:       "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-500 p-4",
  card:       "w-full max-w-md bg-white rounded-lg shadow-2xl p-6 sm:p-8",
  iconBadge:  "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-2xl",
  heading:    "text-2xl font-semibold text-center text-gray-800",
  clinicName: "text-blue-600 text-center font-semibold mb-1",
  subheading: "text-sm text-center text-gray-500 mb-8",

  form:       "space-y-6",
  label:      "block text-sm font-medium text-gray-700 mb-1",
  inputWrap:  "relative",
  input:      "block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 shadow-sm hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition",
  inputError: "block w-full rounded-lg border border-red-400 bg-red-50 px-4 py-2.5 pr-12 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition",
  eyeButton:  "absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-gray-600 transition",

  errorBox:   "flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3",
  errorIcon:  "mt-0.5 shrink-0",

  button:     "w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed transition",

  backRow:    "mt-6 text-center",
  backLink:   "inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition",
};

/* ------------------------------------------------------------------ */
/*  SECURITY NOTE — please read.                                       */
/*  VITE_* env vars are compiled INTO the JavaScript bundle that every */
/*  visitor downloads. Anyone can open DevTools → Sources and read     */
/*  VITE_ADMIN_PASSWORD in plain text, and can also just set           */
/*  sessionStorage.role = "admin" themselves. This screen therefore    */
/*  provides convenience, not security. Real protection requires a     */
/*  backend login endpoint (e.g. POST /auth/login returning a token)   */
/*  that the admin routes verify on every API request.                 */
/* ------------------------------------------------------------------ */
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const LLogin = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go after login: the page the user originally tried to open
  // (set by ProtectedRoute), or the admin dashboard by default.
  const redirectTo = location.state?.from?.pathname || "/admin-dashboard";

  // Already logged in? Skip the login form entirely.
  useEffect(() => {
    if (sessionStorage.getItem("role") === "admin") {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleChange = (e) => {
    setPassword(e.target.value);
    if (error) setError(""); // clear the error as soon as the user starts fixing it
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (!password) {
      setError("Please enter the doctor password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem("role", "admin");
        // replace: true → the back button won't return to the login screen
        navigate(redirectTo, { replace: true });
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.iconBadge}>
          <FontAwesomeIcon icon={faUserDoctor} />
        </div>
        <h1 className={s.heading}>Doctor Login</h1>
        <p className={s.clinicName}>Jain Arogyam</p>
        <p className={s.subheading}>Staff access to the appointment diary</p>

        <form onSubmit={handleLogin} className={s.form} noValidate>
          <div>
            <label htmlFor="password" className={s.label}>
              Doctor Password
            </label>
            <div className={s.inputWrap}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={handleChange}
                autoFocus
                autoComplete="current-password"
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className={error ? s.inputError : s.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={s.eyeButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {error && (
            <div id="login-error" role="alert" className={s.errorBox}>
              <FontAwesomeIcon icon={faCircleExclamation} className={s.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className={s.button}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <div className={s.backRow}>
          <Link to="/login" className={s.backLink}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to patient booking
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LLogin;