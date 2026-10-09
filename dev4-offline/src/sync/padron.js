import { supabase } from './supabase';
import { cargarPadron } from '../db';
import { guardarAjustes, leerAjustes } from '../config';

const PAGINA = 1000; // Supabase devuelve como máximo 1000 filas por consulta

async function traerTodo(tabla, columnas) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase.from(tabla).select(columnas).range(desde, desde + PAGINA - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < PAGINA) return filas;
  }
}

// Descarga el padrón y los ingresos ya registrados, y los guarda en el celular.
export async function descargarPadron() {
  const padron = await traerTodo('padron_estudiantes', 'carnet, nombre_oficial');
  const lista = padron.map(e => ({
    carnet: String(e.carnet),
    nombre: e.nombre_oficial ?? '',
  }));

  let ingresos = [];
  try {
    const ch = await traerTodo('checkins_asistencia', 'carnet, dia');
    ingresos = ch.map(c => ({ carnet: String(c.carnet), dia: Number(c.dia) }));
  } catch (e) {
    console.warn('No se pudieron leer los ingresos del servidor:', e.message);
  }

  await cargarPadron(lista, ingresos);
  guardarAjustes({ ultimaDescarga: new Date().toISOString() });
  return { estudiantes: lista.length, ingresos: ingresos.length };
}

const CADA_MINUTOS = 10;
let actualizando = false;

// Descarga el padrón solo si hay internet y la última descarga tiene más de 10 minutos.
// No lanza errores: si falla, se intenta en la siguiente oportunidad.
export async function actualizarPadronSiHaceFalta() {
  const { ultimaDescarga } = leerAjustes();
  const vieja = !ultimaDescarga || Date.now() - new Date(ultimaDescarga).getTime() > CADA_MINUTOS * 60000;
  if (!navigator.onLine || !vieja || actualizando) return null;
  actualizando = true;
  try {
    return await descargarPadron();
  } catch (e) {
    console.warn('No se pudo actualizar el padrón:', e.message);
    return null;
  } finally {
    actualizando = false;
  }
}
