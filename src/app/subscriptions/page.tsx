'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  discount_percentage: number;
}

interface UserSubscription {
  id: number;
  plan_details: SubscriptionPlan;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
}

interface PaymentMethod {
  id: string;
  type: string;
  card_number: string;
  expiry_date: string;
  cardholder_name: string;
  is_default: boolean;
}

const SubscriptionsPage = () => {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }

    // Fetch subscription plans
    const fetchPlans = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/subscriptions/plans/', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subscription plans');
        }

        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        setError('Failed to load subscription plans. Please try again later.');
      }
    };

    // Fetch active subscription
    const fetchActiveSubscription = async () => {
      try {
        const response = await fetch(
          'http://localhost:8000/api/subscriptions/subscriptions/active/',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setActiveSubscription(data);
        }
      } catch (error) {
        console.error('Error fetching active subscription:', error);
      }
    };

    // Fetch payment methods
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/payments/methods/', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch payment methods');
        }

        const data = await response.json();
        setPaymentMethods(data);

        // Set default payment method if available
        const defaultMethod = data.find((method: PaymentMethod) => method.is_default);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod.id);
        } else if (data.length > 0) {
          setSelectedPaymentMethod(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchActiveSubscription(), fetchPaymentMethods()]);
      setLoading(false);
    };

    fetchData();
  }, [accessToken, router]);

  const handlePurchase = async () => {
    if (!selectedPlan || !selectedPaymentMethod) {
      setError('Please select a plan and payment method');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        'http://localhost:8000/api/subscriptions/purchase-subscription/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan_id: selectedPlan,
            payment_method_id: parseInt(selectedPaymentMethod, 10),
            auto_renew: autoRenew,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase subscription');
      }

      const data = await response.json();
      setActiveSubscription(data);
      setSuccessMessage('Subscription purchased successfully!');

      // Reset selection
      setSelectedPlan(null);
      setAutoRenew(false);
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      setError(error.message || 'Failed to purchase subscription. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSubscription) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/subscriptions/subscriptions/${activeSubscription.id}/cancel/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      setSuccessMessage('Subscription cancelled successfully!');
      setActiveSubscription(null);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Управление подпиской</h1>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}

            {activeSubscription ? (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-2xl font-semibold mb-4">Ваша активная подписка</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">План:</p>
                    <p className="font-semibold">{activeSubscription.plan_details.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Статус:</p>
                    <p className="font-semibold">
                      {activeSubscription.status === 'active'
                        ? 'Активна'
                        : activeSubscription.status === 'expired'
                          ? 'Истекла'
                          : 'Отменена'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Дата начала:</p>
                    <p className="font-semibold">{formatDate(activeSubscription.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Дата окончания:</p>
                    <p className="font-semibold">{formatDate(activeSubscription.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Автопродление:</p>
                    <p className="font-semibold">
                      {activeSubscription.auto_renew ? 'Включено' : 'Выключено'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Скидка на парковку:</p>
                    <p className="font-semibold">
                      {activeSubscription.plan_details.discount_percentage}%
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleCancel}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
                    disabled={loading}
                  >
                    Отменить подписку
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Выберите план подписки</h2>

                  {plans.length === 0 ? (
                    <p>Нет доступных планов подписки</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedPlan === plan.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                          <p className="text-gray-600 mb-4">{plan.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold">{plan.price} ₸</span>
                            <span className="text-gray-500">{plan.duration_days} дней</span>
                          </div>
                          <div className="mt-2 text-green-600 font-semibold">
                            Скидка на парковку: {plan.discount_percentage}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPlan && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Способ оплаты</h2>

                    {paymentMethods.length === 0 ? (
                      <div>
                        <p className="mb-4">У вас нет сохраненных способов оплаты.</p>
                        <button
                          onClick={() => router.push('/payments')}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                        >
                          Добавить способ оплаты
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <label className="block text-gray-700 mb-2">
                            Выберите способ оплаты:
                          </label>
                          <select
                            value={selectedPaymentMethod}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                          >
                            {paymentMethods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.type === 'credit_card'
                                  ? 'Кредитная карта'
                                  : 'Дебетовая карта'}{' '}
                                •••• {method.card_number ? method.card_number.slice(-4) : 'XXXX'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mb-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={autoRenew}
                              onChange={(e) => setAutoRenew(e.target.checked)}
                              className="mr-2"
                            />
                            <span>Автоматически продлевать подписку</span>
                          </label>
                        </div>

                        <button
                          onClick={handlePurchase}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                          disabled={loading || !selectedPaymentMethod}
                        >
                          Оформить подписку
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Преимущества подписки</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Поиск и фильтрация свободных парковочных мест по геолокации, времени и
                  дополнительным параметрам
                </li>
                <li>Получение персональных рекомендаций по наиболее удобным парковкам</li>
                <li>Доступ к скидкам на тарифы</li>
                <li>Просмотр истории бронирований и аналитики по использованию парковки</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;
