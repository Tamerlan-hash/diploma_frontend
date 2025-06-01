'use client';

import { useEffect, useState } from 'react';

export function BackendUrlTest() {
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Get the NEXT_PUBLIC_BACKEND_URL from process.env
    const url = process.env.NEXT_PUBLIC_BACKEND_URL;
    setBackendUrl(url || 'Not defined');

    // Collect all available environment variables (only public ones will be visible)
    const availableEnvVars: Record<string, string> = {};
    for (const key in process.env) {
      if (process.env[key]) {
        availableEnvVars[key] = process.env[key] as string;
      }
    }
    setEnvVars(availableEnvVars);
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 my-4">
      <h2 className="text-xl font-bold mb-4">Backend URL Test</h2>
      <div className="mb-4">
        <p className="font-semibold">NEXT_PUBLIC_BACKEND_URL:</p>
        <pre className="bg-gray-100 p-2 rounded">{backendUrl}</pre>
      </div>
      <div>
        <p className="font-semibold">All available environment variables:</p>
        <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
    </div>
  );
}
