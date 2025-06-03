'use client';

import { useAuth } from '@/context/AuthContext';
import type { LatLngBoundsExpression, LatLngExpression, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import { Modal } from './Modal';

interface ParkingSpot {
  id: number;
  reference: string;
  name: string;
  is_lock: boolean;
  is_occupied: boolean;
  is_blocker_raised: boolean;
  latitude1: number;
  latitude2: number;
  latitude3: number;
  latitude4: number;
  longitude1: number;
  longitude2: number;
  longitude3: number;
  longitude4: number;
  sensor?: {
    reference: string;
    is_occupied: boolean;
  };
  blocker?: {
    reference: string;
    is_raised: boolean;
  };
}

interface ReservationFormData {
  startTime: string;
  endTime: string;
  paymentMethod: string;
  selectedHours: { start: string; end: string }[];
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  status: 'available' | 'blocked';
  reason?: string;
}

const FreeSpotsCluster: React.FC<{
  spots: ParkingSpot[];
  center: LatLngExpression;
  zoomThreshold: number;
}> = ({ spots, center, zoomThreshold }) => {
  const map = useMap();
  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [show, setShow] = useState(map.getZoom() < zoomThreshold);

  useEffect(() => {
    import('leaflet').then((mod) => setL(mod));
  }, []);

  useEffect(() => {
    const onZoom = () => setShow(map.getZoom() < zoomThreshold);
    map.on('zoomend', onZoom);
    return () => void map.off('zoomend', onZoom);
  }, [map, zoomThreshold]);

  if (!L || !show) return null;

  const freeCount = spots.filter((s) => !s.is_lock).length;
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      background:rgba(0,128,0,0.8);width:30px;height:30px;
      border-radius:50%;color:#fff;font-weight:bold;font-size:14px;
      box-shadow:0 0 3px rgba(0,0,0,0.6);
    ">${freeCount}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const handleClick = () => map.setView(center, zoomThreshold + 2);

  return (
    <Marker position={center} icon={icon} eventHandlers={{ click: handleClick }}>
      <Popup>
        Свободных мест: {freeCount}.<br />
        Клик — приближение.
      </Popup>
    </Marker>
  );
};

export function MapClient() {
  const { user, authFetch, isAuthReady } = useAuth();
  const router = useRouter();

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get current time in Almaty timezone (UTC+6)
  const getAlmatyTime = () => {
    const now = new Date();
    // Create a date string with the UTC+6 timezone offset
    const almatyTimeStr = new Date(now.getTime() + (6 * 60 * 60 * 1000)).toISOString();
    return new Date(almatyTimeStr);
  };

  // Reservation state
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState<ReservationFormData>({
    startTime: '',
    endTime: '',
    paymentMethod: '',
    selectedHours: []
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotLoading, setTimeSlotLoading] = useState(false);
  const [timeSlotError, setTimeSlotError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const center: LatLngExpression = [43.23517, 76.90991];
  const bounds: LatLngBoundsExpression = [
    [43.1, 76.72],
    [43.38, 77.15],
  ];
  const zoomThreshold = 15;

  // Если неавторизован — редирект, но только после инициализации аутентификации
  useEffect(() => {
    if (isAuthReady && !user) router.push('/auth/login');
  }, [isAuthReady, user, router]);

  // Загрузка данных о парковке
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch parking spots
    authFetch<ParkingSpot[]>('/api/sensor/')
      .then((spotsRes) => {
        setSpots(spotsRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authFetch]);

  // Fetch payment methods and available time slots when modal opens
  useEffect(() => {
    if (selectedSpot && showReservationModal) {
      // Set default start and end times (1 hour in future for start time, 2 hours in future for end time)
      const now = getAlmatyTime(); // Use Almaty timezone
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Format dates for datetime-local input
      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
      };

      // Format date for API request (YYYY-MM-DD)
      const formatDateForApi = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // Set today's date as default selected date
      const today = formatDateForApi(now);
      setSelectedDate(today);

      // Reset the form when the modal opens
      if (!reservationForm.startTime) {
        setReservationForm({
          startTime: formatDate(oneHourLater),
          endTime: formatDate(twoHoursLater),
          paymentMethod: '',
          selectedHours: []
        });
      }

      // Fetch payment methods
      authFetch('/api/payments/methods/')
        .then(response => {
          setPaymentMethods(response.data);
        })
        .catch(error => {
          console.error('Error fetching payment methods:', error);
        });

      // Fetch available time slots for today
      fetchAvailableTimeSlots(selectedSpot.reference, today);
    }
  }, [selectedSpot, showReservationModal, authFetch]);

  // Fetch available time slots when selected date changes
  useEffect(() => {
    if (selectedSpot && selectedDate) {
      fetchAvailableTimeSlots(selectedSpot.reference, selectedDate);
    }
  }, [selectedDate, selectedSpot]);

  // Function to fetch available time slots
  const fetchAvailableTimeSlots = (spotId: string, date: string) => {
    setTimeSlotLoading(true);
    setTimeSlotError(null);

    authFetch(`/api/parking/parking-spot/${spotId}/available-windows/?date=${date}`)
      .then(response => {
        setAvailableTimeSlots(response.data);

        // Reset selected hours when available slots change
        setReservationForm(prev => ({
          ...prev,
          selectedHours: []
        }));
      })
      .catch(error => {
        console.error('Error fetching available time slots:', error);
        setTimeSlotError('Не удалось загрузить доступные временные слоты');
      })
      .finally(() => {
        setTimeSlotLoading(false);
      });
  };

  // Новый: периодический рефреш статусов парковочных мест (каждые 30 сек)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const spotsRes = await authFetch<ParkingSpot[]>('/api/sensor/');
        setSpots(spotsRes.data);
      } catch (e) {
        // Не ломаем UI, просто логируем
        console.error('Ошибка обновления статусов парковки:', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [authFetch]);

  if (loading) return <div>Загрузка карты…</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!user) return null; // на случай гонки

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
      <MapContainer
        center={center}
        zoom={zoomThreshold + 1}
        maxZoom={23}
        maxBounds={bounds}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={23}
          maxNativeZoom={23}
        />

        <FreeSpotsCluster spots={spots} center={center} zoomThreshold={zoomThreshold} />

        {spots.map((spot) => {
          const positions: LatLngExpression[] = [
            [spot.latitude1, spot.longitude1],
            [spot.latitude2, spot.longitude2],
            [spot.latitude3, spot.longitude3],
            [spot.latitude4, spot.longitude4],
          ];
          const opts = {
            color: spot.is_lock ? 'red' : 'green',
            weight: 2,
            fillOpacity: 0.3,
          } as PathOptions;
          return (
            <Polygon 
              key={spot.reference} 
              positions={positions} 
              pathOptions={opts}
              eventHandlers={{
                click: () => {
                  if (!spot.is_lock) {
                    setSelectedSpot(spot);
                    setShowReservationModal(true);
                  }
                }
              }}
            >
              <Popup>
                {spot.name || `Место ${spot.reference.slice(0, 8)}`}
                <br />
                Состояние: {spot.is_lock ? 'Занято' : 'Свободно'}
                <br />
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${spot.is_occupied ? 'bg-red-500' : 'bg-green-500'}`}
                  ></span>
                  <span>Датчик: {spot.is_occupied ? 'Занято' : 'Свободно'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${spot.is_blocker_raised ? 'bg-blue-500' : 'bg-gray-500'}`}
                  ></span>
                  <span>Блокер: {spot.is_blocker_raised ? 'Поднят' : 'Опущен'}</span>
                </div>
                {!spot.is_lock && (
                  <button 
                    className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-sm"
                    onClick={() => {
                      setSelectedSpot(spot);
                      setShowReservationModal(true);
                    }}
                  >
                    Забронировать
                  </button>
                )}
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Reservation Modal */}
      {selectedSpot && (
        <Modal
          isOpen={showReservationModal}
          onClose={() => {
            setShowReservationModal(false);
            setReservationError(null);
            setReservationSuccess(false);
          }}
          title={`Бронирование места ${selectedSpot.name || selectedSpot.reference.slice(0, 8)}`}
          size="lg"
        >
          <div className="space-y-4">
            {reservationSuccess ? (
              <div className="bg-green-100 p-4 rounded-lg text-green-800">
                <p className="font-semibold">Бронирование успешно создано!</p>
                <p>Вы можете просмотреть детали в разделе "Мои бронирования".</p>
                <button
                  onClick={() => router.push('/parking/my-reservations')}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                >
                  Перейти к моим бронированиям
                </button>
              </div>
            ) : (
              <>
                {reservationError && (
                  <div className="bg-red-100 p-4 rounded-lg text-red-800">
                    <p>{reservationError}</p>
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();

                  // Validate form
                  if (!reservationForm.paymentMethod) {
                    setReservationError('Выберите способ оплаты');
                    return;
                  }

                  if (reservationForm.selectedHours.length === 0) {
                    setReservationError('Выберите хотя бы один час для бронирования');
                    return;
                  }

                  // Check if hours are consecutive
                  let isConsecutive = true;
                  for (let i = 0; i < reservationForm.selectedHours.length - 1; i++) {
                    const currentEnd = new Date(reservationForm.selectedHours[i].end).getTime();
                    const nextStart = new Date(reservationForm.selectedHours[i + 1].start).getTime();
                    if (currentEnd !== nextStart) {
                      isConsecutive = false;
                      break;
                    }
                  }

                  if (!isConsecutive && reservationForm.selectedHours.length > 1) {
                    setReservationError('Выбранные часы должны быть последовательными');
                    return;
                  }

                  const startTime = new Date(reservationForm.startTime);
                  const endTime = new Date(reservationForm.endTime);
                  // Add a 5-minute buffer to account for form filling time
                  const now = getAlmatyTime(); // Use Almaty timezone
                  const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

                  if (endTime <= startTime) {
                    setReservationError('Время окончания должно быть позже времени начала');
                    return;
                  }

                  // Create reservation
                  setReservationLoading(true);
                  setReservationError(null);

                  // Check if selectedSpot is available
                  if (!selectedSpot) {
                    setReservationError('Не удалось определить парковочное место. Пожалуйста, попробуйте еще раз.');
                    setReservationLoading(false);
                    return;
                  }

                  // Prepare data
                  const reservationData: any = {
                    parking_spot: selectedSpot.reference,
                    payment_method_type: reservationForm.paymentMethod === 'wallet' ? 'wallet' : 'card',
                    payment_method_id: reservationForm.paymentMethod === 'wallet' ? null : reservationForm.paymentMethod,
                    start_time: reservationForm.startTime,
                    end_time: reservationForm.endTime,
                    selected_hours: reservationForm.selectedHours
                  };

                  // Send request to create reservation
                  authFetch('/api/parking/reservations/', {
                    method: 'POST',
                    data: reservationData
                  })
                    .then(response => {
                      // Handle successful reservation
                      setReservationSuccess(true);
                      setReservationId(response.data.id);

                      // Refresh parking spots to show updated status
                      return authFetch<ParkingSpot[]>('/api/sensor/');
                    })
                    .then(spotsRes => {
                      setSpots(spotsRes.data);
                    })
                    .catch(error => {
                      // Handle error
                      console.error('Error creating reservation:', error);
                      if (error.response?.data?.detail) {
                        setReservationError(error.response.data.detail);
                      } else if (error.response?.data?.non_field_errors) {
                        setReservationError(error.response.data.non_field_errors[0]);
                      } else {
                        setReservationError('Не удалось создать бронирование. Пожалуйста, попробуйте еще раз.');
                      }
                    })
                    .finally(() => {
                      setReservationLoading(false);
                    });
                }}>
                  {/* Booking Form */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Выберите дату
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Выберите часы для бронирования
                    </label>

                    {timeSlotLoading ? (
                      <div className="flex justify-center items-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : timeSlotError ? (
                      <div className="bg-red-100 p-3 rounded-md text-red-800 text-sm">
                        {timeSlotError}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600 mb-2">
                          Выберите последовательные часы (максимум 24 часа). Заблокированные слоты уже забронированы.
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-2">
                          {availableTimeSlots.map((slot, index) => {
                            // Format time for display (HH:MM)
                            const startTime = new Date(slot.start_time);
                            const formattedTime = startTime.toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            });

                            // Check if this slot is selected
                            const isSelected = reservationForm.selectedHours.some(
                              hour => hour.start === slot.start_time && hour.end === slot.end_time
                            );

                            return (
                              <button
                                key={index}
                                type="button"
                                disabled={slot.status === 'blocked'}
                                onClick={() => {
                                  // Handle slot selection
                                  const newSelectedHours = [...reservationForm.selectedHours];

                                  if (isSelected) {
                                    // If already selected, remove it
                                    const index = newSelectedHours.findIndex(
                                      hour => hour.start === slot.start_time && hour.end === slot.end_time
                                    );
                                    if (index !== -1) {
                                      newSelectedHours.splice(index, 1);
                                    }
                                  } else {
                                    // If not selected, add it
                                    newSelectedHours.push({
                                      start: slot.start_time,
                                      end: slot.end_time
                                    });
                                  }

                                  // Sort by start time
                                  newSelectedHours.sort((a, b) => 
                                    new Date(a.start).getTime() - new Date(b.start).getTime()
                                  );

                                  // Check if hours are consecutive
                                  let isConsecutive = true;
                                  for (let i = 0; i < newSelectedHours.length - 1; i++) {
                                    const currentEnd = new Date(newSelectedHours[i].end).getTime();
                                    const nextStart = new Date(newSelectedHours[i + 1].start).getTime();
                                    if (currentEnd !== nextStart) {
                                      isConsecutive = false;
                                      break;
                                    }
                                  }

                                  if (!isConsecutive && newSelectedHours.length > 1) {
                                    setReservationError('Выбранные часы должны быть последовательными');
                                    return;
                                  }

                                  // Clear error if selection is valid
                                  if (reservationError === 'Выбранные часы должны быть последовательными') {
                                    setReservationError(null);
                                  }

                                  // Update form
                                  setReservationForm(prev => ({
                                    ...prev,
                                    selectedHours: newSelectedHours,
                                    // Update start and end times based on selected hours
                                    startTime: newSelectedHours.length > 0 ? newSelectedHours[0].start : prev.startTime,
                                    endTime: newSelectedHours.length > 0 
                                      ? newSelectedHours[newSelectedHours.length - 1].end 
                                      : prev.endTime
                                  }));
                                }}
                                className={`
                                  py-2 px-1 text-sm rounded-md flex items-center justify-center
                                  ${slot.status === 'blocked' 
                                    ? 'bg-red-100 text-red-800 cursor-not-allowed' 
                                    : isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                  }
                                `}
                              >
                                {formattedTime}
                              </button>
                            );
                          })}
                        </div>

                        {reservationForm.selectedHours.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm font-medium text-blue-800">
                              Выбрано часов: {reservationForm.selectedHours.length}
                            </p>
                            <p className="text-sm text-blue-700">
                              С {new Date(reservationForm.selectedHours[0].start).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })} до {new Date(reservationForm.selectedHours[reservationForm.selectedHours.length - 1].end).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Способ оплаты
                    </label>
                    <select
                      value={reservationForm.paymentMethod}
                      onChange={(e) => setReservationForm({
                        ...reservationForm,
                        paymentMethod: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Выберите способ оплаты</option>
                      <option value="wallet">Кошелек</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.type === 'credit_card' ? 'Кредитная карта' : 'Дебетовая карта'} •••• {method.card_number ? method.card_number.slice(-4) : 'XXXX'}
                        </option>
                      ))}
                    </select>
                    {paymentMethods.length === 0 && (
                      <p className="mt-1 text-sm text-yellow-600">
                        У вас нет сохраненных карт. <a href="/payments" className="text-blue-500 hover:underline">Добавить карту</a>
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReservationModal(false);
                        setReservationError(null);
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={reservationLoading}
                      className={`px-4 py-2 rounded-md text-white ${
                        reservationLoading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {reservationLoading ? 'Создание...' : 'Забронировать'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
