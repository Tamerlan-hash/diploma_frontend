'use client';

import { decodeJwt } from 'jose';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const refreshTimeout = useRef<number | null>(null);

  // Функция обновления токена
  const refreshTokens = async (): Promise<string> => {
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch('http://localhost:8000/api/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) {
      logout();
      throw new Error('Failed to refresh token');
    }
    const data = await res.json();
    const newAccess = data.access;
    localStorage.setItem('accessToken', newAccess);
    setAccessToken(newAccess);
    scheduleRefresh(newAccess);
    return newAccess;
  };

  // Планирование авто-обновления перед истечением
  const scheduleRefresh = (token: string) => {
    try {
      const { exp } = decodeJwt(token) as { exp: number };
      const delay = exp * 1000 - Date.now() - 60_000; // за минуту до истечения
      if (delay > 0) {
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(async () => {
          try {
            await refreshTokens();
          } catch {
            // logout уже вызывается внутри refreshTokens
          }
        }, delay);
      }
    } catch (err) {
      console.error('Failed to schedule token refresh', err);
    }
  };

  // Обертка для fetch с авто-обновлением
  const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const token = accessToken;
    const makeRequest = (tok: string | null) => {
      const headers = {
        ...(init?.headers as Record<string, string>),
        Authorization: tok ? `Bearer ${tok}` : '',
      };
      return fetch(input, { ...init, headers });
    };

    let response = await makeRequest(token);
    if (response.status === 401 && refreshToken) {
      try {
        const newToken = await refreshTokens();
        response = await makeRequest(newToken);
      } catch {
        // logout() уже внутри
      }
    }
    return response;
  };

  // Загрузка токенов и user при монтировании
  useEffect(() => {
    const storedAccess = localStorage.getItem('accessToken');
    const storedRefresh = localStorage.getItem('refreshToken');
    if (storedAccess && storedRefresh) {
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      scheduleRefresh(storedAccess);
      authFetch('http://localhost:8000/api/auth/me/')
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setUser(data))
        .catch(() => logout());
    }
    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const { access, refresh } = await res.json();
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
    scheduleRefresh(access);
    const userRes = await authFetch('http://localhost:8000/api/auth/me/');
    const userData = await userRes.json();
    setUser(userData);
    router.push('/');
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch('http://localhost:8000/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error('Registration error');
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, refreshToken, login, register, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
