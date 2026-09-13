import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import CodesPage from "./pages/CodesPage";
import DailyCheckDetailPage from "./pages/DailyCheckDetailPage";
import DailyChecksPage from "./pages/DailyChecksPage";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import EquipmentListPage from "./pages/EquipmentListPage";
import FailureIncidentsPage from "./pages/FailureIncidentsPage";
import GroupsPage from "./pages/GroupsPage";
import LoginPage from "./pages/LoginPage";
import MenusPage from "./pages/MenusPage";
import PartReplacementsPage from "./pages/PartReplacementsPage";
import PermissionsPage from "./pages/PermissionsPage";
import SlaAvailabilityPage from "./pages/SlaAvailabilityPage";
import SlaMasterDataPage from "./pages/SlaMasterDataPage";
import SlaMonthlyStatusPage from "./pages/SlaMonthlyStatusPage";
import SlaOperationPage from "./pages/SlaOperationPage";
import SpecialChecksPage from "./pages/SpecialChecksPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import UsersPage from "./pages/UsersPage";
import WeeklyTasksPage from "./pages/WeeklyTasksPage";
import WorkStatusPage from "./pages/WorkStatusPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="app-shell">
                <Sidebar />
                <main className="app-main">
                  <div className="app">
                    <Routes>
                  <Route path="/" element={<EquipmentListPage />} />
                  <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
                  <Route path="/daily-checks" element={<DailyChecksPage />} />
                  <Route path="/daily-checks/:id" element={<DailyCheckDetailPage />} />
                  <Route path="/special-checks" element={<SpecialChecksPage />} />
                  <Route path="/weekly-tasks" element={<WeeklyTasksPage />} />
                  <Route path="/work-status" element={<WorkStatusPage />} />
                  <Route path="/part-replacements" element={<PartReplacementsPage />} />
                  <Route path="/support-tickets" element={<SupportTicketsPage />} />
                  <Route path="/failure-incidents" element={<FailureIncidentsPage />} />
                  <Route path="/sla/availability" element={<SlaAvailabilityPage />} />
                  <Route path="/sla/operations" element={<SlaOperationPage />} />
                  <Route path="/sla/monthly-status" element={<SlaMonthlyStatusPage />} />
                  <Route
                    path="/sla/master-data"
                    element={
                      <AdminRoute>
                        <SlaMasterDataPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <AdminRoute>
                        <UsersPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/groups"
                    element={
                      <AdminRoute>
                        <GroupsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/permissions"
                    element={
                      <AdminRoute>
                        <PermissionsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/menus"
                    element={
                      <AdminRoute>
                        <MenusPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/codes"
                    element={
                      <AdminRoute>
                        <CodesPage />
                      </AdminRoute>
                    }
                  />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
