import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import FormPage from './pages/FormPage';
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard';
import DirectorPanel from './components/Director/DirectorPanel';

function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding:'2rem', color:'var(--color-text-secondary)' }}>A carregar...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <SuperAdminDashboard />;
  if (user.role === 'director_gpl') return <DirectorPanel />;
  return <FormPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRouter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
