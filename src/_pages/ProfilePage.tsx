'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

// Payment method interface
interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card';
  card_number: string; // Last 4 digits only for display
  expiry_date: string;
  cardholder_name: string;
  is_default: boolean;
}

// Payment transaction interface
interface PaymentTransaction {
  id: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  payment_method: string; // ID of the payment method used
  transaction_type?: 'card_payment' | 'wallet_deposit' | 'wallet_withdrawal' | 'wallet_payment' | 'wallet_refund'; // Type of transaction
  reservation_id?: string; // Optional, if payment is for a reservation
  description?: string;
}

// Wallet interface
interface Wallet {
  id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

// Status messages for UI feedback
interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

const ProfilePage = () => {
  const { user, updateProfile, authFetch } = useAuth();

  // Profile state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Settings state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [autoPaymentOpen, setAutoPaymentOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true
  });
  const [language, setLanguage] = useState('ru');
  const [autoPaymentMethod, setAutoPaymentMethod] = useState<string | null>(null);

  // Helper function to get full avatar URL
  const getFullAvatarUrl = (url: string) => {
    if (!url) return '';
    // If the URL is already absolute (starts with http:// or https://), return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Otherwise, prepend the backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    // Ensure there's no double slash between backendUrl and url
    return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Load user profile data
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setCarNumber(user.car_number || '');
      setCarModel(user.car_model || '');
      if (user.avatar_url) {
        setAvatarPreview(getFullAvatarUrl(user.avatar_url));
      }
    }
  }, [user]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);

      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch payment methods and transactions
  useEffect(() => {
    if (!user) return;

    setLoadingPayments(true);
    setPaymentError(null);

    // Fetch payment methods
    const fetchMethods = authFetch<PaymentMethod[]>('/api/payments/methods/');

    // Fetch payment transactions
    const fetchTransactions = authFetch<PaymentTransaction[]>('/api/payments/transactions/');

    // Fetch wallet info
    const fetchWallet = authFetch<Wallet>('/api/payments/wallet/info/');

    // Wait for all requests to complete
    Promise.all([fetchMethods, fetchTransactions, fetchWallet])
      .then(([methodsRes, transactionsRes, walletRes]) => {
        setPaymentMethods(methodsRes.data);
        setTransactions(transactionsRes.data);
        setWallet(walletRes.data);

        // Set auto payment method to default payment method if available
        const defaultMethod = methodsRes.data.find(method => method.is_default);
        if (defaultMethod) {
          setAutoPaymentMethod(defaultMethod.id);
        }
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response) {
          setPaymentError(e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`);
        } else {
          setPaymentError('Не удалось загрузить данные платежей');
        }
      })
      .finally(() => {
        setLoadingPayments(false);
      });
  }, [user, authFetch]);

  // Handle profile form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updateProfile(username, email, carNumber, carModel, avatar || undefined);
      setIsEditing(false);
      setSuccess('Профиль успешно обновлен');
      // Reset avatar state after successful update
      setAvatar(null);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      setError(err.message);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get card type icon
  const getCardTypeIcon = (type: 'credit_card' | 'debit_card') => {
    return type === 'credit_card' ? '💳' : '💰';
  };

  // Find payment method by ID
  const findPaymentMethod = (id: string) => {
    return paymentMethods.find(method => method.id === id);
  };

  // Toggle dropdown
  const toggleDropdown = (dropdown: string) => {
    switch (dropdown) {
      case 'notifications':
        setNotificationsOpen(!notificationsOpen);
        setLanguageOpen(false);
        setAutoPaymentOpen(false);
        break;
      case 'language':
        setLanguageOpen(!languageOpen);
        setNotificationsOpen(false);
        setAutoPaymentOpen(false);
        break;
      case 'autoPayment':
        setAutoPaymentOpen(!autoPaymentOpen);
        setNotificationsOpen(false);
        setLanguageOpen(false);
        break;
    }
  };

  // Handle notification change
  const handleNotificationChange = (type: 'email' | 'sms' | 'push') => {
    setNotifications({
      ...notifications,
      [type]: !notifications[type]
    });
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setLanguageOpen(false);
  };

  // Handle auto payment method change
  const handleAutoPaymentChange = (methodId: string) => {
    setAutoPaymentMethod(methodId);
    setAutoPaymentOpen(false);
  };

  if (!user) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">

      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto p-4">
          {/* Status messages */}
          {error && (
            <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-lg">
              ❌ {error}
            </div>
          )}
          {success && (
            <div className="p-4 mb-4 bg-green-100 text-green-800 rounded-lg">
              ✅ {success}
            </div>
          )}

          {/* Personal Information Block */}
          <section className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Личный кабинет</h2>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="w-full md:w-1/4 flex flex-col items-center mb-6 md:mb-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-3 overflow-hidden">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="User avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-2 mb-4 w-full px-4 md:px-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Изменить аватар:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-500"
                    />
                  </div>
                )}
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded-lg mt-2 w-full md:w-auto text-center"
                  >
                    Редактировать профиль
                  </button>
                )}
              </div>

              {/* User Info */}
              <div className="w-full md:w-3/4">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Имя пользователя:</label>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Номер машины:</label>
                      <input
                        value={carNumber}
                        onChange={(e) => setCarNumber(e.target.value)}
                        required
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Модель машины:</label>
                      <input
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        required
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        type="submit"
                        className="bg-yellow-400 hover:bg-yellow-500 text-black py-3 md:py-2 px-4 rounded-lg font-medium w-full sm:w-auto"
                      >
                        Сохранить
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-200 hover:bg-gray-300 text-black py-3 md:py-2 px-4 rounded-lg font-medium w-full sm:w-auto"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Имя пользователя</p>
                        <p className="font-medium">{user.username}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Номер машины</p>
                        <p className="font-medium">{user.car_number || 'Не указан'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Модель машины</p>
                        <p className="font-medium">{user.car_model || 'Не указана'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Тарифный план</p>
                        <p className="font-medium">Стандартный</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Payment History */}
          <section className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">История платежей</h2>

            {loadingPayments ? (
              <div className="p-4 text-center">Загрузка данных платежей...</div>
            ) : paymentError ? (
              <div className="p-4 text-red-500 bg-red-50 rounded-lg">Ошибка: {paymentError}</div>
            ) : transactions.length === 0 ? (
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <p>У вас нет истории платежей.</p>
                <Link href="/payments" className="inline-block mt-3 text-blue-500 hover:text-blue-700 font-medium py-2">
                  Добавить способ оплаты
                </Link>
              </div>
            ) : (
              <div>
                {/* Mobile view - card layout */}
                <div className="md:hidden space-y-4">
                  {transactions.slice(0, 5).map((transaction, index) => {
                    const paymentMethod = findPaymentMethod(transaction.payment_method);
                    return (
                      <div key={transaction.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{transaction.description || 'Парковка'}</div>
                            <div className="text-sm text-gray-600">{formatDate(transaction.created_at)}</div>
                          </div>
                          <div className="text-right font-bold">{transaction.amount} ₸</div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {transaction.reservation_id && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Бронирование
                            </span>
                          )}
                          {transaction.transaction_type && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.transaction_type === 'wallet_refund' 
                                ? 'bg-green-100 text-green-800' 
                                : transaction.transaction_type === 'wallet_payment'
                                ? 'bg-yellow-100 text-yellow-800'
                                : transaction.transaction_type === 'wallet_deposit'
                                ? 'bg-blue-100 text-blue-800'
                                : transaction.transaction_type === 'wallet_withdrawal'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.transaction_type === 'wallet_refund' && 'Возврат'}
                              {transaction.transaction_type === 'wallet_payment' && 'Оплата с кошелька'}
                              {transaction.transaction_type === 'wallet_deposit' && 'Пополнение'}
                              {transaction.transaction_type === 'wallet_withdrawal' && 'Вывод средств'}
                              {transaction.transaction_type === 'card_payment' && 'Оплата картой'}
                            </span>
                          )}
                        </div>

                        {paymentMethod && (
                          <div className="text-sm text-gray-600 mt-2 border-t border-gray-200 pt-2">
                            {getCardTypeIcon(paymentMethod.type)} •••• {paymentMethod.card_number}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="text-center mt-4">
                    <Link href="/payments/my-payments" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium">
                      Показать все платежи →
                    </Link>
                  </div>
                </div>

                {/* Desktop view - table layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-yellow-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Локация</th>
                        <th className="px-4 py-2 text-left">Дата и время</th>
                        <th className="px-4 py-2 text-left">Сумма</th>
                        <th className="px-4 py-2 text-left">Способ оплаты</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map((transaction, index) => {
                        const paymentMethod = findPaymentMethod(transaction.payment_method);
                        return (
                          <tr key={transaction.id} className="border-b border-gray-200">
                            <td className="px-4 py-3">
                              {transaction.description || 'Парковка'}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {transaction.reservation_id && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    Бронирование
                                  </span>
                                )}
                                {transaction.transaction_type && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    transaction.transaction_type === 'wallet_refund' 
                                      ? 'bg-green-100 text-green-800' 
                                      : transaction.transaction_type === 'wallet_payment'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : transaction.transaction_type === 'wallet_deposit'
                                      ? 'bg-blue-100 text-blue-800'
                                      : transaction.transaction_type === 'wallet_withdrawal'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transaction.transaction_type === 'wallet_refund' && 'Возврат'}
                                    {transaction.transaction_type === 'wallet_payment' && 'Оплата с кошелька'}
                                    {transaction.transaction_type === 'wallet_deposit' && 'Пополнение'}
                                    {transaction.transaction_type === 'wallet_withdrawal' && 'Вывод средств'}
                                    {transaction.transaction_type === 'card_payment' && 'Оплата картой'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">{formatDate(transaction.created_at)}</td>
                            <td className="px-4 py-3 font-medium">{transaction.amount} ₸</td>
                            <td className="px-4 py-3">
                              {paymentMethod && (
                                <span className="text-sm text-gray-600">
                                  {getCardTypeIcon(paymentMethod.type)} •••• {paymentMethod.card_number}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-yellow-400">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right">
                          <Link href="/payments/my-payments" className="text-black hover:underline font-medium">
                            Показать все платежи →
                          </Link>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Parking Payment */}
          <section className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Оплата парковки</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="order-2 md:order-1">
                <h3 className="text-lg font-semibold mb-3">Привязанные карты</h3>

                {loadingPayments ? (
                  <div className="p-4 text-center">Загрузка...</div>
                ) : paymentError ? (
                  <div className="p-4 text-red-500 bg-red-50 rounded-lg">Ошибка: {paymentError}</div>
                ) : paymentMethods.length === 0 ? (
                  <div className="bg-gray-100 p-4 rounded-lg text-center">
                    <p>У вас нет сохраненных способов оплаты.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map(method => (
                      <div key={method.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getCardTypeIcon(method.type)}</span>
                          <div className="flex-1">
                            <p className="font-medium">
                              •••• •••• •••• {method.card_number}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-sm text-gray-500">
                                {method.cardholder_name} | Истекает: {method.expiry_date}
                              </p>
                              {method.is_default && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  По умолчанию
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Link 
                    href="/payments" 
                    className="bg-yellow-400 hover:bg-yellow-500 text-black py-3 px-4 rounded-lg inline-block font-medium"
                  >
                    Добавить карту
                  </Link>
                </div>
              </div>

              {/* Balance */}
              <div className="order-1 md:order-2 mb-6 md:mb-0">
                <h3 className="text-lg font-semibold mb-3">Текущий баланс</h3>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                  {loadingPayments ? (
                    <p className="text-gray-500">Загрузка...</p>
                  ) : paymentError ? (
                    <p className="text-red-500 bg-red-50 p-2 rounded">Ошибка загрузки баланса</p>
                  ) : wallet ? (
                    <>
                      <p className="text-2xl md:text-3xl font-bold mb-2">{wallet.balance} ₸</p>
                      <p className="text-gray-500 mb-4">Доступно для оплаты парковки</p>

                      <Link href="/payments/wallet/deposit" className="bg-yellow-400 hover:bg-yellow-500 text-black py-3 px-6 rounded-lg inline-block font-medium w-full sm:w-auto">
                        Пополнить баланс
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl md:text-3xl font-bold mb-2">0 ₸</p>
                      <p className="text-gray-500 mb-4">Доступно для оплаты парковки</p>

                      <Link href="/payments/wallet/deposit" className="bg-yellow-400 hover:bg-yellow-500 text-black py-3 px-6 rounded-lg inline-block font-medium w-full sm:w-auto">
                        Пополнить баланс
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Настройки</h2>

            <div className="space-y-4">
              {/* Notifications */}
              <div className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <button 
                  className="w-full px-4 py-4 flex justify-between items-center"
                  onClick={() => toggleDropdown('notifications')}
                  aria-expanded={notificationsOpen}
                >
                  <span className="font-medium">Уведомления</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform ${notificationsOpen ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {notificationsOpen && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <label className="flex items-center py-1">
                        <input 
                          type="checkbox" 
                          checked={notifications.email} 
                          onChange={() => handleNotificationChange('email')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">Получать уведомления по email</span>
                      </label>
                      <label className="flex items-center py-1">
                        <input 
                          type="checkbox" 
                          checked={notifications.sms} 
                          onChange={() => handleNotificationChange('sms')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">Получать SMS-уведомления</span>
                      </label>
                      <label className="flex items-center py-1">
                        <input 
                          type="checkbox" 
                          checked={notifications.push} 
                          onChange={() => handleNotificationChange('push')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">Получать push-уведомления</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Language */}
              <div className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <button 
                  className="w-full px-4 py-4 flex justify-between items-center"
                  onClick={() => toggleDropdown('language')}
                  aria-expanded={languageOpen}
                >
                  <span className="font-medium">Язык интерфейса</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform ${languageOpen ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {languageOpen && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <label className="flex items-center py-1">
                        <input 
                          type="radio" 
                          name="language" 
                          checked={language === 'ru'} 
                          onChange={() => handleLanguageChange('ru')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">Русский</span>
                      </label>
                      <label className="flex items-center py-1">
                        <input 
                          type="radio" 
                          name="language" 
                          checked={language === 'en'} 
                          onChange={() => handleLanguageChange('en')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">English</span>
                      </label>
                      <label className="flex items-center py-1">
                        <input 
                          type="radio" 
                          name="language" 
                          checked={language === 'kz'} 
                          onChange={() => handleLanguageChange('kz')}
                          className="mr-3 h-5 w-5"
                        />
                        <span className="text-base">Қазақша</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Payment */}
              <div className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <button 
                  className="w-full px-4 py-4 flex justify-between items-center"
                  onClick={() => toggleDropdown('autoPayment')}
                  aria-expanded={autoPaymentOpen}
                >
                  <span className="font-medium">Привязка карты для автоматической оплаты</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform ${autoPaymentOpen ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {autoPaymentOpen && (
                  <div className="p-4 border-t border-gray-200">
                    {loadingPayments ? (
                      <div className="p-2 text-center">Загрузка...</div>
                    ) : paymentError ? (
                      <div className="p-3 text-red-500 bg-red-50 rounded-lg">Ошибка: {paymentError}</div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="p-3 text-center bg-gray-50 rounded-lg">
                        <p className="mb-2">У вас нет сохраненных способов оплаты.</p>
                        <Link href="/payments" className="text-blue-500 hover:text-blue-700 inline-block py-1">
                          Добавить способ оплаты
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentMethods.map(method => (
                          <label key={method.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <input 
                              type="radio" 
                              name="autoPayment" 
                              checked={autoPaymentMethod === method.id} 
                              onChange={() => handleAutoPaymentChange(method.id)}
                              className="mr-3 h-5 w-5"
                            />
                            <span className="text-xl mr-2">{getCardTypeIcon(method.type)}</span> 
                            <span className="text-base">•••• {method.card_number}</span>
                            {method.is_default && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                По умолчанию
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 md:p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center sm:text-left mb-6 sm:mb-0">
              <h3 className="text-lg font-semibold mb-3">SMART PARKING</h3>
              <p className="text-gray-300">Удобная система для бронирования и оплаты парковочных мест</p>
            </div>
            <div className="text-center sm:text-left mb-6 sm:mb-0">
              <h3 className="text-lg font-semibold mb-3">Контактная информация</h3>
              <p className="text-gray-300 py-1">Телефон: +7 (777) 123-45-67</p>
              <p className="text-gray-300 py-1">Email: info@smartparking.kz</p>
              <p className="text-gray-300 py-1">Адрес: г. Алматы, ул. Примерная, 123</p>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold mb-3">Полезные ссылки</h3>
              <ul className="space-y-2">
                <li><Link href="/map" className="text-gray-300 hover:text-white inline-block py-1">Карта парковок</Link></li>
                <li><Link href="/tariffs" className="text-gray-300 hover:text-white inline-block py-1">Тарифы</Link></li>
                <li><Link href="/contacts" className="text-gray-300 hover:text-white inline-block py-1">Контакты</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-700 text-center text-gray-400">
            <p>© 2025 Smart Parking. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProfilePage;
