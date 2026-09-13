import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import AdminRoute from "./components/AdminRoute";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import EquipmentListPage from "./pages/EquipmentListPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Header />
              <div className="app">
                <Routes>
                  <Route path="/" element={<EquipmentListPage />} />
                  <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
                  <Route
                    path="/users"
                    element={
                      <AdminRoute>
                        <UsersPage />
                      </AdminRoute>
                    }
                  />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
