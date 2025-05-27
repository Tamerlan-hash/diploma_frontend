import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;

  // If there's no access token, redirect to login
  if (!accessToken) {
    // Get the current path to redirect back after login
    const currentPath = request.nextUrl.pathname;
    const loginUrl = new URL('/auth/login', request.url);

    // Add the redirect parameter if we're not already on the login page
    if (currentPath !== '/auth/login') {
      loginUrl.searchParams.set('redirect', currentPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  // Continue with the request if token exists
  return NextResponse.next();
}

export const config = { matcher: ['/map/:path*', '/profile/:path*', '/parking/:path*'] };
