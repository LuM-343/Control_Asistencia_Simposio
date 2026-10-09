import { useSyncExternalStore } from 'react';

const suscribir = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

// true si el dispositivo tiene conexión
export const useEnLinea = () => useSyncExternalStore(suscribir, () => navigator.onLine);
