import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

export type Role = 'patient' | 'doctor' | 'admin';

interface User {
  id: number;
  email: string;
  role: Role;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  sessionWarning: boolean;
  stayLoggedIn: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 60 * 1000; // 1 minute warning

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [sessionWarning, setSessionWarning] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeUser = useCallback((raw: any): User => ({
    ...raw,
    id: Number(raw?.id ?? raw?.user_id),
  }), []);

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then((res) => {
          setUser(normalizeUser(res.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, [token, normalizeUser]);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    const res = await api.auth.login(email, password, role);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(normalizeUser(userData));
  }, [normalizeUser]);

  const register = useCallback(async (data: any) => {
    await api.auth.register(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSessionWarning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
  }, []);

  // ===== Session Inactivity Timeout =====
  const resetTimers = useCallback(() => {
    if (!user) return;

    setSessionWarning(false);

    if (warningRef.current) clearTimeout(warningRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Show warning 1 minute before timeout
    warningRef.current = setTimeout(() => {
      setSessionWarning(true);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    // Auto-logout after full timeout
    timeoutRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [user, logout]);

  const stayLoggedIn = useCallback(() => {
    setSessionWarning(false);
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      if (!sessionWarning) {
        resetTimers();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));
    resetTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimers, sessionWarning]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoggedIn: !!user,
      loading,
      login,
      register,
      logout,
      sessionWarning,
      stayLoggedIn,
    }}>
      {children}
      {/* Session Warning Toast */}
      {sessionWarning && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-amber-500 text-white rounded-xl shadow-2xl px-5 py-4 max-w-sm animate-bounce">
          <div className="font-semibold text-sm mb-1">⚠️ Session Expiring Soon</div>
          <div className="text-xs opacity-90 mb-3">Your session will expire in less than 1 minute due to inactivity.</div>
          <button
            onClick={stayLoggedIn}
            className="px-4 py-1.5 bg-white text-amber-600 text-xs font-bold rounded-lg hover:bg-amber-50 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
