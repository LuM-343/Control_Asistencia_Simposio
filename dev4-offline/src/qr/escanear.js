import { verificarQr } from './verificarQr';
import { registrarCheckin } from '../db';

// Funcion que llamara la pantalla de escaneo (Dev 3) con el texto leido del QR.
// Devuelve: { ok: true, carnet } | { ok: false, motivo, carnet? }
// motivos: qr_invalido | qr_vencido | no_encontrado | ya_ingresado
export async function procesarEscaneo(token, dia, puerta) {
  const v = await verificarQr(token);
  if (!v.ok) return { ok: false, motivo: v.motivo };
  const r = await registrarCheckin(v.carnet, dia, puerta);
  return { ...r, carnet: v.carnet };
}
