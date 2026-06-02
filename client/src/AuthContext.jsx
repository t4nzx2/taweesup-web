import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { token, role: payload.role, name: payload.name, employee_id: payload.employee_id };
    } catch { return null; }
  });

  const login = (data) => {
    localStorage.setItem('token', data.token);
    setUser({ token: data.token, role: data.role, name: data.name, employee_id: data.employee_id });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
