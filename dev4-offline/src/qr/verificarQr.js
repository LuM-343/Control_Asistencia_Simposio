import { importSPKI, jwtVerify } from 'jose';
import clavePublicaPem from './public_key.pem?raw';

const ISSUER = 'simposio-ing-xix';
let clave = null;

// Verifica la firma (RS256) y el vencimiento del QR sin necesitar internet.
// Solo usa la clave PUBLICA: no hay ningun secreto en el celular.
export async function verificarQr(token) {
  try {
    clave ??= await importSPKI(clavePublicaPem.trim(), 'RS256');
    const { payload } = await jwtVerify(token, clave, {
      issuer: ISSUER,
      algorithms: ['RS256'],
    });
    return { ok: true, carnet: String(payload.sub), jti: payload.jti };
  } catch (e) {
    return { ok: false, motivo: e.code === 'ERR_JWT_EXPIRED' ? 'qr_vencido' : 'qr_invalido' };
  }
}
