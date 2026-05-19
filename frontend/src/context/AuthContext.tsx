import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authAPI } from '../api';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateSettings: (settings: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme & display mode globally
  useEffect(() => {
    if (user?.settings) {
      applyGlobalSettings(user.settings);
    }
  }, [user]);

  // On mount: validate stored token by calling /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authAPI
      .getMe()
      .then((userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .catch(() => {
        // Token is invalid or expired – clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const { token, user: userData } = await authAPI.login(credentials);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success('Login successful!');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Login failed';
      toast.error(message);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const { token, user: userData } = await authAPI.register(data);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success('Registration successful!');
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Registration failed';
      toast.error(message);
      throw err;
    }
  };

  const updateSettings = async (settings: any) => {
    try {
      const updatedUser = await authAPI.updateSettings(settings);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err: any) {
      toast.error('Failed to update settings');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Global UI application logic
function applyGlobalSettings(settings: any) {
  const root = document.documentElement;

  // 1. Font Size
  const fontMap: Record<string, string> = { small: '13px', medium: '14px', large: '16px' };
  root.style.fontSize = fontMap[settings.font_size] || '14px';

  // 2. Theme (Simplified for logic)
  const themes: any = {
    blue: { primary: '#3b82f6', primaryDark: '#2563eb', primaryLight: '#eff6ff' },
    violet: { primary: '#7c3aed', primaryDark: '#6d28d9', primaryLight: '#f5f3ff' },
    emerald: { primary: '#059669', primaryDark: '#047857', primaryLight: '#ecfdf5' },
    rose: { primary: '#e11d48', primaryDark: '#be123c', primaryLight: '#fff1f2' },
    amber: { primary: '#d97706', primaryDark: '#b45309', primaryLight: '#fffbeb' },
    cyan: { primary: '#0891b2', primaryDark: '#0e7490', primaryLight: '#ecfeff' },
  };

  const theme = themes[settings.theme] || themes.blue;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-dark', theme.primaryDark);
  root.style.setProperty('--primary-light', theme.primaryLight);

  // 3. Display Mode
  if (settings.display_mode === 'dark') {
    root.style.setProperty('--bg', '#0f172a');
    root.style.setProperty('--surface', '#1e293b');
    root.style.setProperty('--border', '#334155');
    root.style.setProperty('--text', '#f1f5f9');
  } else if (settings.display_mode === 'high-contrast') {
    root.style.setProperty('--bg', '#000000');
    root.style.setProperty('--surface', '#111111');
    root.style.setProperty('--border', '#ffffff');
    root.style.setProperty('--text', '#ffffff');
  } else {
    root.style.setProperty('--bg', '#f8fafc');
    root.style.setProperty('--surface', '#ffffff');
    root.style.setProperty('--border', '#e2e8f0');
    root.style.setProperty('--text', '#1e293b');
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

