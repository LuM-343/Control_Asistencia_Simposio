-- ============================================================================
-- TESTS/SEED_MOCK_DATA.SQL
-- Datos Sintéticos de Prueba y Validaciones Unitarias
-- XIX Simposio de Ingeniería - Dev 2
-- ============================================================================

-- 1. LIMPIEZA PREVIA PARA ENTORNO DE PRUEBAS
TRUNCATE TABLE public.checkins_asistencia RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tesoreria_pagos CASCADE;
TRUNCATE TABLE public.padron_estudiantes CASCADE;

UPDATE public.inventario_tickets 
SET tickets_entregados = 0 
WHERE dia IN (1, 2);

-- ----------------------------------------------------------------------------
-- 2. SIEMBRA DE DATOS MOCK
-- ----------------------------------------------------------------------------

-- Estudiantes representativos de la facultad
INSERT INTO public.padron_estudiantes (carnet, nombre_oficial, correo_institucional, carrera, semestre)
VALUES
    ('2021001', 'Juan Carlos Perez Gomez', 'juan.perez@ingenieria.edu', 'Ingeniería en Ciencias y Sistemas', '7mo'),
    ('2021002', 'Maria Rene Morales Lopez', 'maria.morales@ingenieria.edu', 'Ingeniería Industrial', '5to'),
    ('2021003', 'Carlos Eduardo Lopez Juarez', 'carlos.lopez@ingenieria.edu', 'Ingeniería Civil', '9no')
ON CONFLICT (carnet) DO NOTHING;

-- Boletas de prueba categorizadas por zonas
INSERT INTO public.tesoreria_pagos (boleta, nombre_digitado, monto, carnet_asignado, zona, estado, datos_extra)
VALUES
    -- Caso Zona Verde (Conciliado automático)
    ('BOL-1001', 'Juan Perez', 50.00, '2021001', 'VERDE', 'CONCILIADO', '{"agencia": "Central", "cajero": "Caja 3"}'::jsonb),
    -- Caso Zona Amarilla (Requiere resolución en portal de autogestión)
    ('BOL-2002', 'Maria Morales', 50.00, NULL, 'AMARILLA', 'NO_CONCILIADO', '{"k": 2, "motivo": "homonimos"}'::jsonb),
    -- Caso Zona Roja (Sin coincidencia, atención presencial)
    ('BOL-9999', 'Estudiante Desconocido', 50.00, NULL, 'ROJA', 'NO_CONCILIADO', '{"k": 5}'::jsonb)
ON CONFLICT (boleta) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. PRUEBAS UNITARIAS DE PROCEDIMIENTOS RPC
-- ----------------------------------------------------------------------------

-- Test 1: Check-in exitoso en puerta (Dev 3)
SELECT public.registrar_checkin_atomico('2021001', 1, 'Puerta 1', 'operador_juan');

-- Test 2: Intento de reingreso con carné ya acreditado (Dev 3)
SELECT public.registrar_checkin_atomico('2021001', 1, 'Puerta 2', 'operador_luis');

-- Test 3: Carné inexistente en padrón (Dev 3)
SELECT public.registrar_checkin_atomico('9999999', 1, 'Puerta 3', 'operador_ana');

-- Test 4: Sincronización offline en lote con tolerancia a carnés inválidos (Dev 4)
SELECT public.sincronizar_checkins_offline('[
  {"carnet": "2021003", "dia": 1, "puerta": "3", "staff_id": "pwa_off", "hora_checkin": "2026-10-08T19:30:00Z"},
  {"carnet": "2021001", "dia": 1, "puerta": "Puerta 1", "staff_id": "pwa_off", "hora_checkin": "2026-10-08T19:31:00Z"},
  {"carnet": "9999999", "dia": 1, "puerta": "Puerta 2", "staff_id": "pwa_off", "hora_checkin": "2026-10-08T19:32:00Z"}
]'::jsonb);

-- Test 5: Desempate de excepción de Zona Amarilla desde portal web (Dev 4)
SELECT public.resolver_excepcion_estudiante('2021002', 'BOL-2002');

-- Test 6: Mesa de resolución de problemas en laptop (Dev 5)
SELECT public.resolver_checkin_manual(
    '2021002', 
    'BOL-2002', 
    1, 
    'operador_mesa_1', 
    'Boleta física cotejada presencialmente'
);

-- Test 7: Comprobar vista consolidada de Coordinación
SELECT * FROM public.vista_asistencia_coordinacion;