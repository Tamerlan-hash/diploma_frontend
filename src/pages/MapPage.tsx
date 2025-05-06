'use client';

import { useAuth } from '@/app/context/AuthContext';
import L, { LatLngBoundsExpression, LatLngExpression, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';

// Динамический импорт без SSR
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then((m) => m.Polygon), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

interface ParkingSpot {
  reference: string;
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

const FreeSpotsCluster: React.FC<{
  spots: ParkingSpot[];
  center: LatLngExpression;
  zoomThreshold: number;
}> = ({ spots, center, zoomThreshold }) => {
  const map = useMap();
  const [showCluster, setShowCluster] = useState(map.getZoom() < zoomThreshold);

  useEffect(() => {
    const onZoom = () => setShowCluster(map.getZoom() < zoomThreshold);
    map.on('zoomend', onZoom);
    return () => void map.off('zoomend', onZoom);
  }, [map, zoomThreshold]);

  if (!showCluster) return null;

  const freeCount = spots.filter((s) => !s.is_lock).length;
  const icon = L.divIcon({
    className: '',
    html: `<div style="
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,128,0,0.8); width:30px; height:30px;
        border-radius:50%; color:#fff; font-weight:bold; font-size:14px;
        box-shadow:0 0 3px rgba(0,0,0,0.6);
      ">${freeCount}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const handleClick = () => map.setView(center, zoomThreshold + 2);

  return (
    <Marker position={center} icon={icon} eventHandlers={{ click: handleClick }}>
      <Popup>
        Свободных парковок: {freeCount}.<br />
        Кликните, чтобы приблизить.
      </Popup>
    </Marker>
  );
};

const MapPage: React.FC = () => {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, accessToken } = useAuth();
  const router = useRouter();

  const almatyCenter: LatLngExpression = [43.23517, 76.90991];
  const almatyBounds: LatLngBoundsExpression = [
    [43.1, 76.72],
    [43.38, 77.15],
  ];
  const zoomThreshold = 15;

  // Редирект на логин, если не авторизован
  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  // Загрузка парковок
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:8000/api/sensor/', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json() as Promise<ParkingSpot[]>;
      })
      .then((data) => setSpots(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <div>Загрузка карты...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!user) return null;

  return (
    <MapContainer
      center={almatyCenter}
      zoom={zoomThreshold + 1}
      maxBounds={almatyBounds}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      <FreeSpotsCluster spots={spots} center={almatyCenter} zoomThreshold={zoomThreshold} />

      {spots.map((spot) => {
        // Собираем array из 4 точек
        const positions: LatLngExpression[] = [
          [spot.latitude1, spot.longitude1],
          [spot.latitude2, spot.longitude2],
          [spot.latitude3, spot.longitude3],
          [spot.latitude4, spot.longitude4],
        ];

        const pathOptions = {
          color: spot.is_lock ? 'red' : 'green',
          weight: 2,
          fillOpacity: 0.3,
        } as PathOptions;

        return (
          <Polygon key={spot.reference} positions={positions} pathOptions={pathOptions}>
            <Popup>
              Reference: {spot.reference}
              <br />
              Состояние: {spot.is_lock ? 'Занято' : 'Свободно'}
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>
  );
};

export { MapPage };
