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
  selectedHours: Array<{start: string, end: string}>;
  useHourlyBooking: boolean;
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

  const freeCount = spots.filter((s) => !s.is_occupied).length;
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
  const { user, authFetch } = useAuth();
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
    selectedHours: [],
    useHourlyBooking: false
  });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{start: string, end: string}>>([]);

  const center: LatLngExpression = [43.23517, 76.90991];
  const bounds: LatLngBoundsExpression = [
    [43.1, 76.72],
    [43.38, 77.15],
  ];
  const zoomThreshold = 15;

  // Если неавторизован — редирект
  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

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

      setReservationForm({
        startTime: formatDate(oneHourLater),
        endTime: formatDate(twoHoursLater),
        paymentMethod: '',
        selectedHours: [],
        useHourlyBooking: false
      });

      // Fetch payment methods
      authFetch('/api/payments/methods/')
        .then(response => {
          setPaymentMethods(response.data);
        })
        .catch(error => {
          console.error('Error fetching payment methods:', error);
        });

      // Fetch available time slots for the selected parking spot
      // Using the current date as the start date for available windows
      const today = getAlmatyTime(); // Use Almaty timezone
      today.setHours(0, 0, 0, 0); // Start of today
      const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      // Only fetch available windows if selectedSpot.id is defined
      if (selectedSpot && selectedSpot.id) {
        authFetch(`/api/parking/parking-spot/${selectedSpot.id}/available-windows/?date=${formattedDate}`)
          .then(response => {
            setAvailableTimeSlots(response.data.available_windows || []);
          })
          .catch(error => {
            console.error('Error fetching available time slots:', error);
            setAvailableTimeSlots([]);
          });
      } else {
        console.warn('Cannot fetch available time slots: parking spot ID is undefined');
        setAvailableTimeSlots([]);
      }
    }
  }, [selectedSpot, showReservationModal, authFetch]);

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
        maxBounds={bounds}
        maxZoom={22}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
          maxZoom={22}
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
            color: spot.is_occupied ? 'red' : 'green',
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
                  if (!spot.is_occupied) {
                    setSelectedSpot(spot);
                    setShowReservationModal(true);
                  }
                }
              }}
            >
              <Popup>
                {spot.name || `Место ${spot.reference.slice(0, 8)}`}
                <br />
                Состояние: {spot.is_occupied ? 'Занято' : 'Свободно'}
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
                {!spot.is_occupied && (
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

                  if (reservationForm.useHourlyBooking && reservationForm.selectedHours.length === 0) {
                    setReservationError('Выберите хотя бы один час для бронирования');
                    return;
                  }

                  if (!reservationForm.useHourlyBooking) {
                    const startTime = new Date(reservationForm.startTime);
                    const endTime = new Date(reservationForm.endTime);
                    // Add a 5-minute buffer to account for form filling time
                    const now = getAlmatyTime(); // Use Almaty timezone
                    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);


                    if (endTime <= startTime) {
                      setReservationError('Время окончания должно быть позже времени начала');
                      return;
                    }
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
                    payment_method_id: reservationForm.paymentMethod === 'wallet' ? null : reservationForm.paymentMethod
                  };

                  // Add either selected_hours or start_time/end_time based on booking type
                  if (reservationForm.useHourlyBooking) {
                    reservationData.selected_hours = reservationForm.selectedHours;
                  } else {
                    reservationData.start_time = reservationForm.startTime;
                    reservationData.end_time = reservationForm.endTime;
                  }

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
                  {/* Booking Type Toggle */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                      <span className="text-sm font-medium">Тип бронирования:</span>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!reservationForm.useHourlyBooking}
                            onChange={() => {
                              setReservationForm({
                                ...reservationForm,
                                useHourlyBooking: false
                              });
                            }}
                            className="mr-2"
                          />
                          <span>Стандартное</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={reservationForm.useHourlyBooking}
                            onChange={() => {
                              setReservationForm({
                                ...reservationForm,
                                useHourlyBooking: true
                              });
                            }}
                            className="mr-2"
                          />
                          <span>Почасовое</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Standard Booking Form */}
                  {!reservationForm.useHourlyBooking && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Дата и время начала
                        </label>
                        <input
                          type="datetime-local"
                          value={reservationForm.startTime}
                          onChange={(e) => {
                            setReservationForm({
                              ...reservationForm,
                              startTime: e.target.value
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Дата и время окончания
                        </label>
                        <input
                          type="datetime-local"
                          value={reservationForm.endTime}
                          onChange={(e) => {
                            setReservationForm({
                              ...reservationForm,
                              endTime: e.target.value
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Hourly Booking Form */}
                  {reservationForm.useHourlyBooking && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Выберите часы для бронирования
                      </label>

                      {availableTimeSlots.length === 0 ? (
                        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg">
                          Нет доступных часов для бронирования на сегодня.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-300 rounded-md">
                          {availableTimeSlots.map((slot, index) => {
                            const startTime = new Date(slot.start);
                            const endTime = new Date(slot.end);
                            const isSelected = reservationForm.selectedHours.some(
                              h => h.start === slot.start && h.end === slot.end
                            );


                            return (
                              <div 
                                key={index}
                                className={`p-2 rounded-md cursor-pointer text-center text-sm ${
                                  isSelected 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                                onClick={() => {
                                  let newSelectedHours;
                                  if (isSelected) {
                                    // Remove from selection
                                    newSelectedHours = reservationForm.selectedHours.filter(
                                      h => h.start !== slot.start || h.end !== slot.end
                                    );
                                  } else {
                                    // Add to selection
                                    newSelectedHours = [
                                      ...reservationForm.selectedHours,
                                      { start: slot.start, end: slot.end }
                                    ];
                                  }
                                  setReservationForm({
                                    ...reservationForm,
                                    selectedHours: newSelectedHours
                                  });
                                }}
                              >
                                {startTime.getHours()}:00 - {endTime.getHours()}:00
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {reservationForm.selectedHours.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Выбрано часов: {reservationForm.selectedHours.length}
                        </div>
                      )}
                    </div>
                  )}

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
