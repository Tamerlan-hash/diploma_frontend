'use client';

import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import type { LatLngBoundsExpression, LatLngExpression, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import PaymentProcessor from './PaymentProcessor';

interface ParkingSpot {
  reference: string;
  name: string;
  is_lock: boolean;
  latitude1: number;
  latitude2: number;
  latitude3: number;
  latitude4: number;
  longitude1: number;
  longitude2: number;
  longitude3: number;
  longitude4: number;
}

interface UserSubscription {
  id: number;
  plan_details: {
    name: string;
    discount_percentage: number;
  };
}

interface Reservation {
  parking_spot: string;
  start_time: string;
  end_time: string;
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
  const { user, authFetch } = useAuth();
  const router = useRouter();

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking state
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [reservationId, setReservationId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Subscription state
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discountedPrice, setDiscountedPrice] = useState<number>(0);

  // Available windows state
  interface AvailableWindow {
    start_time: string;
    end_time: string;
    status?: string;
    reason?: string;
  }
  const [availableWindows, setAvailableWindows] = useState<AvailableWindow[]>([]);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Multi-hour selection state
  const [selectedHourIndices, setSelectedHourIndices] = useState<number[]>([]);

  // Utility function to format dates in local timezone (YYYY-MM-DDTHH:MM)
  const formatInLocalTimezone = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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

  // Загрузка данных о парковке и активной подписке
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch parking spots
    const fetchSpots = authFetch<ParkingSpot[]>('/api/sensor/');

    // Fetch active subscription
    const fetchSubscription = authFetch<UserSubscription>('/api/subscriptions/subscriptions/active/')
      .then(res => {
        setActiveSubscription(res.data);
        return res.data;
      })
      .catch(err => {
        // If no active subscription or error, just continue
        console.log('No active subscription or error fetching it:', err);
        setActiveSubscription(null);
        return null;
      });

    // Wait for both requests to complete
    Promise.all([fetchSpots, fetchSubscription])
      .then(([spotsRes]) => {
        setSpots(spotsRes.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authFetch]);

  // Fetch available windows for a parking spot on a specific date
  const fetchAvailableWindows = async (spotId: string, date: string) => {
    setIsLoadingWindows(true);
    setBookingError(null);
    setSelectedHourIndices([]); // Reset selected hours when fetching new windows

    try {
      const response = await authFetch<AvailableWindow[]>(
        `/api/parking/parking-spot/${spotId}/available-windows/?date=${date}`
      );

      setAvailableWindows(response.data);

      // Find the first available window (not blocked)
      const firstAvailableWindow = response.data.find(window => window.status !== 'blocked');

      // If there are available windows, set default start and end times to the first available window
      if (firstAvailableWindow) {
        setStartTime(new Date(firstAvailableWindow.start_time).toISOString().slice(0, 16));
        setEndTime(new Date(firstAvailableWindow.end_time).toISOString().slice(0, 16));
      } else {
        // If all windows are blocked, clear the start and end times
        setStartTime('');
        setEndTime('');
      }
    } catch (error) {
      console.error('Error fetching available windows:', error);
      if (axios.isAxiosError(error) && error.response) {
        setBookingError(`Ошибка при загрузке доступных окон: ${error.response.data?.detail || error.message}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        setBookingError(`Ошибка при загрузке доступных окон: ${error.message}`);
      }
    } finally {
      setIsLoadingWindows(false);
    }
  };

  // Handle hour selection for multi-hour booking
  const handleHourSelection = (index: number) => {
    // If no hours are selected yet, select this one
    if (selectedHourIndices.length === 0) {
      setSelectedHourIndices([index]);

      // Set start and end times for this single hour
      const window = availableWindows[index];
      setStartTime(new Date(window.start_time).toISOString().slice(0, 16));
      setEndTime(new Date(window.end_time).toISOString().slice(0, 16));
      return;
    }

    // Sort current selections to find min and max
    const sortedIndices = [...selectedHourIndices].sort((a, b) => a - b);
    const minIndex = sortedIndices[0];
    const maxIndex = sortedIndices[sortedIndices.length - 1];

    // If clicking on an already selected hour, deselect everything except this one
    if (selectedHourIndices.includes(index)) {
      setSelectedHourIndices([index]);

      // Set start and end times for this single hour
      const window = availableWindows[index];
      setStartTime(new Date(window.start_time).toISOString().slice(0, 16));
      setEndTime(new Date(window.end_time).toISOString().slice(0, 16));
      return;
    }

    // Check if the new selection is adjacent to the current selection
    if (index === minIndex - 1) {
      // Adding an hour before the current selection
      const newIndices = [index, ...sortedIndices];
      setSelectedHourIndices(newIndices);

      // Update start time (end time stays the same)
      const window = availableWindows[index];
      setStartTime(new Date(window.start_time).toISOString().slice(0, 16));
    } else if (index === maxIndex + 1) {
      // Adding an hour after the current selection
      const newIndices = [...sortedIndices, index];
      setSelectedHourIndices(newIndices);

      // Update end time (start time stays the same)
      const window = availableWindows[index];
      setEndTime(new Date(window.end_time).toISOString().slice(0, 16));
    } else {
      // Not adjacent, start a new selection with just this hour
      setSelectedHourIndices([index]);

      // Set start and end times for this single hour
      const window = availableWindows[index];
      setStartTime(new Date(window.start_time).toISOString().slice(0, 16));
      setEndTime(new Date(window.end_time).toISOString().slice(0, 16));
    }
  };

  // Handle spot selection
  const handleSpotSelect = (spot: ParkingSpot) => {
    if (spot.is_lock) {
      setBookingError('Это место уже занято');
      return;
    }

    setSelectedSpot(spot);
    setBookingError(null);
    setBookingSuccess(null);
    setSelectedHourIndices([]); // Reset selected hours

    // Set today's date as the default selected date
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);

    // Fetch available windows for today
    fetchAvailableWindows(spot.reference, today);

    // Set default times (current time + 15 minutes for start, + 1 hour 15 minutes for end)
    // These will be overridden if available windows are found
    const now = new Date();
    const startDateTime = new Date(now.getTime() + 15 * 60 * 1000); // Current time + 15 minutes
    const endDateTime = new Date(now.getTime() + 75 * 60 * 1000);   // Current time + 1 hour 15 minutes

    setStartTime(formatInLocalTimezone(startDateTime));
    setEndTime(formatInLocalTimezone(endDateTime));
  };

  // Handle booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSpot) {
      setBookingError('Выберите парковочное место');
      return;
    }

    if (!startTime || !endTime) {
      setBookingError('Укажите время начала и окончания');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      setBookingError('Время окончания должно быть позже времени начала');
      return;
    }

    // Check if start time is in the past
    const now = new Date();
    if (startDate < now) {
      setBookingError('Время начала не может быть в прошлом');
      return;
    }

    setIsBooking(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      const reservation: Reservation = {
        parking_spot: selectedSpot.reference,
        start_time: formatInLocalTimezone(startDate),  // Format in local timezone: YYYY-MM-DDTHH:MM
        end_time: formatInLocalTimezone(endDate)       // Format in local timezone: YYYY-MM-DDTHH:MM
      };

      // Log the reservation data for debugging
      console.log('Sending reservation:', JSON.stringify(reservation));

      const response = await authFetch('/api/parking/reservations/', {
        method: 'POST',
        data: reservation
      });

      // Get the reservation ID and price from the response
      const createdReservation = response.data;
      const reservId = createdReservation.id;
      const price = createdReservation.total_price || 0; // Use 0 as fallback instead of hardcoded 1000

      // If we have an active subscription, show the discount information
      if (activeSubscription) {
        const discountPercentage = activeSubscription.plan_details.discount_percentage;
        // Calculate the original price (before discount)
        const originalPriceValue = price / (1 - (discountPercentage / 100));
        setOriginalPrice(originalPriceValue);
        setDiscountedPrice(price);

        setBookingSuccess(`Бронирование успешно создано! Применена скидка ${discountPercentage}%. Переход к оплате...`);
      } else {
        setBookingSuccess('Бронирование успешно создано! Переход к оплате...');
      }

      // Set payment state
      setReservationId(reservId);
      setPaymentAmount(price);
      setShowPayment(true);

      // Refresh parking spots
      const spotsRes = await authFetch<ParkingSpot[]>('/api/sensor/');
      setSpots(spotsRes.data);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response) {
        console.error('Reservation error:', e.response.data);
        setBookingError(e.response.data?.detail || JSON.stringify(e.response.data) || `Ошибка ${e.response.status}`);
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        setBookingError(e.message);
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Cancel booking
  const handleCancelBooking = () => {
    setSelectedSpot(null);
    setBookingError(null);
    setBookingSuccess(null);
  };

  // Payment handlers
  const handlePaymentSuccess = () => {
    // Reset all states and show success message
    setShowPayment(false);
    setSelectedSpot(null);
    setReservationId('');
    setPaymentAmount(0);
    setBookingSuccess('Оплата успешно выполнена!');

    // Optionally redirect to reservations page
    router.push('/parking/my-reservations');
  };

  const handlePaymentCancel = () => {
    // Just hide the payment processor but keep the reservation
    setShowPayment(false);
    setBookingSuccess('Бронирование создано, но не оплачено. Вы можете оплатить его позже в личном кабинете.');
  };

  if (loading) return <div>Загрузка карты…</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!user) return null; // на случай гонки

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
      <div className="absolute top-2 left-2 md:top-4 md:left-16 z-[1000] bg-white px-3 py-2 md:px-4 md:py-2 rounded shadow-md flex items-center gap-2">
        <a 
          href="/parking/my-reservations" 
          className="text-green-600 font-bold flex items-center gap-1 text-sm md:text-base"
        >
          <span className="text-lg md:text-xl">📋</span> 
          <span className="hidden sm:inline">View My Reservations</span>
          <span className="sm:hidden">My Reservations</span>
        </a>
      </div>

      <MapContainer
        center={center}
        zoom={zoomThreshold + 1}
        maxBounds={bounds}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
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
                click: () => handleSpotSelect(spot)
              }}
            >
              <Popup>
                {spot.name || `Место ${spot.reference.slice(0, 8)}`}
                <br />
                Состояние: {spot.is_lock ? 'Занято' : 'Свободно'}
                {!spot.is_lock && (
                  <div>
                    <button 
                      onClick={() => handleSpotSelect(spot)}
                      style={{ 
                        marginTop: '10px', 
                        padding: '5px 10px', 
                        backgroundColor: '#4CAF50', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Забронировать
                    </button>
                  </div>
                )}
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Booking Form */}
      {selectedSpot && !showPayment && (
        <div className="absolute top-2 right-2 md:top-5 md:right-5 bg-white p-4 md:p-5 rounded-lg shadow-lg z-[1000] w-[calc(100%-16px)] md:w-auto md:max-w-md mx-2 md:mx-0">
          <h3 className="text-lg md:text-xl font-semibold mb-2">Бронирование парковочного места</h3>
          <p className="mb-3">Место: {selectedSpot.name || `Место ${selectedSpot.reference.slice(0, 8)}`}</p>

          <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
            <p className="m-0 font-medium text-blue-700 text-sm md:text-base">
              ⏰ Выберите один или несколько последовательных часов для бронирования
            </p>
          </div>

          {bookingError && (
            <div className="text-red-600 mb-3 p-2 bg-red-50 rounded">{bookingError}</div>
          )}

          {bookingSuccess && (
            <div className="text-green-600 mb-3 p-2 bg-green-50 rounded">{bookingSuccess}</div>
          )}

          <form onSubmit={handleBookingSubmit}>
            {/* Date selector */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Выберите дату:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  if (selectedSpot) {
                    fetchAvailableWindows(selectedSpot.reference, newDate);
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Available windows section */}
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Выберите часы для бронирования:</label>

              {isLoadingWindows ? (
                <div className="text-center p-4">Загрузка доступных часов...</div>
              ) : availableWindows.length === 0 ? (
                <div className="text-center p-4 text-red-600">
                  Нет доступных часов на выбранную дату
                </div>
              ) : (
                <div className="max-h-[250px] md:max-h-[200px] overflow-y-auto border border-gray-300 rounded">
                  {availableWindows.map((window, index) => {
                    const startDateTime = new Date(window.start_time);
                    const endDateTime = new Date(window.end_time);
                    const formattedStart = startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const formattedEnd = endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isSelected = selectedHourIndices.includes(index);
                    const isBlocked = window.status === 'blocked';
                    const isPastTime = window.reason === 'past_time';
                    const isAlreadyBooked = window.reason === 'already_booked';

                    return (
                      <div 
                        key={index}
                        onClick={() => !isBlocked && handleHourSelection(index)}
                        className={`p-3 md:p-3 border-b border-gray-200 last:border-b-0 flex items-center justify-between transition-colors
                          ${isBlocked ? 'cursor-not-allowed opacity-70 bg-red-50' : 'cursor-pointer'}
                          ${isSelected ? 'bg-green-50' : ''}
                          ${!isSelected && !isBlocked ? 'hover:bg-gray-100' : ''}
                        `}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${isBlocked ? 'line-through text-gray-500' : ''}`}>
                            {formattedStart} - {formattedEnd}
                          </span>
                          {isBlocked && (
                            <span className="text-xs text-red-600 mt-1">
                              {isPastTime ? '⏱️ Время уже прошло' : '🚫 Уже забронировано'}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded text-white
                          ${isBlocked 
                            ? (isPastTime ? 'bg-gray-500' : 'bg-red-500') 
                            : (isSelected ? 'bg-green-500' : 'bg-gray-500')
                          }`}
                        >
                          1 час
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedHourIndices.length > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                  <p className="m-0 font-medium text-green-800">
                    Выбрано: {selectedHourIndices.length} {
                      selectedHourIndices.length === 1 ? 'час' : 
                      selectedHourIndices.length < 5 ? 'часа' : 'часов'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Hidden time inputs - we keep these for form submission but don't show them to users */}
            <input
              type="hidden"
              value={startTime}
              name="start_time"
            />
            <input
              type="hidden"
              value={endTime}
              name="end_time"
            />

            <div className="flex justify-between gap-3 mt-4">
              <button
                type="button"
                onClick={handleCancelBooking}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded font-medium w-1/2 text-center"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={isBooking}
                className={`px-4 py-3 rounded font-medium w-1/2 text-center text-white
                  ${isBooking ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}
                `}
              >
                {isBooking ? 'Бронирование...' : 'Забронировать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Processor */}
      {showPayment && (
        <div className="absolute top-2 right-2 md:top-5 md:right-5 bg-white p-4 md:p-5 rounded-lg shadow-lg z-[1000] w-[calc(100%-16px)] md:w-auto md:max-w-[500px] mx-2 md:mx-0">
          <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Оплата бронирования</h3>

          {/* Show discount information if applicable */}
          {activeSubscription && originalPrice > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-green-800 font-medium">
                Применена скидка {activeSubscription.plan_details.discount_percentage}% по подписке "{activeSubscription.plan_details.name}"
              </p>
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Стандартная цена:</span>
                <span className="text-gray-600 line-through">{originalPrice.toFixed(2)} ₸</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Цена со скидкой:</span>
                <span className="font-medium text-green-700">{paymentAmount.toFixed(2)} ₸</span>
              </div>
            </div>
          )}

          <PaymentProcessor 
            amount={paymentAmount}
            reservationId={reservationId}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            description="Оплата бронирования парковочного места"
          />
        </div>
      )}
    </div>
  );
}
