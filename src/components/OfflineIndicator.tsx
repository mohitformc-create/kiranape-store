import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-stone-900/95 text-stone-100 border border-stone-700/80 px-4 py-2 rounded-full text-xs font-semibold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode — Showing cached items</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-1 p-1 hover:text-emerald-400 transition"
        title="Retry connection"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
};
