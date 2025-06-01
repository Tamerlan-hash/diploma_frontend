import { NextResponse } from 'next/server';

export async function GET() {
  // Get environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const nodeEnv = process.env.NODE_ENV;

  // Collect all environment variables that are prefixed with NEXT_PUBLIC_
  const publicEnvVars: Record<string, string> = {};
  for (const key in process.env) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      publicEnvVars[key] = process.env[key] as string;
    }
  }

  // Return the environment variables
  return NextResponse.json({
    backendUrl,
    nodeEnv,
    publicEnvVars,
    message: 'Environment variables test API route'
  });
}
