import { useState } from 'react';
import { db, registrarCheckin } from './db';
import { sincronizarCola } from './sync/sync';
import { verificarQr } from './qr/verificarQr';
import { TOKEN_VALIDO, TOKEN_VENCIDO } from './qr/tokensPrueba';

export default function App() {
  const [log, setLog] = useState([]);

  async function probar() {
    await db.estudiantes.clear();
    await db.cola_checkins.clear();
    await db.estudiantes.bulkPut([
      { carnet: '2021001', nombre: 'Ana María López Hernández', dia1: false, dia2: false }
    ]);
    const r1 = await registrarCheckin('2021001', 2, 3);
    const r2 = await registrarCheckin('2021001', 2, 3);
    const cola = await db.cola_checkins.toArray();
    setLog([
      'Primer escaneo: ' + JSON.stringify(r1),
      'Segundo escaneo: ' + JSON.stringify(r2),
      'Cola: ' + JSON.stringify(cola, null, 2)
    ]);
  }

  async function sincronizar() {
    const res = await sincronizarCola();
    const cola = await db.cola_checkins.toArray();
    setLog([
      'Sincronización: ' + JSON.stringify(res),
      'Cola: ' + JSON.stringify(cola, null, 2)
    ]);
  }

  async function reiniciar() {
    await db.estudiantes.clear();
    await db.cola_checkins.clear();
    setLog([]);
  }
  
  async function probarQr() {
    const a = await verificarQr(TOKEN_VALIDO);
    const b = await verificarQr(TOKEN_VENCIDO);
    const c = await verificarQr(TOKEN_VALIDO.slice(0, -5) + 'abcde'); // firma alterada
    setLog([
      'Válido: ' + JSON.stringify(a),
      'Vencido: ' + JSON.stringify(b),
      'Alterado: ' + JSON.stringify(c)
    ]);
  }

  return (
    <div style={{ padding: 24, textAlign: 'left' }}>
      <h1>Prueba de base local</h1>
      <button onClick={probar}>Probar dos escaneos</button>{' '}
      <button onClick={sincronizar}>Sincronizar ahora</button>{' '}
      <button onClick={reiniciar}>Reiniciar</button>
      <button onClick={probarQr}>Probar QR</button>{' '}
      <pre>{log.join('\n')}</pre>
    </div>
  );
}