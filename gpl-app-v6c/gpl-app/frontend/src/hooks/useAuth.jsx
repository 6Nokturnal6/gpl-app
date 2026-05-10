import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('gpl_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => sessionStorage.removeItem('gpl_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await authApi.login(email, password);
    sessionStorage.setItem('gpl_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (email, password, institution, nome) => {
    const r = await authApi.register(email, password, institution, nome);
    sessionStorage.setItem('gpl_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    sessionStorage.removeItem('gpl_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
