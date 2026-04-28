import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./features/auth/LoginPage";
import { VerifyMfaPage } from "./features/auth/VerifyMfaPage";
import { SetupMfaPage } from "./features/auth/SetupMfaPage";
import { AcceptInvitationPage } from "./features/auth/AcceptInvitationPage";
import { MapPage } from "./features/map/MapPage";
import { BranchesPage } from "./features/admin/branches/BranchesPage";
import { UsersPage } from "./features/admin/users/UsersPage";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify-mfa" element={<VerifyMfaPage />} />
      <Route path="/invite/:token" element={<AcceptInvitationPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/auth/setup-mfa" element={<SetupMfaPage />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<MapPage />} />
          <Route path="admin/branches" element={<BranchesPage />} />
          <Route path="admin/users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
