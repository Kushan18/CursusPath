import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "./AppShell";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, isOnboarded } = useAuth();

  if (loading || isOnboarded === null) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  if (isOnboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell>{children}</AppShell>;
}
