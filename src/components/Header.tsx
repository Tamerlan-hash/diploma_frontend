'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const InfoHeader = () => {
  const { accessToken } = useAuth();
  return (
    <header className="bg-gray-800 text-white p-4 grid grid-cols-3 items-center gap-3">
      <h1 className="text-2xl font-bold">Smart Parking</h1>
      <ul className="flex flex-wrap gap-7">
        <Link href="/">Main</Link>
        <Link href="/map">Map</Link>
        <Link href="/tariffs">Tariffs</Link>
        <Link href="/payments">Payment</Link>
        <Link href="/contacts">Contacts</Link>
      </ul>
      <div className="flex justify-end">
        {accessToken ? (
          <Link href="/profile">My Profile</Link>
        ) : (
          <Link className="bg-amber-300 text-black p-4 pt-2 pb-2 rounded-3xl" href="/auth/login">
            Login
          </Link>
        )}
      </div>
    </header>
  );
};

const MainHeader = () => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <h1 className="text-2xl font-bold">Main Header</h1>
    </header>
  );
};

export { InfoHeader, MainHeader };
