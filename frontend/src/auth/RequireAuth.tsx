import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "../api/auth";
import type { ReactNode } from "react";

export default function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
