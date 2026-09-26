import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
