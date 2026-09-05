import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./auth/Login";
import Signup from "./auth/Signup";
import LLogin from "./auth/LLogin";

import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import RegisteredUsersData from "./pages/RegisteredUsersData";
import FinalData from "./pages/FinalData";
import BookAppoEntry from "./pages/BookAppoEntry";

import ProtectedRoute from "./ProtectedRoute";

import "./index.css";

/* ------------------------------------------------------------------ */
/*  Route map                                                          */
/*  - "/" is the only public route: the doctor login (LLogin).         */
/*  - Every other screen requires role === "admin" in sessionStorage,  */
/*    i.e. the clinic device must be unlocked with the doctor password */
/*    before patients or staff can use any screen.                     */
/*  - Unknown URLs land on "/", where ProtectedRoute + LLogin decide   */
/*    what happens next.                                               */
/* ------------------------------------------------------------------ */

// Adding test branch
const App = () => {
  return (
    <div>
      <Routes>
        {/* Public: doctor login */}
        <Route path="/" element={<LLogin />} />

        {/* Everything below requires login */}
        <Route
          path="/admin-dashboard"
          element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/registered-users-data"
          element={<ProtectedRoute allowedRole="admin"><RegisteredUsersData /></ProtectedRoute>}
        />
        <Route
          path="/finalData"
          element={<ProtectedRoute allowedRole="admin"><FinalData /></ProtectedRoute>}
        />
        <Route
          path="/bookAppointment"
          element={<ProtectedRoute allowedRole="admin"><BookAppoEntry /></ProtectedRoute>}
        />
        <Route
          path="/login"
          element={<ProtectedRoute allowedRole="admin"><Login /></ProtectedRoute>}
        />
        <Route
          path="/signup"
          element={<ProtectedRoute allowedRole="admin"><Signup /></ProtectedRoute>}
        />
        <Route
          path="/user-dashboard"
          element={<ProtectedRoute allowedRole="admin"><UserDashboard /></ProtectedRoute>}
        />

        {/* Catch-all: unknown URLs go to the login gate */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Required for all toast.success / toast.error calls app-wide */}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default App;