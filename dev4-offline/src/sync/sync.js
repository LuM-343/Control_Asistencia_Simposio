import { db } from '../db';
import { supabase } from './supabase';

const TAMANO_LOTE = 50;
let enCurso = false; // evita dos sincronizaciones a la vez

export async function sincronizarCola() {
  if (enCurso || !navigator.onLine) return { omitido: true };
  enCurso = true;
  let enviados = 0;
  try {
    while (true) {
      const pendientes = await db.cola_checkins
        .where('sincronizado').equals(0)
        .sortBy('timestamp');            // en el orden en que ocurrieron
      const lote = pendientes.slice(0, TAMANO_LOTE);
      if (!lote.length) break;

      const payload = lote.map(({ id, carnet, dia, puerta, timestamp }) =>
        ({ id, carnet, dia, puerta, timestamp }));

      const { data, error } = await supabase.rpc('sincronizar_checkins_offline', {
        p_checkins: payload
      });
      if (data?.status !== 'OK') {
        return { ok: false, enviados, error: 'Respuesta inesperada: ' + JSON.stringify(data) };
      }

      // El servidor responde por lote: cuántos insertó y cuántos rechazó como duplicados
      const estado =
        data.insertados === lote.length ? 'aceptado' :
        data.duplicados_rechazados === lote.length ? 'duplicado' :
        'procesado'; // lote mixto: el servidor no dice cuál es cuál

      await db.cola_checkins.bulkUpdate(lote.map(c => ({
        key: c.id,
        changes: { sincronizado: 1, estado }
      })));
      enviados += lote.length;
    }
    return { ok: true, enviados };
  } catch (e) {
    return { ok: false, enviados, error: e.message };
  } finally {
    enCurso = false;
  }
}

// Disparadores de respaldo (para cuando Background Sync no existe, como en iOS)
export function iniciarSincronizacion() {
  const alVolver = () => { if (document.visibilityState === 'visible') sincronizarCola(); };
  window.addEventListener('online', sincronizarCola);
  document.addEventListener('visibilitychange', alVolver);
  const timer = setInterval(sincronizarCola, 30000);
  sincronizarCola();
  return () => {
    window.removeEventListener('online', sincronizarCola);
    document.removeEventListener('visibilitychange', alVolver);
    clearInterval(timer);
  };
}