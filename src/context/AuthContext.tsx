// src/context/AuthContext.tsx
'use client';

import { decodeJwt } from 'jose';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthReady: boolean; // ← флаг инициализации
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const baseUrl = process.env.BACKEND_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const refreshTimeout = useRef<number | null>(null);

  const refreshTokens = async (): Promise<string> => {
    if (!refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${baseUrl}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) {
      logout();
      throw new Error('Failed to refresh token');
    }
    const { access } = await res.json();
    localStorage.setItem('accessToken', access);
    setAccessToken(access);
    scheduleRefresh(access);
    return access;
  };

  const scheduleRefresh = (token: string) => {
    try {
      const { exp } = decodeJwt(token) as { exp: number };
      const delay = exp * 1000 - Date.now() - 60_000;
      if (delay > 0) {
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        refreshTimeout.current = window.setTimeout(async () => {
          try {
            await refreshTokens();
          } catch {
            // logout внутри
          }
        }, delay);
      }
    } catch (err) {
      console.error('scheduleRefresh:', err);
    }
  };

  const authFetch = async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
    // берём всегда свежий токен
    const token = localStorage.getItem('accessToken');

    // составляем заголовки: JSON + переданные + Authorization, если есть токен
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init.headers as Record<string, string>)),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // внутренняя функция для запроса
    const makeRequest = () =>
      fetch(input, {
        ...init,
        headers,
        mode: 'cors',
        credentials: 'include',
      });

    // первый запрос
    let response = await makeRequest();

    // если 401 и есть refresh — обновляем и повторяем
    if (response.status === 401) {
      const refresh = localStorage.getItem('refreshToken');
      if (refresh) {
        try {
          const newAccess = await refreshTokens(); // внутри обновит localStorage и состояние
          // повторно берём новый токен
          headers.Authorization = `Bearer ${newAccess}`;
          response = await makeRequest();
        } catch {
          // при неудаче logout() уже вызван внутри refreshTokens
        }
      }
    }

    return response;
  };

  // --- Инициализация при монтировании ---
  useEffect(() => {
    const storedAccess = localStorage.getItem('accessToken');
    const storedRefresh = localStorage.getItem('refreshToken');

    const finishInit = () => setIsAuthReady(true);

    if (storedAccess && storedRefresh) {
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      scheduleRefresh(storedAccess);

      authFetch(`${baseUrl}/api/auth/me/`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setUser(data))
        .catch(() => logout())
        .finally(finishInit);
    } else {
      // нет токенов — сразу помечаем готовность
      finishInit();
    }

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      mode: 'cors',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const { access, refresh } = await res.json();
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
    scheduleRefresh(access);

    const me = await authFetch(`${baseUrl}/api/auth/me/`);
    const userData = await me.json();
    setUser(userData);
    router.push('/');
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch(`${baseUrl}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
      mode: 'cors',
      credentials: 'include',
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
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthReady,
        login,
        register,
        logout,
        authFetch,
      }}
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
