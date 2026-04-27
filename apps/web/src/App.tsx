import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./features/auth/LoginPage";
import { MapPage } from "./features/map/MapPage";
import { AppShell } from "./components/AppShell";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<MapPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
