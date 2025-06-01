'use client';

import { BackendUrlTest } from '@/components/BackendUrlTest';
import { useEffect, useState } from 'react';

export default function TestEnvPage() {
  const [apiEnvVars, setApiEnvVars] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch environment variables from the API route
    fetch('/api/test-env')
      .then(res => res.json())
      .then(data => {
        setApiEnvVars(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching environment variables:', err);
        setError('Failed to fetch environment variables from API');
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Test Page</h1>
      <p className="mb-4">
        This page tests if the frontend can access environment variables, particularly NEXT_PUBLIC_BACKEND_URL.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-4">Client-Side Environment Variables</h2>
      <BackendUrlTest />

      <h2 className="text-xl font-bold mt-6 mb-4">Server-Side Environment Variables (from API)</h2>
      {loading ? (
        <p>Loading server-side environment variables...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>
      ) : (
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="mb-4">
            <p className="font-semibold">NEXT_PUBLIC_BACKEND_URL:</p>
            <pre className="bg-gray-100 p-2 rounded">{apiEnvVars.backendUrl || 'Not defined'}</pre>
          </div>
          <div className="mb-4">
            <p className="font-semibold">NODE_ENV:</p>
            <pre className="bg-gray-100 p-2 rounded">{apiEnvVars.nodeEnv || 'Not defined'}</pre>
          </div>
          <div>
            <p className="font-semibold">Public Environment Variables:</p>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(apiEnvVars.publicEnvVars || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
