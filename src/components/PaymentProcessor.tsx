'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useState, useEffect } from 'react';

// Payment method interface
interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card';
  card_number: string; // Last 4 digits only for display
  expiry_date: string;
  cardholder_name: string;
  is_default: boolean;
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

interface PaymentProcessorProps {
  amount: number;
  reservationId: string;
  onSuccess: () => void;
  onCancel: () => void;
  description?: string;
}

export default function PaymentProcessor({
  amount,
  reservationId,
  onSuccess,
  onCancel,
  description = 'Оплата бронирования парковки'
}: PaymentProcessorProps) {
  const { user, authFetch } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // Fetch payment methods and wallet info when the component mounts
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // Fetch payment methods
    const fetchMethods = authFetch<PaymentMethod[]>('/api/payments/methods/');

    // Fetch wallet info
    const fetchWallet = authFetch<Wallet>('/api/payments/wallet/info/');

    // Wait for both requests to complete
    Promise.all([fetchMethods, fetchWallet])
      .then(([methodsRes, walletRes]) => {
        // Set payment methods
        setPaymentMethods(methodsRes.data);

        // Auto-select default payment method if available
        const defaultMethod = methodsRes.data.find(method => method.is_default);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (methodsRes.data.length > 0) {
          setSelectedMethodId(methodsRes.data[0].id);
        }

        // Set wallet info
        setWallet(walletRes.data);

        // If wallet has sufficient balance, default to using it
        if (walletRes.data && walletRes.data.balance >= amount) {
          setUseWallet(true);
          setSelectedMethodId(null);
        }
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
  }, [user, authFetch, amount]);

  // Process payment
  const processPayment = async () => {
    // Validate payment method selection
    if (!useWallet && !selectedMethodId) {
      setStatusMessage({
        type: 'error',
        text: 'Выберите способ оплаты'
      });
      return;
    }

    // Validate wallet balance if using wallet
    if (useWallet && wallet && wallet.balance < amount) {
      setStatusMessage({
        type: 'error',
        text: 'Недостаточно средств на кошельке'
      });
      return;
    }

    setProcessing(true);
    setStatusMessage(null);

    try {
      if (useWallet) {
        // Process payment using wallet
        await authFetch('/api/payments/wallet/pay/', {
          method: 'POST',
          data: {
            amount,
            reservation_id: reservationId,
            description
          }
        });
      } else {
        // Process payment using payment method
        await authFetch('/api/payments/process/', {
          method: 'POST',
          data: {
            amount,
            payment_method_id: selectedMethodId,
            reservation_id: reservationId,
            description
          }
        });
      }

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Платеж успешно обработан'
      });

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
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
          text: 'Не удалось обработать платеж'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Get card type icon
  const getCardTypeIcon = (type: 'credit_card' | 'debit_card') => {
    return type === 'credit_card' ? '💳' : '💰';
  };

  if (loading) return <div className="p-4 text-center">Загрузка способов оплаты...</div>;

  if (error) return (
    <div className="p-4">
      <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-lg">Ошибка: {error}</div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={onCancel}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-center font-medium"
        >
          Отмена
        </button>
        <a 
          href="/payments"
          className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-center font-medium"
        >
          Добавить способ оплаты
        </a>
      </div>
    </div>
  );

  if (paymentMethods.length === 0) return (
    <div className="p-4">
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-4">
        У вас нет сохраненных способов оплаты. Добавьте способ оплаты, чтобы продолжить.
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={onCancel}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-center font-medium"
        >
          Отмена
        </button>
        <a 
          href="/payments"
          className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-center font-medium"
        >
          Добавить способ оплаты
        </a>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Оплата</h2>

      {/* Status message */}
      {statusMessage && (
        <div 
          className={`p-3 md:p-4 mb-4 rounded-lg ${
            statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? '✅ ' : '❌ '}
          {statusMessage.text}
        </div>
      )}

      <div className="mb-4">
        <p className="text-base md:text-lg font-medium">Сумма к оплате: {amount} ₸</p>
        {description && <p className="text-sm md:text-base text-gray-600">{description}</p>}
      </div>

      <div className="mb-5">
        <h3 className="text-base font-medium mb-3">Выберите способ оплаты:</h3>

        {/* Wallet payment option */}
        {wallet && (
          <div className="mb-4">
            <label 
              className={`flex items-start md:items-center p-3 md:p-4 border rounded-lg cursor-pointer ${
                useWallet ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={useWallet}
                onChange={() => {
                  setUseWallet(true);
                  setSelectedMethodId(null);
                }}
                className="mr-3 mt-1 md:mt-0 h-5 w-5"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="font-medium">
                    Кошелек
                  </span>
                  <div className="w-full md:w-auto md:ml-2 mt-1 md:mt-0 flex flex-wrap gap-1">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Баланс: {wallet.balance} ₸
                    </span>
                    {wallet.balance < amount && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Недостаточно средств
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Оплата с баланса кошелька</p>
              </div>
            </label>

            {wallet.balance < amount && (
              <div className="mt-2 ml-6">
                <a 
                  href="/payments/wallet/deposit"
                  className="text-blue-500 hover:text-blue-700 text-sm inline-block py-1"
                >
                  + Пополнить кошелек
                </a>
              </div>
            )}
          </div>
        )}

        {/* Card payment options */}
        <div className="space-y-3">
          {paymentMethods.map(method => (
            <label 
              key={method.id} 
              className={`flex items-start md:items-center p-3 md:p-4 border rounded-lg cursor-pointer ${
                !useWallet && selectedMethodId === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={!useWallet && selectedMethodId === method.id}
                onChange={() => {
                  setUseWallet(false);
                  setSelectedMethodId(method.id);
                }}
                className="mr-3 mt-1 md:mt-0 h-5 w-5"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">{getCardTypeIcon(method.type)}</span>
                  <span className="font-medium">
                    {method.type === 'credit_card' ? 'Кредитная карта' : 'Дебетовая карта'}
                  </span>
                  {method.is_default && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      По умолчанию
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">•••• •••• •••• {method.card_number}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <a 
            href="/payments"
            className="text-blue-500 hover:text-blue-700 text-sm inline-block py-1"
          >
            + Добавить новый способ оплаты
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={onCancel}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
          disabled={processing}
        >
          Отмена
        </button>
        <button
          onClick={processPayment}
          disabled={(useWallet ? (wallet && wallet.balance < amount) : !selectedMethodId) || processing}
          className={`px-4 py-3 rounded-lg text-white font-medium ${
            (useWallet ? (wallet && wallet.balance < amount) : !selectedMethodId) || processing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {processing ? 'Обработка...' : 'Оплатить'}
        </button>
      </div>
    </div>
  );
}
