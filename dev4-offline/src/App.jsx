import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, registrarCheckin } from './db';
import { sincronizarCola, iniciarSincronizacion } from './sync/sync';
import { verificarQr } from './qr/verificarQr';
import { TOKEN_VALIDO, TOKEN_VENCIDO } from './qr/tokensPrueba';

const CARNET_PRUEBA = '2026-0001';
const DIA_PRUEBA = 2;

export default function App() {
  const [log, setLog] = useState([]);
  const cola = useLiveQuery(() => db.cola_checkins.toArray(), []);

  // La sincronización corre sola: al volver la conexión, al volver a la app y cada 30 s
  useEffect(() => iniciarSincronizacion(), []);

  async function probar() {
    await db.estudiantes.clear();
    await db.cola_checkins.clear();
    await db.estudiantes.bulkPut([
      { carnet: CARNET_PRUEBA, nombre: 'Estudiante de prueba', dia1: false, dia2: false }
    ]);
    const r1 = await registrarCheckin(CARNET_PRUEBA, DIA_PRUEBA, 3);
    const r2 = await registrarCheckin(CARNET_PRUEBA, DIA_PRUEBA, 3);
    setLog([
      'Primer escaneo: ' + JSON.stringify(r1),
      'Segundo escaneo: ' + JSON.stringify(r2)
    ]);
  }

  async function sincronizar() {
    const res = await sincronizarCola();
    setLog(['Sincronización: ' + JSON.stringify(res)]);
  }

  async function probarQr() {
    const a = await verificarQr(TOKEN_VALIDO);
    const b = await verificarQr(TOKEN_VENCIDO);
    const c = await verificarQr(TOKEN_VALIDO.slice(0, -5) + 'abcde');
    setLog([
      'Válido: ' + JSON.stringify(a),
      'Vencido: ' + JSON.stringify(b),
      'Alterado: ' + JSON.stringify(c)
    ]);
  }

  async function reiniciar() {
    await db.estudiantes.clear();
    await db.cola_checkins.clear();
    setLog([]);
  }

  return (
    <div style={{ padding: 24, textAlign: 'left' }}>
      <h1>Prueba de base local</h1>
      <button onClick={probar}>Probar dos escaneos</button>{' '}
      <button onClick={sincronizar}>Sincronizar ahora</button>{' '}
      <button onClick={probarQr}>Probar QR</button>{' '}
      <button onClick={reiniciar}>Reiniciar</button>
      <pre>{log.join('\n')}</pre>
      <h3>Cola en vivo</h3>
      <pre>{JSON.stringify(cola, null, 2)}</pre>
    </div>
  );
}