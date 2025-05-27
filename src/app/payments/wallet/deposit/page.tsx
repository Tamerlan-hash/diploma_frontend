'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Wallet interface
interface Wallet {
  id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

// Payment method interface
interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card';
  card_number: string; // Last 4 digits only for display
  expiry_date: string;
  cardholder_name: string;
  is_default: boolean;
}

// Status messages for UI feedback
interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

export default function WalletDepositPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  
  // State
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // Fetch wallet and payment methods when the component mounts
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
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response) {
          setError(e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`);
        } else {
          setError('Не удалось загрузить данные');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, authFetch]);

  // Handle amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Get card type icon
  const getCardTypeIcon = (type: 'credit_card' | 'debit_card') => {
    return type === 'credit_card' ? '💳' : '💰';
  };

  // Process deposit
  const processDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate payment method selection
    if (!selectedMethodId) {
      setStatusMessage({
        type: 'error',
        text: 'Выберите способ оплаты'
      });
      return;
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Введите корректную сумму'
      });
      return;
    }

    setProcessing(true);
    setStatusMessage(null);

    try {
      // Process deposit
      await authFetch('/api/payments/wallet/deposit/', {
        method: 'POST',
        data: {
          amount: depositAmount,
          payment_method_id: selectedMethodId,
          description: 'Пополнение кошелька'
        }
      });

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Кошелек успешно пополнен'
      });

      // Refresh wallet info
      const walletRes = await authFetch<Wallet>('/api/payments/wallet/info/');
      setWallet(walletRes.data);

      // Clear form
      setAmount('');

      // Redirect to wallet page after a short delay
      setTimeout(() => {
        router.push('/payments/my-payments');
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
          text: 'Не удалось пополнить кошелек'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-4">Загрузка...</div>;
  if (error) return <div className="p-4 text-red-500">Ошибка: {error}</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Пополнение кошелька</h1>
        <a 
          href="/payments/my-payments" 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <span>💰</span> Мой кошелек
        </a>
      </div>

      {/* Wallet info */}
      {wallet && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-semibold">Ваш кошелек</h2>
          </div>
          <p className="text-lg font-medium">Текущий баланс: {wallet.balance} ₸</p>
        </div>
      )}

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

      {/* Deposit form */}
      <form onSubmit={processDeposit} className="bg-white p-6 rounded-lg shadow-md">
        {/* Amount */}
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Сумма пополнения
          </label>
          <div className="relative">
            <input
              type="text"
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="absolute right-3 top-2 text-gray-500">₸</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-2">Выберите способ оплаты:</h3>
          
          {paymentMethods.length === 0 ? (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-4">
              У вас нет сохраненных способов оплаты. Добавьте способ оплаты, чтобы продолжить.
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <label 
                  key={method.id} 
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    selectedMethodId === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedMethodId === method.id}
                    onChange={() => setSelectedMethodId(method.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{getCardTypeIcon(method.type)}</span>
                      <span>
                        {method.type === 'credit_card' ? 'Кредитная карта' : 'Дебетовая карта'}
                        {method.is_default && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            По умолчанию
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-gray-600">•••• •••• •••• {method.card_number}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          
          <div className="mt-2">
            <a 
              href="/payments"
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + Добавить новый способ оплаты
            </a>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={processing || paymentMethods.length === 0}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            processing || paymentMethods.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {processing ? 'Обработка...' : 'Пополнить кошелек'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Информация</h2>
        <p className="text-sm text-gray-600">
          Пополнение кошелька позволяет вам использовать баланс для оплаты парковки без необходимости вводить данные карты каждый раз.
          Средства будут доступны для использования сразу после пополнения.
        </p>
      </div>
    </div>
  );
}