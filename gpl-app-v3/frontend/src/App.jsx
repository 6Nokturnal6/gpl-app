import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import FormPage from './pages/FormPage';
import AdminPanel from './components/Admin/AdminPanel';
import DirectorPanel from './components/Director/DirectorPanel';

function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding:'2rem', color:'var(--color-text-secondary)' }}>A carregar...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <AdminPanel />;
  if (user.role === 'director_gpl') return <DirectorPanel />;
  return <FormPage />;  // chefe_departamento + legacy roles
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/" element={<RoleRouter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
