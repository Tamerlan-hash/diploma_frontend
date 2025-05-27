'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useEffect, useState } from 'react';

// Extended Reservation interface with additional fields that might be returned from the API
interface Reservation {
  id?: string;
  parking_spot: string;
  start_time: string;
  end_time: string;
  status?: string;
  price?: number;
  spot_name?: string; // This might be included or we might need to fetch it separately
}

// Status messages for UI feedback
interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

export default function MyReservationsPage() {
  const { user, authFetch } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'cancelled'>('active');

  // Fetch reservations when the component mounts
  const fetchReservations = () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    authFetch<Reservation[]>('/api/parking/reservations/')
      .then((res) => {
        setReservations(res.data);
      })
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response) {
          setError(e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`);
        } else {
          setError('Не удалось загрузить бронирования');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReservations();
  }, [user, authFetch]);

  // Function to cancel a reservation
  const cancelReservation = async (id: string) => {
    if (!id) return;

    setCancellingId(id);
    setStatusMessage(null);

    try {
      await authFetch(`/api/parking/reservations/${id}/cancel/`, {
        method: 'POST'
      });

      // Show success message
      setStatusMessage({
        type: 'success',
        text: 'Бронирование успешно отменено'
      });

      // Refresh reservations list
      fetchReservations();
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
          text: 'Не удалось отменить бронирование'
        });
      }
    } finally {
      setCancellingId(null);
    }
  };

  // Filter reservations based on the selected filter
  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    return reservation.status === filter;
  });

  // Group reservations by date
  const groupedReservations = filteredReservations.reduce<Record<string, Reservation[]>>((groups, reservation) => {
    // Extract date part from start_time (YYYY-MM-DD)
    const date = reservation.start_time.split('T')[0];

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(reservation);
    return groups;
  }, {});

  // Sort dates and reservations within each date
  const sortedDates = Object.keys(groupedReservations).sort();

  // For each date, sort reservations by start_time
  sortedDates.forEach(date => {
    groupedReservations[date].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  });

  // Format date for display (e.g., "Monday, May 25, 2025")
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time for display (e.g., "14:30")
  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-4">Загрузка бронирований...</div>;
  if (error) return <div className="p-4 text-red-500">Ошибка: {error}</div>;
  if (reservations.length === 0) return <div className="p-4">У вас нет бронирований</div>;

  // Helper function to check if a reservation can be cancelled
  const canCancel = (reservation: Reservation) => {
    return reservation.status === 'pending' || reservation.status === 'active';
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
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setFilter('all')} 
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Все
        </button>
        <button 
          onClick={() => setFilter('active')} 
          className={`px-4 py-2 rounded-lg ${
            filter === 'active' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Активные
        </button>
        <button 
          onClick={() => setFilter('pending')} 
          className={`px-4 py-2 rounded-lg ${
            filter === 'pending' 
              ? 'bg-yellow-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Ожидающие
        </button>
        <button 
          onClick={() => setFilter('cancelled')} 
          className={`px-4 py-2 rounded-lg ${
            filter === 'cancelled' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Отмененные
        </button>
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

      {filteredReservations.length === 0 && (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg mb-4">
          Нет бронирований с выбранным статусом. Выберите другой фильтр.
        </div>
      )}

      {sortedDates.map(date => (
        <div key={date} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{formatDate(date)}</h2>

          <div className="space-y-4">
            {groupedReservations[date].map((reservation, index) => (
              <div key={reservation.id || index} className="reservation-item border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">Парковочное место: {reservation.spot_name || reservation.parking_spot}</h3>
                    <p>Время начала: {formatTime(reservation.start_time)}</p>
                    <p>Время окончания: {formatTime(reservation.end_time)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      reservation.status === 'active' ? 'bg-green-100 text-green-800' :
                      reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {reservation.status || 'pending'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  {reservation.price && (
                    <p className="text-gray-700">Цена: {reservation.price} ₸</p>
                  )}

                  {canCancel(reservation) && (
                    <button
                      onClick={() => reservation.id && cancelReservation(reservation.id)}
                      disabled={cancellingId === reservation.id}
                      className={`px-3 py-1.5 rounded text-white text-sm ${
                        cancellingId === reservation.id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {cancellingId === reservation.id ? 'Отмена...' : 'Отменить бронирование'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
