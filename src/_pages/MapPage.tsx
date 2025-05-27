'use client';

import dynamic from 'next/dynamic';

// динамический импорт только на клиенте — SSR отключён
const MapClient = dynamic(() => import('@/components/MapClient').then((mod) => mod.MapClient), {
  ssr: false,
});

export default function MapPage() {
  return (
    <div>
      <MapClient />
    </div>
  );
}
