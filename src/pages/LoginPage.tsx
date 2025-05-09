'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // @ts-ignore
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="grid justify-center items-center w-screen h-screen bg-amber-200">
      <form onSubmit={handleSubmit} className="grid bg-amber-100 text-black p-2 rounded-xl gap-3">
        <h1 className="font-bold">Sign in to Account</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="border border-amber-300 rounded-xl p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="border border-amber-300 rounded-xl p-2"
        />
        <button
          type="submit"
          className="bg-amber-300 text-black p-2 rounded-xl cursor-pointer font-bold"
        >
          Login
        </button>
      </form>
    </div>
  );
}
