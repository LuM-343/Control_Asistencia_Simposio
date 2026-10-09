// ============================================================================
// TESTS/TEST_CONCURRENCIA.JS
// Validación de Concurrencia Transaccional y Bloqueo Anti-Fraude (Checkpoint 1)
// XIX Simposio de Ingeniería - Dev 2
// ============================================================================

import { createClient } from '@supabase/supabase-js'

// Tomar credenciales de entorno o colocar las de prueba del equipo
const SUPABASE_URL = process.env.SUPABASE_URL || 'TU_PROJECT_URL'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'TU_ANON_KEY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function probarConcurrencia() {
  const CARNET_PRUEBA = '2021001'
  const DIA = 1
  const TOTAL_INTENTOS = 15

  console.log(`\n======================================================`)
  console.log(`[TEST INICIADO] Disparando ${TOTAL_INTENTOS} peticiones concurrentes`)
  console.log(`Carné evaluado: ${CARNET_PRUEBA} | Jornada: Día ${DIA}`)
  console.log(`======================================================\n`)

  // Construir 15 llamadas simultáneas simulando distintas puertas y operadores
  const promesas = Array.from({ length: TOTAL_INTENTOS }, (_, i) => {
    return supabase.rpc('registrar_checkin_atomico', {
      p_carnet: CARNET_PRUEBA,
      p_dia: DIA,
      p_puerta: `Puerta ${(i % 5) + 1}`,
      p_staff_id: `operador_${i + 1}`
    })
  })

  // Ejecución en paralelo estricto
  const resultados = await Promise.all(promesas)

  let exitos = 0
  let alertasDuplicado = 0
  let errores = 0

  resultados.forEach((res, index) => {
    if (res.error) {
      console.error(`Petición #${index + 1}: [ERROR RED/SQL] ->`, res.error.message)
      errores++
    } else {
      const { status, code, mensaje } = res.data
      console.log(`Petición #${index + 1}: [${status}] ${code} - ${mensaje}`)
      if (status === 'OK') exitos++
      if (status === 'ALERTA') alertasDuplicado++
    }
  })

  console.log(`\n------------------------------------------------------`)
  console.log(`BALANCE FINAL DE LA PRUEBA DE ESTRÉS`)
  console.log(`------------------------------------------------------`)
  console.log(`Accesos concedidos             (esperado: 1): ${exitos}`)
  console.log(`Intentos bloqueados duplicados (esperado: ${TOTAL_INTENTOS - 1}): ${alertasDuplicado}`)
  console.log(`Errores inesperados            (esperado: 0): ${errores}`)

  // Comprobar inventario en base de datos
  const { data: inventario, error: invError } = await supabase
    .from('inventario_tickets')
    .select('dia, tickets_totales, tickets_entregados')
    .eq('dia', DIA)
    .single()

  if (invError) {
    console.error('Error al consultar saldo de tickets:', invError.message)
  } else {
    console.log(`Estado del lote en inventario:`, inventario)
    if (exitos === 1 && alertasDuplicado === (TOTAL_INTENTOS - 1) && inventario.tickets_entregados === 1) {
      console.log(`\n>>> RESULTADO: CHECKPOINT 1 APROBADO EXITOSAMENTE <<<\n`)
    } else {
      console.log(`\n>>> ATENCIÓN: Descuadre detectado en la prueba <<<\n`)
    }
  }
}

probarConcurrencia()