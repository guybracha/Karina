import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-5 text-center">Loading…</div>;
  }

  return user ? (
    children
  ) : (
    <Navigate to="/" replace state={{ from: location }} />
  );
}
