'use client';

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { decodeJwt } from 'jose';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  car_number?: string;
  car_model?: string;
  avatar_url?: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthReady: boolean; // ← флаг инициализации
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, car_number: string, car_model: string) => Promise<void>;
  updateProfile: (username: string, email: string, car_number: string, car_model: string, avatar?: File) => Promise<void>;
  logout: () => void;
  authFetch: <T = any>(url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const baseUrl = process.env.BACKEND_URL;

// Create axios instance with default configuration
const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const refreshTimeout = useRef<number | null>(null);

  const refreshTokens = async (): Promise<string> => {
    if (!refreshToken) throw new Error('No refresh token');
    try {
      const res = await api.post('/api/auth/refresh/', { refresh: refreshToken });
      const { access } = res.data;
      localStorage.setItem('accessToken', access);

      // Extract token expiration time
      const { exp } = decodeJwt(access) as { exp: number };
      const maxAge = Math.max(0, exp - Math.floor(Date.now() / 1000));

      // Set cookie with expiration matching the token
      document.cookie = `accessToken=${access}; path=/; max-age=${maxAge}; SameSite=Strict`;
      setAccessToken(access);
      scheduleRefresh(access);
      return access;
    } catch (error) {
      logout();
      throw new Error('Failed to refresh token');
    }
  };

  const scheduleRefresh = (token: string) => {
    try {
      const { exp } = decodeJwt(token) as { exp: number };
      const delay = exp * 1000 - Date.now() - 60_000;
      if (delay > 0) {
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        if (typeof window !== 'undefined') {
          refreshTimeout.current = window.setTimeout(async () => {
            try {
              await refreshTokens();
            } catch {
              // logout внутри
            }
          }, delay);
        }
      }
    } catch (err) {
      console.error('scheduleRefresh:', err);
    }
  };

  const authFetch = async <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<T>> => {
    // берём всегда свежий токен
    const token = localStorage.getItem('accessToken');

    // создаем конфигурацию с токеном авторизации, если он есть
    const requestConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    // функция для выполнения запроса
    const makeRequest = () => api.request<T>({
      url,
      ...requestConfig,
    });

    try {
      // первый запрос
      return await makeRequest();
    } catch (error) {
      // если 401 и есть refresh — обновляем и повторяем
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          try {
            const newAccess = await refreshTokens(); // внутри обновит localStorage и состояние
            // обновляем токен в заголовках
            requestConfig.headers = {
              ...requestConfig.headers,
              Authorization: `Bearer ${newAccess}`,
            };
            // повторяем запрос
            return await makeRequest();
          } catch {
            // при неудаче logout() уже вызван внутри refreshTokens
          }
        }
      }
      // если не 401 или не удалось обновить токен - пробрасываем ошибку дальше
      throw error;
    }
  };

  // --- Инициализация при монтировании ---
  useEffect(() => {
    const storedAccess = localStorage.getItem('accessToken');
    const storedRefresh = localStorage.getItem('refreshToken');

    const finishInit = () => setIsAuthReady(true);

    if (storedAccess && storedRefresh) {
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);

      try {
        // Extract token expiration times
        const { exp: accessExp } = decodeJwt(storedAccess) as { exp: number };
        const { exp: refreshExp } = decodeJwt(storedRefresh) as { exp: number };

        // Calculate max-age values in seconds
        const accessMaxAge = Math.max(0, accessExp - Math.floor(Date.now() / 1000));
        const refreshMaxAge = Math.max(0, refreshExp - Math.floor(Date.now() / 1000));

        // Set cookies for middleware authentication with expiration matching the tokens
        document.cookie = `accessToken=${storedAccess}; path=/; max-age=${accessMaxAge}; SameSite=Strict`;
        document.cookie = `refreshToken=${storedRefresh}; path=/; max-age=${refreshMaxAge}; SameSite=Strict`;
      } catch (err) {
        // If tokens are invalid, clear them
        console.error('Invalid tokens in localStorage:', err);
        logout();
        finishInit();
        return;
      }

      scheduleRefresh(storedAccess);

      authFetch<User>('/api/auth/me/')
        .then((res) => setUser(res.data))
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
    try {
      const res = await api.post('/api/auth/login/', { username, password });
      const { access, refresh } = res.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      // Extract token expiration times
      const { exp: accessExp } = decodeJwt(access) as { exp: number };
      const { exp: refreshExp } = decodeJwt(refresh) as { exp: number };

      // Calculate max-age values in seconds
      const accessMaxAge = Math.max(0, accessExp - Math.floor(Date.now() / 1000));
      const refreshMaxAge = Math.max(0, refreshExp - Math.floor(Date.now() / 1000));

      // Set cookies for middleware authentication with expiration matching the tokens
      document.cookie = `accessToken=${access}; path=/; max-age=${accessMaxAge}; SameSite=Strict`;
      document.cookie = `refreshToken=${refresh}; path=/; max-age=${refreshMaxAge}; SameSite=Strict`;

      setAccessToken(access);
      setRefreshToken(refresh);
      scheduleRefresh(access);

      const me = await authFetch<User>('/api/auth/me/');
      setUser(me.data);

      // Check if there's a redirect URL in the query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');

      // Redirect to the saved URL or home page
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push('/');
      }
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (username: string, email: string, password: string, car_number: string, car_model: string) => {
    try {
      await api.post('/api/auth/register/', { username, email, password, car_number, car_model });
      await login(username, password);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.detail || 'Registration error');
      }
      throw new Error('Registration error');
    }
  };

  const updateProfile = async (username: string, email: string, car_number: string, car_model: string, avatar?: File) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Use FormData to handle file uploads
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('car_number', car_number);
      formData.append('car_model', car_model);

      if (avatar) {
        formData.append('avatar', avatar);
      }

      const res = await authFetch<User>('/api/auth/profile/update/', {
        method: 'PATCH',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(res.data);
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.detail || 'Failed to update profile');
      }
      throw new Error('Failed to update profile');
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Clear cookies
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';

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
        updateProfile,
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
