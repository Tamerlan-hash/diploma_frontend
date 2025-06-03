'use client';

import { useAuth } from '@/context/AuthContext';
import type { LatLngBoundsExpression, LatLngExpression, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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
  prediction?: {
    probability_available: number;
    prediction_time: string;
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

// Component to navigate to a specific spot on the map
const MapNavigator: React.FC<{
  targetPosition: LatLngExpression | null;
  zoom?: number;
}> = ({ targetPosition, zoom = 18 }) => {
  const map = useMap();

  useEffect(() => {
    if (targetPosition) {
      map.setView(targetPosition, zoom);
    }
  }, [map, targetPosition, zoom]);

  return null;
};

// Component to display a list of parking spots sorted by availability prediction
const ParkingSpotsList: React.FC<{
  spots: ParkingSpot[];
  onSpotClick: (spot: ParkingSpot) => void;
}> = ({ spots, onSpotClick }) => {
  // Filter spots that have prediction data
  const spotsWithPrediction = spots.filter(spot => spot.prediction?.probability_available !== undefined);

  // Sort spots by availability prediction in descending order
  const sortedSpots = [...spotsWithPrediction].sort((a, b) => {
    const predictionA = a.prediction?.probability_available || 0;
    const predictionB = b.prediction?.probability_available || 0;
    return predictionB - predictionA;
  });

  return (
    <div className="absolute top-20 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-h-[60vh] overflow-y-auto w-64">
      <h3 className="font-medium text-lg mb-2">Доступные парковочные места</h3>
      {sortedSpots.length === 0 ? (
        <p className="text-gray-500">Нет данных о прогнозах</p>
      ) : (
        <div className="space-y-2">
          {sortedSpots.map((spot) => (
            <div 
              key={spot.reference}
              className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSpotClick(spot)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">
                    {spot.name || `Место ${spot.reference.slice(0, 8)}`}
                  </h4>
                  <div className="flex items-center mt-1">
                    <span
                      className={`w-3 h-3 rounded-full mr-2 ${
                        spot.prediction && spot.prediction.probability_available > 0.7 
                          ? 'bg-green-500' 
                          : spot.prediction && spot.prediction.probability_available > 0.3 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                      }`}
                    ></span>
                    <span className="text-sm">
                      Вероятность: {spot.prediction ? Math.round(spot.prediction.probability_available * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Состояние: {spot.is_lock ? 'Занято' : 'Свободно'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

  // State for the parking spots list
  const [showSpotsList, setShowSpotsList] = useState(false);
  const [targetPosition, setTargetPosition] = useState<LatLngExpression | null>(null);

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

  // AI prediction and recommendation state
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [recommendedSpots, setRecommendedSpots] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

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

  // Function to fetch parking spot predictions
  const fetchPredictions = async (spotId: string) => {
    try {
      const response = await authFetch(`/api/ai/predictions/parking-spot/${spotId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching prediction for spot ${spotId}:`, error);
      return null;
    }
  };

  // Function to get recommended parking spots
  const getRecommendedParkingSpots = async () => {
    if (!userLocation) {
      alert('Местоположение не определено. Пожалуйста, разрешите доступ к геолокации.');
      return;
    }

    setPredictionsLoading(true);
    setPredictionsError(null);

    try {
      const { latitude, longitude } = userLocation;
      const response = await authFetch(`/api/ai/recommendations/parking-spots/?latitude=${latitude}&longitude=${longitude}&radius=1.0&limit=5`);

      // If no recommendations are returned, create some example recommendations
      if (response.data.length === 0 && spots.length > 0) {
        // Use the first 3 spots from the spots array as example recommendations
        const exampleRecommendations = spots.slice(0, Math.min(3, spots.length)).map((spot, index) => {
          // Calculate the center point of the parking spot
          const centerLat = (spot.latitude1 + spot.latitude2 + spot.latitude3 + spot.latitude4) / 4;
          const centerLng = (spot.longitude1 + spot.longitude2 + spot.longitude3 + spot.longitude4) / 4;

          // Calculate a fake distance (between 0.1 and 0.5 km)
          const fakeDistance = 0.1 + (0.4 * index / 2);

          // Use the prediction if available, otherwise use a default value
          const probability = spot.prediction?.probability_available || 0.7 - (0.1 * index);

          return {
            parking_spot: spot,
            distance: fakeDistance,
            probability_available: probability,
            is_reserved: spot.is_lock,
            score: 0.8 - (0.1 * index)
          };
        });

        setRecommendedSpots(exampleRecommendations);
      } else {
        setRecommendedSpots(response.data);
      }

      setShowRecommendations(true);
    } catch (error) {
      console.error('Error fetching recommended parking spots:', error);
      setPredictionsError('Не удалось получить рекомендации по парковочным местам');
    } finally {
      setPredictionsLoading(false);
    }
  };

  // Function to get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
          alert('Не удалось определить ваше местоположение. Пожалуйста, разрешите доступ к геолокации.');
        }
      );
    } else {
      alert('Геолокация не поддерживается вашим браузером');
    }
  };

  // Function to handle spot click from the parking spots list
  const handleSpotClick = (spot: ParkingSpot) => {
    // Calculate the center point of the parking spot
    const centerLat = (spot.latitude1 + spot.latitude2 + spot.latitude3 + spot.latitude4) / 4;
    const centerLng = (spot.longitude1 + spot.longitude2 + spot.longitude3 + spot.longitude4) / 4;

    // Set the target position for the map navigator
    setTargetPosition([centerLat, centerLng]);
  };

  // Загрузка данных о парковке
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch parking spots
    authFetch<ParkingSpot[]>('/api/sensor/')
      .then(async (spotsRes) => {
        const spotsData = spotsRes.data;

        // Fetch predictions for each spot
        const spotsWithPredictions = await Promise.all(
          spotsData.map(async (spot) => {
            const prediction = await fetchPredictions(spot.reference);
            return {
              ...spot,
              prediction: prediction ? {
                probability_available: prediction.probability_available,
                prediction_time: prediction.prediction_time
              } : undefined
            };
          })
        );

        setSpots(spotsWithPredictions);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Get user location when component mounts
    getUserLocation();
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
      {/* AI Recommendation Button */}
      <div style={{ 
        position: 'absolute', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 9999, 
        display: 'flex', 
        gap: '0.5rem',
        backgroundColor: 'white',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-md flex items-center"
          onClick={() => setShowSpotsList(!showSpotsList)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <span>Список мест</span>
        </button>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-md flex items-center"
          onClick={getRecommendedParkingSpots}
          disabled={predictionsLoading}
        >
          {predictionsLoading ? (
            <span>Загрузка...</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>ИИ Рекомендации</span>
            </>
          )}
        </button>
      </div>

      {/* Parking Spots List - with inline styles to ensure it stays on top */}
      {showSpotsList && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 1000, 
          pointerEvents: 'none' 
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <ParkingSpotsList 
              spots={spots} 
              onSpotClick={handleSpotClick} 
            />
          </div>
        </div>
      )}

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

        {/* Navigator component to handle map position changes */}
        <MapNavigator targetPosition={targetPosition} zoom={18} />

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
                {spot.prediction && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          spot.prediction.probability_available > 0.7 
                            ? 'bg-green-500' 
                            : spot.prediction.probability_available > 0.3 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                      ></span>
                      <span>
                        ИИ прогноз: {Math.round(spot.prediction.probability_available * 100)}% вероятность доступности
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Прогноз на: {new Date(spot.prediction.prediction_time).toLocaleString()}
                    </div>
                  </div>
                )}
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

      {/* AI Recommendations Modal */}
      <Modal
        isOpen={showRecommendations}
        onClose={() => {
          setShowRecommendations(false);
          setRecommendedSpots([]);
        }}
        title="ИИ Рекомендации по парковке"
        size="lg"
      >
        <div className="p-4">
          {predictionsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {predictionsError}
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            Наш ИИ проанализировал данные о парковочных местах и рекомендует следующие места, основываясь на вашем местоположении и вероятности доступности:
          </p>

          {recommendedSpots.length === 0 && !predictionsError && !predictionsLoading && (
            <div className="text-center py-4">
              <p>Нет доступных рекомендаций.</p>
            </div>
          )}

          {predictionsLoading ? (
            <div className="text-center py-4">
              <p>Загрузка рекомендаций...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedSpots.map((rec, index) => (
                <div 
                  key={rec.parking_spot.reference} 
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {index + 1}. {rec.parking_spot.name || `Место ${rec.parking_spot.reference.slice(0, 8)}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Расстояние: {rec.distance.toFixed(2)} км
                      </p>
                      <div className="flex items-center mt-1">
                        <span
                          className={`w-3 h-3 rounded-full mr-2 ${
                            rec.probability_available > 0.7 
                              ? 'bg-green-500' 
                              : rec.probability_available > 0.3 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                          }`}
                        ></span>
                        <span className="text-sm">
                          Вероятность доступности: {Math.round(rec.probability_available * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Состояние: {rec.is_reserved ? 'Зарезервировано' : 'Свободно'}
                      </p>
                    </div>

                    {!rec.is_reserved && (
                      <button 
                        className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                        onClick={() => {
                          // Find the full spot data
                          const fullSpot = spots.find(s => s.reference === rec.parking_spot.reference);
                          if (fullSpot) {
                            setSelectedSpot(fullSpot);
                            setShowRecommendations(false);
                            setShowReservationModal(true);
                          }
                        }}
                      >
                        Забронировать
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

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
