import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

/* ------------------------------------------------------------------ */
/*  Guards a route behind the doctor login.                            */
/*                                                                     */
/*  - Not logged in            → redirected to "/" (the LLogin screen),*/
/*    remembering where they were headed so LLogin can send them back  */
/*    after a successful login.                                        */
/*  - Logged in, wrong role    → redirected to "/" (only relevant if   */
/*    you add more roles later; today the only role is "admin").       */
/*                                                                     */
/*  NOTE: this is a UX guard, not real security — sessionStorage can   */
/*  be set by anyone in DevTools, and the API itself is unprotected.   */
/*  True protection needs backend auth (token on every API request).   */
/* ------------------------------------------------------------------ */
const ProtectedRoute = ({ allowedRole, children }) => {
  const location = useLocation();
  const role = sessionStorage.getItem("role");

  // Not logged in at all → go to the doctor login, remember the target
  if (!role) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Logged in but with the wrong role
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  allowedRole: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;