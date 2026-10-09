import { useEffect, useSyncExternalStore } from 'react';
import Puerta from './paginas/Puerta';
import Portal from './paginas/Portal';
import { iniciarSincronizacion } from './sync/sync';

const suscribir = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const useRuta = () => useSyncExternalStore(suscribir, () => window.location.hash.split('?')[0]);

// Rutas:
//   #/        → control de puerta (staff)
//   #/portal  → portal de zona amarilla (estudiantes)
export default function App() {
  const ruta = useRuta();
  const esPortal = ruta === '#/portal';

  // La cola se envía sola: al volver la conexión, al volver a la app y cada 30 s
  useEffect(() => (esPortal ? undefined : iniciarSincronizacion()), [esPortal]);

  return esPortal ? <Portal /> : <Puerta />;
}
