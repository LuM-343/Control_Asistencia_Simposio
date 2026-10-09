'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'TU_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Asistente {
  carnet: string;
  nombre: string;
  boleta: string;
  zona: 'VERDE' | 'AMARILLA' | 'ROJA';
  estado: string;
}

// Datos de contingencia en caso de que la tabla en Supabase no tenga registros aún
const mockData: Asistente[] = [
  { carnet: '1500123', nombre: 'Carlos Pérez Gómez', boleta: 'BOL-8841', zona: 'VERDE', estado: 'Pendiente' },
  { carnet: '1500456', nombre: 'María López Estrada', boleta: 'BOL-9021', zona: 'AMARILLA', estado: 'Inconsistencia' },
  { carnet: '1500789', nombre: 'Juan Hernández Ruiz', boleta: 'BOL-1102', zona: 'ROJA', estado: 'No Encontrado' },
];

export default function MesaResolucion() {
  const [data, setData] = useState<Asistente[]>(mockData);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviandoCorreos, setEnviandoCorreos] = useState(false);
  const [selectedCarnet, setSelectedCarnet] = useState<string | null>(null);
  const [boleta, setBoleta] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Consulta en vivo a la tabla tesoreria_pagos de Supabase
  const cargarDatosSupabase = async () => {
    try {
      const { data: registros, error } = await supabase
        .from('tesoreria_pagos')
        .select('boleta, nombre_digitado, carnet_asignado, zona, estado');

      if (error) {
        console.warn('Aviso al consultar Supabase:', error.message);
        return;
      }

      if (registros && registros.length > 0) {
        const mapeados: Asistente[] = registros.map((r) => ({
          carnet: r.carnet_asignado || 'Sin asignar',
          nombre: r.nombre_digitado || 'Sin nombre',
          boleta: r.boleta,
          zona: (r.zona as 'VERDE' | 'AMARILLA' | 'ROJA') || 'ROJA',
          estado: r.estado || 'Pendiente',
        }));
        setData(mapeados);
      }
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
    }
  };

  useEffect(() => {
    cargarDatosSupabase();
  }, []);

  // Búsqueda en memoria predictiva (<100ms)
  const filteredData = useMemo(() => {
    if (!globalFilter) return data;
    const lower = globalFilter.toLowerCase();
    return data.filter(
      (item) =>
        item.carnet.toLowerCase().includes(lower) ||
        item.nombre.toLowerCase().includes(lower) ||
        item.boleta.toLowerCase().includes(lower)
    );
  }, [data, globalFilter]);

  // Ejecución de la RPC atómica de Manuel
  const handleResolverCheckin = async () => {
    if (!selectedCarnet || !justificacion) {
      alert('Debes ingresar la justificación y seleccionar el carné.');
      return;
    }

    setLoading(true);
    setMensaje(null);

    const { error } = await supabase.rpc('resolver_checkin_manual', {
      p_carnet: selectedCarnet,
      p_boleta: boleta,
      p_dia: 1,
      p_operador: 'Mesa-Resolucion-01',
      p_justificacion: justificacion,
    });

    setLoading(false);

    if (error) {
      setMensaje(`Error al autorizar: ${error.message}`);
    } else {
      setMensaje(`Check-in manual registrado exitosamente para ${selectedCarnet}.`);
      setSelectedCarnet(null);
      setJustificacion('');
      setBoleta('');
      // Refrescar datos tras resolución
      cargarDatosSupabase();
    }
  };

  // Disparador del despacho masivo
  const handleDespachoMasivo = async () => {
    if (!confirm('¿Iniciar el despacho masivo de correos a la Zona Verde?')) return;

    setEnviandoCorreos(true);
    setMensaje('Iniciando despacho masivo...');

    try {
      const res = await fetch('/api/despacho-verde', { method: 'POST' });
      const resultado = await res.json();

      if (res.ok) {
        setMensaje(`¡Despacho finalizado! Se procesaron ${resultado.totalProcesados} correos.`);
      } else {
        setMensaje(`Error en el despacho: ${resultado.error}`);
      }
    } catch (err) {
      setMensaje('Ocurrió un error al contactar el servicio de correos.');
    } finally {
      setEnviandoCorreos(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Mesa de Resolución de Incidencias (Contingencia)
        </h1>
        <button
          onClick={handleDespachoMasivo}
          disabled={enviandoCorreos}
          className={`px-4 py-2 rounded text-sm font-bold text-white shadow transition ${
            enviandoCorreos ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {enviandoCorreos ? 'Enviando QRs...' : '🚀 Despacho Masivo (Zona Verde)'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Búsqueda predictiva (Carné, Nombre o Folio de Boleta):
        </label>
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Escribe para filtrar instantáneamente..."
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
          autoFocus
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Carné</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Nombre Completo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Boleta de Pago</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Zona</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.map((row) => (
              <tr key={row.boleta} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700 font-mono">{row.carnet}</td>
                <td className="px-4 py-2 text-gray-700">{row.nombre}</td>
                <td className="px-4 py-2 text-gray-700 font-mono">{row.boleta}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      row.zona === 'VERDE'
                        ? 'bg-green-100 text-green-800'
                        : row.zona === 'AMARILLA'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {row.zona}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => {
                      setSelectedCarnet(row.carnet);
                      setBoleta(row.boleta);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                  >
                    Resolver
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No se encontraron coincidencias.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCarnet && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300 space-y-3">
          <h2 className="text-lg font-bold text-yellow-900">
            Autorizar Check-in Manual: {selectedCarnet}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">No. Boleta Bancaria:</label>
              <input
                type="text"
                value={boleta}
                onChange={(e) => setBoleta(e.target.value)}
                className="w-full p-2 border rounded text-black font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Justificación (Auditoría):</label>
              <input
                type="text"
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Ej. Comprobante físico validado en mesa"
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResolverCheckin}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold"
            >
              {loading ? 'Procesando...' : 'Confirmar e Ingresar'}
            </button>
            <button
              onClick={() => setSelectedCarnet(null)}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded font-medium">
          {mensaje}
        </div>
      )}
    </div>
  );
}