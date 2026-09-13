import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p>확인 중...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
