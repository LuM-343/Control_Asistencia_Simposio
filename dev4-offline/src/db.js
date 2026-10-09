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
