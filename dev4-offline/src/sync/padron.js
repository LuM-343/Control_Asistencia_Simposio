import { supabase } from './supabase';
import { cargarPadron } from '../db';

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
  const padron = await traerTodo('padron_estudiantes', '*');
  const lista = padron.map(e => ({
    carnet: String(e.carnet),
    nombre: e.nombre ?? e.nombre_completo ?? '',
  }));

  let ingresos = [];
  try {
    const ch = await traerTodo('checkins_asistencia', 'carnet, dia');
    ingresos = ch.map(c => ({ carnet: String(c.carnet), dia: Number(c.dia) }));
  } catch (e) {
    console.warn('No se pudieron leer los ingresos del servidor:', e.message);
  }

  await cargarPadron(lista, ingresos);
  return { estudiantes: lista.length, ingresos: ingresos.length };
}
