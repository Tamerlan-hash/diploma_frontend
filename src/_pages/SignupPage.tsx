'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function SignupPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, email, password, carNumber, carModel);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      setError(err.message);
    }
  };

  return (
    <div className="grid justify-center items-center w-screen h-screen bg-amber-200">
      <form onSubmit={handleSubmit} className="grid bg-amber-100 text-black p-2 rounded-xl gap-3">
        <h1 className="font-bold">Регистрация</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="border border-amber-300 rounded-xl p-2"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
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
        <input
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value)}
          placeholder="Номер машины"
          required
          className="border border-amber-300 rounded-xl p-2"
        />
        <input
          value={carModel}
          onChange={(e) => setCarModel(e.target.value)}
          placeholder="Модель машины"
          required
          className="border border-amber-300 rounded-xl p-2"
        />
        <button
          type="submit"
          className="bg-amber-300 text-black p-2 rounded-xl cursor-pointer font-bold"
        >
          Зарегистрироваться
        </button>
        <a 
          href="/auth/login" 
          className="block text-center bg-amber-200 text-black p-2 rounded-xl cursor-pointer font-bold mt-2"
        >
          Войти
        </a>
      </form>
    </div>
  );
}
