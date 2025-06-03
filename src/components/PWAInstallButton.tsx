'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'icon' | 'text' | 'full';
}

export function PWAInstallButton({ className = '', variant = 'full' }: PWAInstallButtonProps) {
  const { canInstall, isMobile, handleInstall } = usePWAInstall();

  // Don't show anything if:
  // - Not on mobile
  // - Can't install the app
  // - App is already in standalone mode
  if (!isMobile || !canInstall || window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleInstall} 
        className={`pwa-install-icon-button flex items-center justify-center p-2 rounded-full ${className}`}
        aria-label="Install app"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
          <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
          <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button 
        onClick={handleInstall} 
        className={`pwa-install-text-button flex items-center justify-center ${className}`}
      >
        Установить приложение
      </button>
    );
  }

  return (
    <button 
      onClick={handleInstall} 
      className={`pwa-install-full-button flex items-center justify-center ${className}`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="mr-2"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
        <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
        <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
      Установить приложение
    </button>
  );
}
