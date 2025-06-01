'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useState } from 'react';

const InfoHeader = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="flex flex-wrap items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-bold">SMART PARKING</h1>
        </Link>

        {/* Mobile menu button */}
        <button 
          className="md:hidden flex items-center px-3 py-2 border rounded text-gray-300 border-gray-400 hover:text-white hover:border-white"
          onClick={toggleMobileMenu}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:w-auto">
          <ul className="flex flex-wrap gap-4 md:gap-7">
            <li>
              <Link href="/map" className="text-white hover:text-gray-300">
                Карта парковок
              </Link>
            </li>
            <li>
              <Link href="/parking/my-reservations" className="text-white hover:text-gray-300">
                Мои бронирования
              </Link>
            </li>
            <li>
              <Link href="/tariffs" className="text-white hover:text-gray-300">
                Тарифы
              </Link>
            </li>
            <li>
              <Link href="/subscriptions" className="text-white hover:text-gray-300">
                Подписки
              </Link>
            </li>
            <li>
              <Link href="/payments" className="text-white hover:text-gray-300">
                Оплата
              </Link>
            </li>
            <li>
              <Link href="/contacts" className="text-white hover:text-gray-300">
                Контакты
              </Link>
            </li>
          </ul>
        </nav>

        {/* Auth Button - Desktop */}
        <div className="hidden md:block">
          {user ? (
            <Link href="/profile" className="flex items-center gap-2 text-white hover:text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Личный кабинет
            </Link>
          ) : (
            <Link
              className="bg-yellow-400 text-black px-4 py-2 rounded-3xl flex items-center gap-2 hover:bg-yellow-500"
              href="/auth/login"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Вход/Регистрация
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden mt-4`}>
        <nav className="flex flex-col space-y-3 pb-3 border-b border-gray-700">
          <Link href="/map" className="text-white hover:text-gray-300">
            Карта парковок
          </Link>
          <Link href="/parking/my-reservations" className="text-white hover:text-gray-300">
            Мои бронирования
          </Link>
          <Link href="/tariffs" className="text-white hover:text-gray-300">
            Тарифы
          </Link>
          <Link href="/subscriptions" className="text-white hover:text-gray-300">
            Подписки
          </Link>
          <Link href="/payments" className="text-white hover:text-gray-300">
            Оплата
          </Link>
          <Link href="/contacts" className="text-white hover:text-gray-300">
            Контакты
          </Link>
        </nav>

        {/* Auth Button - Mobile */}
        <div className="mt-4">
          {user ? (
            <Link href="/profile" className="flex items-center gap-2 text-white hover:text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Личный кабинет
            </Link>
          ) : (
            <Link
              className="bg-yellow-400 text-black px-4 py-2 rounded-3xl inline-flex items-center gap-2 hover:bg-yellow-500"
              href="/auth/login"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Вход/Регистрация
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

const MainHeader = () => {
  return <InfoHeader />;
};

export { InfoHeader, MainHeader };
