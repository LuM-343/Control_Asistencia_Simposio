// Ajustes de este celular: quién opera, en qué puerta y qué día.
// Se guardan en el propio dispositivo para que sigan ahí sin internet.
const CLAVE = 'simposio-ajustes';
const PREDETERMINADO = { staffId: '', puerta: '1', dia: 1, ultimaDescarga: null };

export function leerAjustes() {
  try {
    return { ...PREDETERMINADO, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { ...PREDETERMINADO };
  }
}

export function guardarAjustes(cambios) {
  const nuevos = { ...leerAjustes(), ...cambios };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  } catch {
    // Sin almacenamiento disponible: los ajustes solo duran mientras la app esté abierta
  }
  return nuevos;
}
