'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Reservation {
  id: number;
  parking_spot: {
    id: number;
    name: string;
    reference: string;
  };
  parking_spot_name: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  total_price: number;
  payment: {
    id: number;
    amount: number;
    status: string;
  };
  payment_method_type: 'card' | 'wallet';
  user_arrived: boolean;
  arrival_time: string | null;
  created_at: string;
  is_blocker_raised?: boolean;
  can_control_blocker?: boolean;
  is_occupied?: boolean;
}

export default function MyReservationsPage() {
  const { user, authFetch, isAuthReady } = useAuth();
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [blockerAction, setBlockerAction] = useState<string | null>(null);

  // Function to fetch reservations
  const fetchReservations = () => {
    if (!user) {
      return;
    }

    // Don't show loading indicator for refresh updates
    if (loading) {
      setLoading(true);
    }
    setError(null);

    // Build the URL with filter if not 'all'
    let url = '/api/parking/my-reservations/';
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }

    authFetch(url)
      .then(response => {
        setReservations(response.data);
      })
      .catch(error => {
        console.error('Error fetching reservations:', error);
        setError('Не удалось загрузить бронирования. Пожалуйста, попробуйте еще раз.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial fetch of reservations
  useEffect(() => {
    if (isAuthReady && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchReservations();
    }
  }, [isAuthReady, user, authFetch, router, statusFilter]);

  // Real-time updates for reservation statuses (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReservations();
    }, 5000);

    return () => clearInterval(interval);
  }, [statusFilter, user]);

  // Handle reservation cancellation
  const handleCancel = (reservationId: number) => {
    setActionLoading(reservationId);
    setActionError(null);
    setActionSuccess(null);
    setBlockerAction(null);

    authFetch(`/api/parking/reservations/${reservationId}/cancel/`, {
      method: 'POST'
    })
      .then(() => {
        // Update reservation status in the list
        setReservations(prevReservations => 
          prevReservations.map(res => 
            res.id === reservationId ? { ...res, status: 'cancelled' } : res
          )
        );
        setActionSuccess('Бронирование успешно отменено');
      })
      .catch(error => {
        console.error('Error cancelling reservation:', error);
        setActionError('Не удалось отменить бронирование');
      })
      .finally(() => {
        setActionLoading(null);
      });
  };

  // Handle raising the blocker
  const handleRaiseBlocker = (reservationId: number) => {
    setActionLoading(reservationId);
    setActionError(null);
    setActionSuccess(null);
    setBlockerAction('raise');

    authFetch(`/api/parking/reservations/${reservationId}/raise_blocker/`, {
      method: 'POST'
    })
      .then(() => {
        // Update blocker status in the list
        setReservations(prevReservations => 
          prevReservations.map(res => 
            res.id === reservationId ? { ...res, is_blocker_raised: true } : res
          )
        );
        setActionSuccess('Блокиратор успешно поднят');
      })
      .catch(error => {
        console.error('Error raising blocker:', error);
        setActionError('Не удалось поднять блокиратор');
      })
      .finally(() => {
        setActionLoading(null);
        setBlockerAction(null);
      });
  };

  // Handle lowering the blocker
  const handleLowerBlocker = (reservationId: number) => {
    setActionLoading(reservationId);
    setActionError(null);
    setActionSuccess(null);
    setBlockerAction('lower');

    authFetch(`/api/parking/reservations/${reservationId}/lower_blocker/`, {
      method: 'POST'
    })
      .then(() => {
        // Update blocker status in the list
        setReservations(prevReservations => 
          prevReservations.map(res => 
            res.id === reservationId ? { ...res, is_blocker_raised: false } : res
          )
        );
        setActionSuccess('Блокиратор успешно опущен');
      })
      .catch(error => {
        console.error('Error lowering blocker:', error);
        setActionError('Не удалось опустить блокиратор');
      })
      .finally(() => {
        setActionLoading(null);
        setBlockerAction(null);
      });
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указано';

    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Не указано';
    }

    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Ожидание', color: 'bg-yellow-100 text-yellow-800' };
      case 'active':
        return { text: 'Активно', color: 'bg-green-100 text-green-800' };
      case 'completed':
        return { text: 'Завершено', color: 'bg-blue-100 text-blue-800' };
      case 'cancelled':
        return { text: 'Отменено', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Get payment method display
  const getPaymentMethodDisplay = (type: string) => {
    switch (type) {
      case 'card':
        return 'Банковская карта';
      case 'wallet':
        return 'Кошелек';
      default:
        return type;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Мои бронирования</h1>
        <a
          href="/map"
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <span>🗺️</span> Вернуться к карте
        </a>
      </div>

      {/* Filter buttons */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Фильтр по статусу:</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Бронирования, ожидающие оплаты"
          >
            Ожидание
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title="Оплаченные бронирования, которые можно использовать"
          >
            Активные
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'completed'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Завершенные
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1 rounded-full text-sm ${
              statusFilter === 'cancelled'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Отмененные
          </button>
        </div>
      </div>

      {/* Status explanation */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-md font-semibold text-blue-800 mb-2">Статусы бронирований:</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li><span className="font-medium text-yellow-700">Ожидание</span> - бронирование создано, но ожидает оплаты. Место зарезервировано, но вы не можете управлять блокиратором.</li>
          <li><span className="font-medium text-green-700">Активно</span> - бронирование оплачено и активно. Вы можете управлять блокиратором и использовать парковочное место.</li>
          <li><span className="font-medium text-blue-700">Завершено</span> - срок бронирования истек.</li>
          <li><span className="font-medium text-red-700">Отменено</span> - бронирование было отменено.</li>
        </ul>
      </div>

      {actionSuccess && (
        <div className="bg-green-100 p-4 rounded-lg text-green-800 mb-4">
          <p>{actionSuccess}</p>
        </div>
      )}

      {actionError && (
        <div className="bg-red-100 p-4 rounded-lg text-red-800 mb-4">
          <p>{actionError}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-lg text-red-800">
          <p>{error}</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-gray-100 p-4 rounded-lg">
          <p>У вас пока нет бронирований.</p>
          <a 
            href="/map" 
            className="mt-2 inline-block text-blue-500 hover:text-blue-700"
          >
            Забронировать парковочное место
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map(reservation => {
            const status = getStatusDisplay(reservation.status);
            return (
              <div key={reservation.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {reservation.parking_spot_name || 'Парковочное место'}
                    </h2>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Начало:</p>
                    <p className="font-medium">{formatDate(reservation.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Окончание:</p>
                    <p className="font-medium">{formatDate(reservation.end_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Стоимость:</p>
                    <p className="font-medium">{reservation.total_price} ₸</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Способ оплаты:</p>
                    <p className="font-medium">{getPaymentMethodDisplay(reservation.payment_method_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Статус занятости:</p>
                    <p className={`font-medium ${reservation.is_occupied ? 'text-red-600' : 'text-green-600'}`}>
                      {reservation.is_occupied ? 'Занято' : 'Свободно'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Статус блокиратора:</p>
                    <p className={`font-medium ${reservation.is_blocker_raised ? 'text-green-600' : 'text-red-600'}`}>
                      {reservation.is_blocker_raised ? 'Поднят' : 'Опущен'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {/* Blocker control buttons - only show if user can control blocker */}
                  {reservation.can_control_blocker && (
                    <>
                      {reservation.is_blocker_raised ? (
                        <button
                          onClick={() => handleLowerBlocker(reservation.id)}
                          disabled={actionLoading === reservation.id}
                          className={`px-4 py-2 rounded text-white ${
                            actionLoading === reservation.id && blockerAction === 'lower'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {actionLoading === reservation.id && blockerAction === 'lower' 
                            ? 'Опускание...' 
                            : 'Опустить блокиратор'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRaiseBlocker(reservation.id)}
                          disabled={actionLoading === reservation.id}
                          className={`px-4 py-2 rounded text-white ${
                            actionLoading === reservation.id && blockerAction === 'raise'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {actionLoading === reservation.id && blockerAction === 'raise' 
                            ? 'Поднятие...' 
                            : 'Поднять блокиратор'}
                        </button>
                      )}
                    </>
                  )}

                  {/* Cancel button - only show for pending or active reservations */}
                  {(reservation.status === 'pending' || reservation.status === 'active') && (
                    <button
                      onClick={() => handleCancel(reservation.id)}
                      disabled={actionLoading === reservation.id}
                      className={`px-4 py-2 rounded text-white ${
                        actionLoading === reservation.id && blockerAction === null
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {actionLoading === reservation.id && blockerAction === null 
                        ? 'Отмена...' 
                        : 'Отменить бронирование'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
