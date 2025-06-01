'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TariffZone {
  id: number;
  name: string;
  description: string;
}

interface TariffRule {
  id: number;
  name: string;
  zone_name: string;
  parking_spot_name: string;
  time_period: string;
  day_type: string;
  price_per_hour: number;
}

interface UserSubscription {
  id: number;
  plan_details: {
    discount_percentage: number;
  };
}

const TariffsPage = () => {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<TariffZone[]>([]);
  const [rules, setRules] = useState<TariffRule[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch tariff zones
    const fetchZones = async () => {
      try {
        const response = await authFetch('/api/subscriptions/zones/');

        const data = response.data;
        setZones(data);

        // Select first zone by default
        if (data.length > 0) {
          setSelectedZone(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching tariff zones:', error);
        setError('Failed to load tariff zones. Please try again later.');
      }
    };

    // Fetch active subscription
    const fetchActiveSubscription = async () => {
      try {
        const response = await authFetch('/api/subscriptions/subscriptions/active/');

        if (response.status === 200) {
          const data = response.data;
          setActiveSubscription(data);
        }
      } catch (error) {
        console.error('Error fetching active subscription:', error);
      }
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchZones(), fetchActiveSubscription()]);
      setLoading(false);
    };

    fetchData();
  }, [authFetch, router]);

  // Fetch tariff rules when selected zone changes
  useEffect(() => {
    if (!selectedZone) return;

    const fetchRules = async () => {
      try {
        const response = await authFetch(`/api/subscriptions/rules/?zone_id=${selectedZone}`);

        const data = response.data;
        setRules(data);
      } catch (error) {
        console.error('Error fetching tariff rules:', error);
        setError('Failed to load tariff rules. Please try again later.');
      }
    };

    fetchRules();
  }, [selectedZone, authFetch]);

  const getTimePeriodDisplay = (timePeriod: string) => {
    switch (timePeriod) {
      case 'all_day':
        return 'Весь день';
      case 'morning':
        return 'Утро (6:00-12:00)';
      case 'afternoon':
        return 'День (12:00-18:00)';
      case 'evening':
        return 'Вечер (18:00-23:00)';
      case 'night':
        return 'Ночь (23:00-6:00)';
      case 'custom':
        return 'Пользовательский';
      default:
        return timePeriod;
    }
  };

  const getDayTypeDisplay = (dayType: string) => {
    switch (dayType) {
      case 'all':
        return 'Все дни';
      case 'weekday':
        return 'Будние дни';
      case 'weekend':
        return 'Выходные дни';
      case 'holiday':
        return 'Праздничные дни';
      case 'custom':
        return 'Пользовательские дни';
      default:
        return dayType;
    }
  };

  const calculateDiscountedPrice = (price: number) => {
    if (!activeSubscription) return price;

    const discountPercentage = activeSubscription.plan_details.discount_percentage;
    if (discountPercentage <= 0) return price;

    const discountAmount = price * (discountPercentage / 100);
    return price - discountAmount;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Тарифы на парковку</h1>

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

            {!activeSubscription && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">У вас нет активной подписки</p>
                  <p>Оформите подписку, чтобы получить скидку на парковку</p>
                </div>
                <Link
                  href="/subscriptions"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                  Оформить подписку
                </Link>
              </div>
            )}

            {activeSubscription && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-semibold">У вас активная подписка!</p>
                <p>
                  Вы получаете скидку {activeSubscription.plan_details.discount_percentage}% на все
                  тарифы
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Выберите зону</h2>

              {zones.length === 0 ? (
                <p>Нет доступных зон</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      className={`px-4 py-2 rounded-full ${
                        selectedZone === zone.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedZone && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold mb-4">Тарифы</h2>

                {rules.length === 0 ? (
                  <p>Нет доступных тарифов для выбранной зоны</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                          <th className="py-3 px-6 text-left">Название</th>
                          <th className="py-3 px-6 text-left">Время</th>
                          <th className="py-3 px-6 text-left">Дни</th>
                          <th className="py-3 px-6 text-right">Стандартная цена</th>
                          {activeSubscription && (
                            <th className="py-3 px-6 text-right">Цена со скидкой</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 text-sm">
                        {rules.map((rule) => (
                          <tr key={rule.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-6 text-left">
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-xs text-gray-500">
                                {rule.parking_spot_name || 'Все места'}
                              </div>
                            </td>
                            <td className="py-3 px-6 text-left">
                              {getTimePeriodDisplay(rule.time_period)}
                            </td>
                            <td className="py-3 px-6 text-left">
                              {getDayTypeDisplay(rule.day_type)}
                            </td>
                            <td className="py-3 px-6 text-right font-medium">
                              {rule.price_per_hour} ₸/час
                            </td>
                            {activeSubscription && (
                              <td className="py-3 px-6 text-right font-medium text-green-600">
                                {calculateDiscountedPrice(rule.price_per_hour).toFixed(2)} ₸/час
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TariffsPage;
