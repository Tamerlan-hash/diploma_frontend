'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function PaymentPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [cardType, setCardType] = useState<'credit_card' | 'debit_card'>('credit_card');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date (MM/YY)
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };

  // Handle card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCardNumber(e.target.value);
    setCardNumber(formattedValue);
  };

  // Handle expiry date input
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatExpiryDate(e.target.value);
    setExpiryDate(formattedValue);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setStatusMessage({
        type: 'error',
        text: 'Необходимо войти в систему для добавления способа оплаты'
      });
      return;
    }

    // Basic validation
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setStatusMessage({
        type: 'error',
        text: 'Номер карты должен содержать 16 цифр'
      });
      return;
    }

    if (expiryDate.length !== 5) {
      setStatusMessage({
        type: 'error',
        text: 'Введите корректную дату истечения срока действия (ММ/ГГ)'
      });
      return;
    }

    if (cvv.length !== 3) {
      setStatusMessage({
        type: 'error',
        text: 'CVV должен содержать 3 цифры'
      });
      return;
    }

    if (!cardholderName) {
      setStatusMessage({
        type: 'error',
        text: 'Введите имя владельца карты'
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      // Send payment method data to the server
      await authFetch('/api/payments/methods/', {
        method: 'POST',
        data: {
          type: cardType,
          card_number: cardNumber.replace(/\s/g, ''),
          expiry_date: expiryDate,
          cvv,
          cardholder_name: cardholderName,
          is_default: isDefault
        }
      });

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Способ оплаты успешно добавлен'
      });

      // Clear form
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardholderName('');
      setIsDefault(false);
      
      // Redirect to my-payments page after a short delay
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
          text: 'Не удалось добавить способ оплаты'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Добавить способ оплаты</h1>
        <a 
          href="/payments/my-payments" 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <span>💳</span> Мои способы оплаты
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

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
        {/* Card Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип карты</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="cardType"
                value="credit_card"
                checked={cardType === 'credit_card'}
                onChange={() => setCardType('credit_card')}
                className="mr-2"
              />
              Кредитная карта
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="cardType"
                value="debit_card"
                checked={cardType === 'debit_card'}
                onChange={() => setCardType('debit_card')}
                className="mr-2"
              />
              Дебетовая карта
            </label>
          </div>
        </div>

        {/* Card Number */}
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Номер карты
          </label>
          <input
            type="text"
            id="cardNumber"
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            maxLength={19} // 16 digits + 3 spaces
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Expiry Date and CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Срок действия
            </label>
            <input
              type="text"
              id="expiryDate"
              value={expiryDate}
              onChange={handleExpiryDateChange}
              placeholder="MM/YY"
              maxLength={5} // MM/YY format
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="password"
              id="cvv"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="123"
              maxLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Cardholder Name */}
        <div>
          <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
            Имя владельца карты
          </label>
          <input
            type="text"
            id="cardholderName"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="IVAN IVANOV"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Default Payment Method */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700">
            Использовать как способ оплаты по умолчанию
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? 'Добавление...' : 'Добавить способ оплаты'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Безопасность платежей</h2>
        <p className="text-sm text-gray-600">
          Все платежные данные передаются в зашифрованном виде и обрабатываются в соответствии с международными стандартами безопасности PCI DSS.
          Мы не храним полные данные вашей карты на наших серверах.
        </p>
      </div>
    </div>
  );
}