import Dexie from 'dexie';

export const db = new Dexie('simposio');

db.version(1).stores({
  estudiantes: 'carnet, nombre',
  cola_checkins: 'id, carnet, dia, sincronizado'
});

// Registra un ingreso en el celular. Funciona sin internet.
// Devuelve { ok: true, nombre } | { ok: false, motivo: 'no_encontrado' | 'ya_ingresado', nombre? }
export function registrarCheckin(carnet, dia, puerta, staffId = null) {
  return db.transaction('rw', db.estudiantes, db.cola_checkins, async () => {
    const est = await db.estudiantes.get(carnet);
    if (!est) return { ok: false, motivo: 'no_encontrado' };
    if (est[`dia${dia}`]) return { ok: false, motivo: 'ya_ingresado', nombre: est.nombre };

    await db.estudiantes.update(carnet, { [`dia${dia}`]: true });
    await db.cola_checkins.add({
      id: crypto.randomUUID(),
      carnet, dia, puerta,
      staff_id: staffId || null,
      timestamp: new Date().toISOString(),
      sincronizado: 0
    });
    return { ok: true, nombre: est.nombre };
  });
}

// Guarda el padrón en el celular sin perder los ingresos ya marcados aquí.
// ingresos: [{ carnet, dia }] ya registrados en el servidor (otras puertas).
export async function cargarPadron(lista, ingresos = []) {
  const yaEntro = new Set(ingresos.map(i => `${i.carnet}-${i.dia}`));
  await db.transaction('rw', db.estudiantes, async () => {
    const actuales = await db.estudiantes.bulkGet(lista.map(e => e.carnet));
    const filas = lista.map((e, i) => ({
      carnet: e.carnet,
      nombre: e.nombre,
      dia1: Boolean(actuales[i]?.dia1 || yaEntro.has(`${e.carnet}-1`)),
      dia2: Boolean(actuales[i]?.dia2 || yaEntro.has(`${e.carnet}-2`)),
    }));
    await db.estudiantes.bulkPut(filas);
  });
}

// Borra todo lo guardado en el celular. Solo se permite si no hay ingresos sin enviar.
export async function borrarDatosLocales() {
  const pendientes = await db.cola_checkins.where('sincronizado').equals(0).count();
  if (pendientes > 0) return { ok: false, pendientes };
  await db.transaction('rw', db.estudiantes, db.cola_checkins, async () => {
    await db.estudiantes.clear();
    await db.cola_checkins.clear();
  });
  return { ok: true };
}
