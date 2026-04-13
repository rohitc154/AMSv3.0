import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterAdmin from './pages/RegisterAdmin';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import VerifyRegistrationOtp from './pages/VerifyRegistrationOtp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OrgAdminDashboard from './pages/OrgAdminDashboard';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-registration-otp" element={<VerifyRegistrationOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register-admin" element={<RegisterAdmin />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <PrivateRoute requiredRole="superAdmin">
                <SuperAdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/org-admin"
            element={
              <PrivateRoute requiredRole="admin">
                <OrgAdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <AttendancePage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
