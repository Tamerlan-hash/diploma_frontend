'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useEffect, useState } from 'react';

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
  reservation_id?: string; // Optional, if payment is for a reservation
  description?: string;
}

// Status messages for UI feedback
interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

export default function MyPaymentsPage() {
  const { user, authFetch } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  // Fetch payment methods and transactions when the component mounts
  const fetchPaymentData = () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // Fetch payment methods
    const fetchMethods = authFetch<PaymentMethod[]>('/api/payments/methods/');
    
    // Fetch payment transactions
    const fetchTransactions = authFetch<PaymentTransaction[]>('/api/payments/transactions/');

    // Wait for both requests to complete
    Promise.all([fetchMethods, fetchTransactions])
      .then(([methodsRes, transactionsRes]) => {
        setPaymentMethods(methodsRes.data);
        setTransactions(transactionsRes.data);
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response) {
          setError(e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`);
        } else {
          setError('Не удалось загрузить данные платежей');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPaymentData();
  }, [user, authFetch]);

  // Function to delete a payment method
  const deletePaymentMethod = async (id: string) => {
    if (!id) return;

    setDeletingId(id);
    setStatusMessage(null);

    try {
      await authFetch(`/api/payments/methods/${id}/`, {
        method: 'DELETE'
      });

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Способ оплаты успешно удален'
      });

      // Refresh payment data
      fetchPaymentData();
    } catch (e) {
      // Show error message
      if (axios.isAxiosError(e) && e.response) {
        setStatusMessage({
          type: 'error',
          text: e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Не удалось удалить способ оплаты'
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Function to set a payment method as default
  const setDefaultPaymentMethod = async (id: string) => {
    if (!id) return;

    setStatusMessage(null);

    try {
      await authFetch(`/api/payments/methods/${id}/set-default/`, {
        method: 'POST'
      });

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Способ оплаты по умолчанию обновлен'
      });

      // Refresh payment data
      fetchPaymentData();
    } catch (e) {
      // Show error message
      if (axios.isAxiosError(e) && e.response) {
        setStatusMessage({
          type: 'error',
          text: e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Не удалось обновить способ оплаты по умолчанию'
        });
      }
    }
  };

  // Filter transactions based on the selected filter
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

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

  // Get transaction status icon and color
  const getTransactionStatusInfo = (status: 'completed' | 'pending' | 'failed') => {
    switch (status) {
      case 'completed':
        return { icon: '✅', colorClass: 'bg-green-100 text-green-800' };
      case 'pending':
        return { icon: '⏳', colorClass: 'bg-yellow-100 text-yellow-800' };
      case 'failed':
        return { icon: '❌', colorClass: 'bg-red-100 text-red-800' };
      default:
        return { icon: '❓', colorClass: 'bg-gray-100 text-gray-800' };
    }
  };

  // Find payment method by ID
  const findPaymentMethod = (id: string) => {
    return paymentMethods.find(method => method.id === id);
  };

  if (loading) return <div className="p-4">Загрузка данных платежей...</div>;
  if (error) return <div className="p-4 text-red-500">Ошибка: {error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Мои платежи</h1>
        <a 
          href="/payments" 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <span>➕</span> Добавить способ оплаты
        </a>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div 
          className={`p-4 mb-4 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? '✅ ' : '❌ '}
          {statusMessage.text}
        </div>
      )}

      {/* Payment Methods Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Способы оплаты</h2>
        
        {paymentMethods.length === 0 ? (
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p>У вас нет сохраненных способов оплаты.</p>
            <a 
              href="/payments" 
              className="inline-block mt-2 text-blue-500 hover:text-blue-700"
            >
              Добавить способ оплаты
            </a>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {paymentMethods.map(method => (
              <div key={method.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{getCardTypeIcon(method.type)}</span>
                      <h3 className="font-medium">
                        {method.type === 'credit_card' ? 'Кредитная карта' : 'Дебетовая карта'}
                        {method.is_default && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            По умолчанию
                          </span>
                        )}
                      </h3>
                    </div>
                    <p className="text-gray-600">•••• •••• •••• {method.card_number}</p>
                    <p className="text-sm text-gray-500">
                      {method.cardholder_name} | Истекает: {method.expiry_date}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-end gap-2">
                  {!method.is_default && (
                    <button
                      onClick={() => setDefaultPaymentMethod(method.id)}
                      className="px-3 py-1.5 rounded text-white text-sm bg-blue-500 hover:bg-blue-600"
                    >
                      Сделать основной
                    </button>
                  )}
                  <button
                    onClick={() => deletePaymentMethod(method.id)}
                    disabled={deletingId === method.id}
                    className={`px-3 py-1.5 rounded text-white text-sm ${
                      deletingId === method.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {deletingId === method.id ? 'Удаление...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment Transactions Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">История платежей</h2>
          
          {/* Filter buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Все
            </button>
            <button 
              onClick={() => setFilter('completed')} 
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Завершенные
            </button>
            <button 
              onClick={() => setFilter('pending')} 
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === 'pending' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              В обработке
            </button>
            <button 
              onClick={() => setFilter('failed')} 
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === 'failed' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Неудачные
            </button>
          </div>
        </div>
        
        {transactions.length === 0 ? (
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <p>У вас нет истории платежей.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg mb-4">
            Нет платежей с выбранным статусом. Выберите другой фильтр.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map(transaction => {
              const statusInfo = getTransactionStatusInfo(transaction.status);
              const paymentMethod = findPaymentMethod(transaction.payment_method);
              
              return (
                <div key={transaction.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.colorClass}`}>
                          {statusInfo.icon} {transaction.status}
                        </span>
                        {transaction.reservation_id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Бронирование
                          </span>
                        )}
                      </div>
                      <p className="font-medium mt-1">{transaction.amount} ₸</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                      {transaction.description && (
                        <p className="text-sm mt-1">{transaction.description}</p>
                      )}
                    </div>
                    
                    {paymentMethod && (
                      <div className="text-right text-sm text-gray-600">
                        <p>{getCardTypeIcon(paymentMethod.type)} •••• {paymentMethod.card_number}</p>
                      </div>
                    )}
                  </div>
                  
                  {transaction.reservation_id && (
                    <div className="mt-2 text-right">
                      <a 
                        href={`/parking/my-reservations?highlight=${transaction.reservation_id}`}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        Просмотреть бронирование
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}