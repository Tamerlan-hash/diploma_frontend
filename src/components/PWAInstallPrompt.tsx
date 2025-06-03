'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { canInstall, isMobile, handleInstall } = usePWAInstall();

  // Don't show anything if:
  // - Not on mobile
  // - Can't install the app
  // - App is already in standalone mode
  if (!isMobile || !canInstall) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-prompt-content">
        <span>Установите наше приложение для лучшего опыта</span>
        <div className="pwa-install-prompt-buttons">
          <button onClick={handleInstall} className="pwa-install-button">
            Установить
          </button>
        </div>
      </div>
      <style jsx>{`
        .pwa-install-prompt {
          width: 100%;
          background-color: #f0f0f0;
          padding: 10px 16px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 100;
        }
        .pwa-install-prompt-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }
        .pwa-install-prompt-buttons {
          display: flex;
          gap: 8px;
        }
        .pwa-install-button {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        .pwa-dismiss-button {
          background-color: transparent;
          border: none;
          padding: 6px 12px;
          cursor: pointer;
          color: #666;
        }
        @media (max-width: 600px) {
          .pwa-install-prompt-content {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
