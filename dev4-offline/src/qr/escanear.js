import { verificarQr } from './verificarQr';
import { registrarCheckin } from '../db';
import { leerAjustes } from '../config';

// Función que llama la pantalla de escaneo (Dev 3) con el texto leído del QR.
// Si no se indican día, puerta o staff, usa los ajustes guardados en el celular.
// Devuelve: { ok: true, carnet, nombre } | { ok: false, motivo, carnet?, nombre? }
// motivos: qr_invalido | qr_vencido | no_encontrado | ya_ingresado
export async function procesarEscaneo(token, dia, puerta, staffId) {
  const a = leerAjustes();
  const v = await verificarQr(String(token ?? '').trim());
  if (!v.ok) return { ok: false, motivo: v.motivo };
  const r = await registrarCheckin(v.carnet, Number(dia ?? a.dia), String(puerta ?? a.puerta), staffId ?? a.staffId);
  return { ...r, carnet: v.carnet };
}
