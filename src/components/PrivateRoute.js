// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";

export default function PrivateRoute({ children }) {
  const user = auth.currentUser;
  const loc = useLocation();
  if (!user) {
    const ret = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?returnTo=${ret}`} replace />;
  }
  return children;
}
