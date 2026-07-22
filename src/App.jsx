import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import TenantMenu from "./pages/TenantMenu";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import SuperAdmin from "./pages/SuperAdmin";
import OwnerPanel from "./pages/OwnerPanel";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/menu/big-fat-burger" replace />} />
          <Route path="/menu/:slug" element={<TenantMenu />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/app/admin" element={<SuperAdmin />} />
          <Route path="/app/panel" element={<OwnerPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
