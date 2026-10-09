import { db } from '../db';
import { supabase } from './supabase';

const TAMANO_LOTE = 50;
let enCurso = false; // evita dos sincronizaciones a la vez

// Convierte un check-in local al formato que espera la función de Dev 2
const aPayload = ({ carnet, dia, puerta, timestamp, staff_id }) => ({
  carnet, dia, puerta: String(puerta), hora_checkin: timestamp, staff_id
});

async function enviar(lote) {
  const { data, error } = await supabase.rpc('sincronizar_checkins_offline', {
    p_checkins: lote.map(aPayload)
  });
  if (error) throw new Error(error.message);
  if (data?.status !== 'OK') throw new Error('Respuesta inesperada: ' + JSON.stringify(data));

  const r = {
    insertados: data.insertados ?? 0,
    duplicados: data.duplicados_rechazados ?? 0,
    invalidos: data.invalidos ?? 0
  };
  if (r.insertados + r.duplicados + r.invalidos !== lote.length) {
    throw new Error('El servidor no confirmó todos los check-ins: ' + JSON.stringify(data));
  }
  return r;
}

const marcar = (lote, estado) =>
  db.cola_checkins.bulkUpdate(lote.map(c => ({ key: c.id, changes: { sincronizado: 1, estado } })));

export async function sincronizarCola() {
  if (enCurso || !navigator.onLine) return { omitido: true };
  enCurso = true;
  let enviados = 0;
  try {
    while (true) {
      const pendientes = await db.cola_checkins
        .where('sincronizado').equals(0)
        .sortBy('timestamp'); // en el orden en que ocurrieron
      const lote = pendientes.slice(0, TAMANO_LOTE);
      if (!lote.length) break;

      const r = await enviar(lote);
      if (r.invalidos === 0) {
        await marcar(lote, r.duplicados === 0 ? 'aceptado' : r.insertados === 0 ? 'duplicado' : 'procesado');
      } else if (lote.length === 1) {
        await marcar(lote, 'invalido'); // el carné no está en el padrón
      } else {
        // Hay al menos un inválido: se reenvían de uno en uno para saber cuál es
        for (const c of lote) {
          const u = await enviar([c]);
          await marcar([c], u.invalidos ? 'invalido' : 'procesado');
        }
      }
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
