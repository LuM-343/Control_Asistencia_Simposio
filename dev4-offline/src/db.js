import Dexie from 'dexie';

export const db = new Dexie('simposio');

db.version(1).stores({
  estudiantes: 'carnet, nombre',
  cola_checkins: 'id, carnet, dia, sincronizado'
});

export function registrarCheckin(carnet, dia, puerta) {
  return db.transaction('rw', db.estudiantes, db.cola_checkins, async () => {
    const est = await db.estudiantes.get(carnet);
    if (!est) return { ok: false, motivo: 'no_encontrado' };
    if (est[`dia${dia}`]) return { ok: false, motivo: 'ya_ingresado' };

    await db.estudiantes.update(carnet, { [`dia${dia}`]: true });
    await db.cola_checkins.add({
      id: crypto.randomUUID(),
      carnet, dia, puerta,
      timestamp: new Date().toISOString(),
      sincronizado: 0
    });
    return { ok: true };
  });
}

// Carga la lista del servidor SIN borrar los ingresos ya marcados en este celular
export async function cargarPadron(lista) {
  await db.transaction('rw', db.estudiantes, async () => {
    const locales = await db.estudiantes.bulkGet(lista.map(e => e.carnet));
    await db.estudiantes.bulkPut(lista.map((e, i) => ({
      ...e,
      dia1: locales[i]?.dia1 || e.dia1 || false,
      dia2: locales[i]?.dia2 || e.dia2 || false
    })));
  });
}