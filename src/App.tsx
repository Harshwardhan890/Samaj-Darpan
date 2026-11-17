import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardPage from "@/pages/Dashboard";
import ProjectsPage from "@/pages/Projects";
import ProjectDetailPage from "@/pages/ProjectDetail";
import CityDashboardPage from "@/pages/CityDashboard";
import MapExplorerPage from "@/pages/MapExplorer";
import RepresentativesPage from "@/pages/Representatives";
import ContractorsPage from "@/pages/Contractors";
import ComplaintsPage from "@/pages/Complaints";
import AccountPage from "@/pages/Account";
import SourcesPage from "@/pages/Sources";
import MethodologyPage from "@/pages/Methodology";
import NotFoundPage from "@/pages/NotFound";
import LoginPage from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/Register";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword";
import ResetPasswordPage from "@/pages/auth/ResetPassword";
import VerifyEmailPage from "@/pages/auth/VerifyEmail";
import AdminOverviewPage from "@/pages/admin/AdminOverview";
import AdminProjectsPage from "@/pages/admin/AdminProjects";
import AdminImportPage from "@/pages/admin/AdminImport";
import AdminSourcesPage from "@/pages/admin/AdminSources";
import AdminUsersPage from "@/pages/admin/AdminUsers";
import AdminAuditPage from "@/pages/admin/AdminAudit";
import AdminGeoPage from "@/pages/admin/AdminGeo";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="india" element={<DashboardPage cityOverride={null} />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="cities/:state/:city" element={<CityDashboardPage />} />
        <Route path="map" element={<MapExplorerPage />} />
        <Route path="representatives" element={<RepresentativesPage />} />
        <Route path="contractors" element={<ContractorsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route
          path="account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="projects" element={<AdminProjectsPage />} />
          <Route path="import" element={<AdminImportPage />} />
          <Route path="sources" element={<AdminSourcesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="geo" element={<AdminGeoPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
