'use client';

import { initializePushNotifications } from '@/utils/pushNotifications';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { decodeJwt } from 'jose';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    __isRedirecting?: boolean;
    __offlineNotified?: boolean;
  }
}

interface User {
  id: number;
  username: string;
  email: string;
  car_number?: string;
  car_model?: string;
  avatar_url?: string;
}

interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthReady: boolean; // ← флаг инициализации
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    car_number: string,
    car_model: string,
  ) => Promise<void>;
  updateProfile: (
    username: string,
    email: string,
    car_number: string,
    car_model: string,
    avatar?: File,
  ) => Promise<void>;
  logout: () => void;
  authFetch: <T = any>(url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In Docker environments, we should use the container name or service name instead of localhost
// This allows proper communication between containers in a Docker network
const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://smart-parking-api.yourbandy.com';

// Token management functions
const getTokens = (): Tokens | null => {
  const access = Cookies.get('accessToken');
  const refresh = Cookies.get('refreshToken');

  if (access && refresh) {
    return { access, refresh };
  }
  return null;
};

const setTokens = (tokens: Tokens) => {
  // Set cookies with appropriate expiry
  // Access token - 15 minutes
  Cookies.set('accessToken', tokens.access, {
    expires: 1 / 96, // 15 minutes in days
    path: '/',
    sameSite: 'lax',
  });

  // Refresh token - 7 days
  Cookies.set('refreshToken', tokens.refresh, {
    expires: 7,
    path: '/',
    sameSite: 'lax',
  });
};

const clearTokens = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
};

// Create axios instance with default configuration
const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
  timeoutErrorMessage: 'Request timed out. Please check your internet connection.',
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedRequestsQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

// Process the queue of failed requests
const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedRequestsQueue = [];
};

// Add request interceptor to include JWT token
api.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    if (tokens && tokens.access) {
      config.headers['Authorization'] = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor to handle token expiration and network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // Handle network errors (no response from server)
    if (axios.isAxiosError(error) && !error.response) {
      // Log specific network error code if available
      const networkError = error.code || error.message;
      console.error(`Network error detected: ${networkError}`);

      // Check if this request has already been retried for network errors
      if (originalRequest._networkRetryCount >= 3) {
        console.error('Network error after maximum retries:', error.message);
        // Show a user-friendly message for common network errors
        if (
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message.includes('Network Error') ||
          error.message.includes('timeout')
        ) {
          console.error('Connection to server lost. Please check your internet connection.');
        }
        return Promise.reject(error);
      }

      // Initialize or increment retry count
      originalRequest._networkRetryCount = (originalRequest._networkRetryCount || 0) + 1;

      // Exponential backoff with longer delays for serious connection issues
      const baseDelay = Math.pow(2, originalRequest._networkRetryCount - 1) * 1000;
      // Add some randomness to prevent all retries happening simultaneously
      const delay = baseDelay + Math.random() * 1000;

      console.log(
        `Network error: ${error.message}. Retrying in ${Math.round(delay)}ms... (${originalRequest._networkRetryCount}/3)`,
      );

      // Wait for the delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry the request
      return api(originalRequest);
    }

    // If error is not 401 or request has already been retried for auth, reject
    if (error.response?.status !== 401 || originalRequest._authRetry) {
      return Promise.reject(error);
    }

    // Mark request as retried for auth to prevent infinite loops
    originalRequest._authRetry = true;

    const tokens = getTokens();
    if (!tokens || !tokens.refresh) {
      // No refresh token available, redirect to login
      clearTokens();
      // Use a flag to prevent multiple redirects
      if (!window.__isRedirecting) {
        window.__isRedirecting = true;
        console.log('No refresh token available, redirecting to login page');
        // Use setTimeout to allow current execution to complete
        setTimeout(() => {
          window.location.href = '/auth/login';
          // Reset the flag after navigation starts
          setTimeout(() => {
            window.__isRedirecting = false;
          }, 1000);
        }, 0);
      }
      return Promise.reject(error);
    }

    // If already refreshing, add request to queue
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      // Attempt to refresh the token
      const response = await api.post('/api/auth/token/refresh/', {
        refresh: tokens.refresh,
      });

      const newAccessToken = response.data.access;
      // If the server returns a new refresh token (when ROTATE_REFRESH_TOKENS=True), use it
      const newRefreshToken = response.data.refresh || tokens.refresh;

      // Update tokens in cookies
      setTokens({
        access: newAccessToken,
        refresh: newRefreshToken,
      });

      // Update Authorization header for the original request
      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

      // Process any queued requests with the new token
      processQueue(null, newAccessToken);

      isRefreshing = false;

      // Retry the original request with the new token
      return api(originalRequest);
    } catch (refreshError) {
      // Check if it's a network error
      if (axios.isAxiosError(refreshError) && !refreshError.response) {
        // Network error - don't clear tokens, just reject this request
        console.error('Network error during token refresh:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;

        // Try to retry the token refresh after a delay
        if (!originalRequest._refreshRetryCount || originalRequest._refreshRetryCount < 2) {
          originalRequest._refreshRetryCount = (originalRequest._refreshRetryCount || 0) + 1;
          const delay = 2000 * originalRequest._refreshRetryCount;
          console.log(
            `Will retry token refresh in ${delay}ms... (${originalRequest._refreshRetryCount}/2)`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          isRefreshing = false;
          // Retry the original request, which will trigger another token refresh
          return api(originalRequest);
        }

        return Promise.reject(refreshError);
      }

      // Check if it's an invalid token error (401)
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        console.error('Invalid refresh token, logging out:', refreshError);
        // Token refresh failed due to invalid token, clear tokens and redirect to login
        processQueue(refreshError, null);
        clearTokens();
        // Use a flag to prevent multiple redirects
        if (!window.__isRedirecting) {
          window.__isRedirecting = true;
          console.log('Invalid refresh token, redirecting to login page');
          // Use setTimeout to allow current execution to complete
          setTimeout(() => {
            window.location.href = '/auth/login';
            // Reset the flag after navigation starts
            setTimeout(() => {
              window.__isRedirecting = false;
            }, 1000);
          }, 0);
        }
        isRefreshing = false;
        return Promise.reject(refreshError);
      }

      // Other errors - retry after a delay if it might be temporary
      if (
        axios.isAxiosError(refreshError) &&
        (refreshError.response?.status === 429 || // Too many requests
          refreshError.response?.status === 500 || // Server error
          refreshError.response?.status === 502 || // Bad gateway
          refreshError.response?.status === 503 || // Service unavailable
          refreshError.response?.status === 504)
      ) {
        // Gateway timeout
        console.error(
          'Temporary error during token refresh, will retry original request:',
          refreshError,
        );
        // For temporary errors, don't clear tokens, just reject this request
        processQueue(refreshError, null);
        isRefreshing = false;

        // Retry after a delay
        if (!originalRequest._refreshRetryCount || originalRequest._refreshRetryCount < 2) {
          originalRequest._refreshRetryCount = (originalRequest._refreshRetryCount || 0) + 1;
          const delay = 2000 * originalRequest._refreshRetryCount;
          console.log(
            `Will retry after temporary error in ${delay}ms... (${originalRequest._refreshRetryCount}/2)`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          isRefreshing = false;
          // Retry the original request
          return api(originalRequest);
        }

        return Promise.reject(refreshError);
      }

      // For all other errors, clear tokens and redirect to login
      console.error('Error during token refresh, logging out:', refreshError);
      processQueue(refreshError, null);
      clearTokens();
      // Use a flag to prevent multiple redirects
      if (!window.__isRedirecting) {
        window.__isRedirecting = true;
        console.log('Error during token refresh, redirecting to login page');
        // Use setTimeout to allow current execution to complete
        setTimeout(() => {
          window.location.href = '/auth/login';
          // Reset the flag after navigation starts
          setTimeout(() => {
            window.__isRedirecting = false;
          }, 1000);
        }, 0);
      }
      isRefreshing = false;
      return Promise.reject(refreshError);
    }
  },
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pushNotificationsInitialized, setPushNotificationsInitialized] = useState(false);

  // Add detection for DevTools opening which can cause network issues
  useEffect(() => {
    const handleDevToolsChange = () => {
      const isDevToolsOpen =
        window.outerWidth - window.innerWidth > 160 || // Detect by width difference
        window.outerHeight - window.innerHeight > 160; // Detect by height difference

      if (isDevToolsOpen) {
        console.log('DevTools detected as open. Network operations may be affected.');
        // Reduce network request frequency when DevTools is open
        api.defaults.timeout = 30000; // Increase timeout to 30 seconds
      } else {
        // Reset to normal timeout when DevTools is closed
        api.defaults.timeout = 15000; // Back to 15 seconds
      }
    };

    // Check on mount and on resize
    handleDevToolsChange();
    window.addEventListener('resize', handleDevToolsChange);

    return () => {
      window.removeEventListener('resize', handleDevToolsChange);
    };
  }, []);

  // Add network status detection
  useEffect(() => {
    // Function to handle online status changes
    const handleOnline = () => {
      console.log('Browser is online. Resuming normal operations.');
      // Reset any offline flags or states
      window.__isRedirecting = false;
    };

    // Function to handle offline status changes
    const handleOffline = () => {
      console.log('Browser is offline. Network operations will be affected.');
      // Show a user-friendly message
      if (typeof window !== 'undefined' && !window.__offlineNotified) {
        window.__offlineNotified = true;
        alert(
          'Your internet connection appears to be offline. Some features may not work properly until you reconnect.',
        );
        // Reset the notification flag after some time
        setTimeout(() => {
          window.__offlineNotified = false;
        }, 30000); // Only show the alert once every 30 seconds
      }
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to initialize push notifications
  const setupPushNotifications = async () => {
    if (!user || pushNotificationsInitialized) return;

    try {
      console.log('Initializing push notifications...');
      const tokens = getTokens();
      if (!tokens || !tokens.access) {
        console.log('No access token available, skipping push notification initialization');
        return;
      }

      const success = await initializePushNotifications(tokens.access);
      if (success) {
        console.log('Push notifications initialized successfully');
        setPushNotificationsInitialized(true);
      } else {
        console.log('Failed to initialize push notifications');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  // Initialize push notifications when user is set
  useEffect(() => {
    if (user) {
      if (!pushNotificationsInitialized) {
        setupPushNotifications();
      }
    }
  }, [user, pushNotificationsInitialized]);

  const authFetch = async <T = any,>(
    url: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> => {
    // Function to perform authenticated requests with JWT
    const maxRetries = 3;
    let retries = 0;

    // Track if this request is part of a page refresh
    const isPageRefresh =
      typeof window !== 'undefined' &&
      window.performance &&
      window.performance.navigation &&
      window.performance.navigation.type === 1;

    if (isPageRefresh) {
      console.log(`Request during page refresh: ${url}`);
    }

    const executeRequest = async (): Promise<AxiosResponse<T>> => {
      try {
        // The request interceptor will automatically add the token
        return await api.request<T>({
          url,
          ...config,
        });
      } catch (error) {
        // Check if it's a network error (no response from server)
        if (axios.isAxiosError(error) && !error.response) {
          // Network error like net::ERR_INTERNET_DISCONNECTED
          console.error(`Network error (attempt ${retries + 1}/${maxRetries}):`, error.message);

          // Special handling for page refresh requests
          if (isPageRefresh) {
            console.log(`Network error during page refresh. Will retry with increased delay.`);
            // Use longer delays for page refresh requests to allow network to stabilize
            const pageRefreshDelay = 2000; // Start with 2 seconds for page refreshes

            // If we haven't reached max retries, wait and try again
            if (retries < maxRetries) {
              retries++;
              // Exponential backoff with longer initial delay for page refreshes
              const delay = pageRefreshDelay * Math.pow(2, retries - 1);
              console.log(
                `Page refresh request: Retrying in ${delay}ms... (${retries}/${maxRetries})`,
              );

              // Wait for the delay
              await new Promise((resolve) => setTimeout(resolve, delay));

              // Try again
              return executeRequest();
            }
          } else {
            // Standard handling for non-page-refresh requests
            if (retries < maxRetries) {
              retries++;
              // Exponential backoff: 1s, 2s, 4s, etc.
              const delay = Math.pow(2, retries - 1) * 1000;
              console.log(`Retrying in ${delay}ms... (${retries}/${maxRetries})`);

              // Wait for the delay
              await new Promise((resolve) => setTimeout(resolve, delay));

              // Try again
              return executeRequest();
            }
          }

          // If we've exhausted retries, throw a user-friendly error
          if (error.message.includes('ERR_INTERNET_DISCONNECTED')) {
            throw new Error(
              `Internet connection lost. Please check your network connection and try again.`,
            );
          } else if (error.message.includes('timeout')) {
            throw new Error(`Request timed out. The server is taking too long to respond.`);
          } else {
            throw new Error(
              `Network connection error. Please check your internet connection and try again.`,
            );
          }
        }

        // The response interceptor will handle token refresh
        // This catch block is for errors that weren't handled by the interceptor
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // If we still get 401 after the interceptor tried to refresh,
          // it means authentication failed completely
          router.push('/auth/login');
        }

        // For all other errors, just rethrow
        throw error;
      }
    };

    return executeRequest();
  };

  // --- Инициализация при монтировании ---
  useEffect(() => {
    const initAuth = async () => {
      // Check if this is a page refresh
      const isPageRefresh =
        typeof window !== 'undefined' &&
        window.performance &&
        window.performance.navigation &&
        window.performance.navigation.type === 1;

      // Flag to track if we're still attempting initialization
      let isInitializing = true;
      // Maximum number of initialization attempts - more for page refreshes
      const maxInitAttempts = isPageRefresh ? 5 : 3;
      let initAttempt = 0;

      console.log(
        `Starting authentication initialization${isPageRefresh ? ' after page refresh' : ''}`,
      );

      // Function to attempt initialization with retry logic
      const attemptInitialization = async (): Promise<void> => {
        initAttempt++;
        console.log(
          `Authentication initialization attempt ${initAttempt}/${maxInitAttempts}${isPageRefresh ? ' (page refresh)' : ''}`,
        );

        try {
          // Check if we have tokens
          const tokens = getTokens();

          if (tokens) {
            try {
              // Check if access token is expired
              const isAccessTokenExpired = () => {
                try {
                  const { access } = tokens;
                  const decodedToken = decodeJwt(access);
                  const currentTime = Math.floor(Date.now() / 1000);
                  return decodedToken.exp ? decodedToken.exp < currentTime : true;
                } catch (e) {
                  console.error('Error decoding token:', e);
                  return true; // If we can't decode, assume it's expired
                }
              };

              // If access token is expired, try to refresh it before fetching user data
              if (isAccessTokenExpired()) {
                try {
                  console.log('Access token expired, refreshing...');

                  // For page refreshes, use a longer timeout for token refresh
                  const tokenRefreshConfig = isPageRefresh
                    ? { timeout: 20000 } // 20 seconds for page refreshes
                    : {};

                  const response = await api.post(
                    '/api/auth/token/refresh/',
                    {
                      refresh: tokens.refresh,
                    },
                    tokenRefreshConfig,
                  );

                  const newAccessToken = response.data.access;
                  const newRefreshToken = response.data.refresh || tokens.refresh;

                  // Update tokens in cookies
                  setTokens({
                    access: newAccessToken,
                    refresh: newRefreshToken,
                  });

                  console.log('Token refreshed successfully');
                } catch (refreshError) {
                  // Check if it's a network error
                  if (axios.isAxiosError(refreshError) && !refreshError.response) {
                    console.error('Network error during token refresh:', refreshError.message);

                    // For page refreshes, log more details
                    if (isPageRefresh) {
                      console.error(
                        'Network error during page refresh token refresh. This is common when the browser is still establishing connection.',
                      );
                    }

                    throw refreshError; // Rethrow to trigger retry
                  }

                  console.error('Error refreshing token during initialization:', refreshError);
                  // If refresh fails due to invalid token, clear tokens and continue without user
                  clearTokens();
                  return;
                }
              }

              // Now try to get user data with the valid token
              // For page refreshes, use a longer timeout
              const fetchConfig = isPageRefresh
                ? { timeout: 20000 } // 20 seconds for page refreshes
                : {};

              const res = await authFetch<User>('/api/auth/me/', fetchConfig);
              setUser(res.data);
              console.log('User authenticated successfully');
            } catch (error) {
              // Check if it's a network error
              if (axios.isAxiosError(error) && !error.response) {
                console.error('Network error during authentication initialization:', error.message);

                // For page refreshes, log more details
                if (isPageRefresh) {
                  console.error(
                    'Network error during page refresh authentication. Will retry with increased delay.',
                  );
                }

                throw error; // Rethrow to trigger retry
              }

              // If error is not handled by the interceptor, clear tokens
              if (axios.isAxiosError(error)) {
                console.error('Error fetching user data:', error.response?.status, error.message);
                if (error.response?.status === 401) {
                  clearTokens();
                }
              } else {
                console.error('Unknown error fetching user data:', error);
              }
            }
          }

          // If we reach here, initialization was successful (or we had no tokens)
          isInitializing = false;
        } catch (error) {
          // If we've reached max attempts, give up
          if (initAttempt >= maxInitAttempts) {
            console.error(
              `Failed to initialize authentication after maximum attempts (${maxInitAttempts})`,
            );
            isInitializing = false;
            return;
          }

          // Otherwise, wait and retry with longer delays for page refreshes
          const baseDelay = isPageRefresh ? 2000 : 1000; // 2 seconds base for page refreshes
          const delay = baseDelay * Math.pow(2, initAttempt - 1);
          console.log(`Retrying authentication initialization in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Try again recursively
          return attemptInitialization();
        }
      };

      // Start the initialization process
      // For page refreshes, add a small initial delay to allow network to stabilize
      if (isPageRefresh) {
        console.log('Page refresh detected, adding initial delay before authentication...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      attemptInitialization().finally(() => {
        // Mark initialization as complete regardless of outcome
        if (isInitializing) {
          console.log('Marking auth as ready after timeout');
        }
        setIsAuthReady(true);
      });
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Send authentication request to get JWT tokens
      const res = await api.post('/api/auth/login/', { username, password });

      // Extract tokens and user data from response
      const { refresh, access, user: userData } = res.data;

      // Store tokens in cookies
      setTokens({ refresh, access });

      // Set user data in state
      setUser(userData);

      // Initialize push notifications
      await setupPushNotifications();

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
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.detail || 'Invalid credentials');
      }
      throw new Error('Invalid credentials');
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    car_number: string,
    car_model: string,
  ) => {
    try {
      // Register the user
      await api.post('/api/auth/register/', { username, email, password, car_number, car_model });

      // Login with the new credentials to get JWT tokens
      await login(username, password);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.detail || 'Registration error');
      }
      throw new Error('Registration error');
    }
  };

  const updateProfile = async (
    username: string,
    email: string,
    car_number: string,
    car_model: string,
    avatar?: File,
  ) => {
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

      // Use authFetch which now handles JWT authentication
      const res = await authFetch<User>('/api/auth/profile/update/', {
        method: 'PATCH',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user state with the response data
      setUser(res.data);
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.detail || 'Failed to update profile');
      }
      throw new Error('Failed to update profile');
    }
  };

  const logout = async () => {
    try {
      // Get refresh token to blacklist it on the server
      const tokens = getTokens();

      if (tokens && tokens.refresh) {
        // Send logout request with refresh token to blacklist it
        await api.post('/api/auth/logout/', { refresh: tokens.refresh });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear tokens from cookies
      clearTokens();

      // Clear user state
      setUser(null);

      // Reset push notifications state
      setPushNotificationsInitialized(false);

      // Redirect to login page
      router.push('/auth/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
