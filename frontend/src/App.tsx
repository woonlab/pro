import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import EquipmentListPage from "./pages/EquipmentListPage";
import LoginPage from "./pages/LoginPage";

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
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
