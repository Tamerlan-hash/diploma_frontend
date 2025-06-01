import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

// Helper to check if we've redirected too many times
const TOO_MANY_REDIRECTS_COOKIE = 'auth_redirect_count';
const MAX_REDIRECTS = 3; // Maximum number of redirects in a short period
const REDIRECT_WINDOW_MS = 60000; // 1 minute window for redirect counting

export async function middleware(request: NextRequest) {
  // Check for redirect loop
  const redirectCount = parseInt(request.cookies.get(TOO_MANY_REDIRECTS_COOKIE)?.value || '0');

  if (redirectCount >= MAX_REDIRECTS) {
    console.error('Too many authentication redirects detected. Allowing access to prevent loop.');
    // Clear the redirect counter after some time
    const response = NextResponse.next();
    response.cookies.set(TOO_MANY_REDIRECTS_COOKIE, '0', { 
      maxAge: 0, // Clear the cookie
      path: '/' 
    });
    return response;
  }

  // Check for JWT token in cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // If no access token, redirect to login
  if (!accessToken) {
    // Get current path for redirect after login
    const currentPath = request.nextUrl.pathname;
    const loginUrl = new URL('/auth/login', request.url);

    // Add redirect parameter if not already on login page
    if (currentPath !== '/auth/login') {
      loginUrl.searchParams.set('redirect', currentPath);
    }

    // Increment redirect counter
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(TOO_MANY_REDIRECTS_COOKIE, (redirectCount + 1).toString(), { 
      maxAge: REDIRECT_WINDOW_MS / 1000, // Convert to seconds
      path: '/' 
    });
    return response;
  }

  // Check if token is expired
  const isTokenExpired = () => {
    try {
      const decodedToken = decodeJwt(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp ? decodedToken.exp < currentTime : true;
    } catch (e) {
      console.error('Error decoding token in middleware:', e);
      return true; // If we can't decode, assume it's expired
    }
  };

  // If token is expired but we have a refresh token, let the client handle refresh
  if (isTokenExpired()) {
    if (!refreshToken) {
      // No refresh token, redirect to login
      const loginUrl = new URL('/auth/login', request.url);

      // Increment redirect counter
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set(TOO_MANY_REDIRECTS_COOKIE, (redirectCount + 1).toString(), { 
        maxAge: REDIRECT_WINDOW_MS / 1000, // Convert to seconds
        path: '/' 
      });
      return response;
    }

    // We have a refresh token, let the client-side code handle the refresh
    // The AuthContext will handle token refresh when the page loads
    // This prevents unnecessary redirects when tokens can be refreshed
  }

  // Reset redirect counter on successful validation
  const response = NextResponse.next();
  if (redirectCount > 0) {
    response.cookies.set(TOO_MANY_REDIRECTS_COOKIE, '0', { 
      maxAge: REDIRECT_WINDOW_MS / 1000,
      path: '/' 
    });
  }
  return response;
}

export const config = { matcher: ['/map/:path*', '/profile/:path*', '/parking/:path*'] };
