import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import QRCode from 'qrcode';

// Inicializa Resend con la clave del .env.local
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// Mock de estudiantes en ZONA VERDE (En prod, esto se trae con Supabase)
const estudiantesVerde = [
  { carnet: '1500123', nombre: 'Carlos Perez', email: 'carlos@ejemplo.com', tokenQR: 'eyJhbGci...TokenFalso1' },
  { carnet: '1500124', nombre: 'Ana Gomez', email: 'ana@ejemplo.com', tokenQR: 'eyJhbGci...TokenFalso2' }
];

// Función auxiliar para esperar y no saturar la API (Rate Limiting)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(request: Request) {
  try {
    const reportes = [];

    for (const estudiante of estudiantesVerde) {
      // 1. Generar la imagen del QR en base64 usando el token del Dev 1
      const qrDataUrl = await QRCode.toDataURL(estudiante.tokenQR, { margin: 1, width: 250 });

      // 2. Enviar el correo electrónico vía Resend
      const { data, error } = await resend.emails.send({
        from: 'Simposio Ingenieria <no-reply@simposio.dev>', // Debe ser un dominio validado en Resend
        to: [estudiante.email],
        subject: `Tu Gafete de Acceso - Simposio de Ingeniería`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <h2>¡Hola, ${estudiante.nombre}!</h2>
            <p>Tu acreditación para el Simposio de Ingeniería ha sido validada (<strong>ZONA VERDE</strong>).</p>
            <p>Presenta el siguiente código QR en la entrada del evento:</p>
            <img src="${qrDataUrl}" alt="Código QR de Acceso" style="border: 2px solid #ccc; padding: 10px; border-radius: 8px;" />
            <p style="font-size: 12px; color: #777;">Carné: ${estudiante.carnet}</p>
          </div>
        `,
      });

      if (error) {
        reportes.push({ carnet: estudiante.carnet, status: 'error', detalle: error.message });
      } else {
        reportes.push({ carnet: estudiante.carnet, status: 'enviado', id: data?.id });
      }

      // 3. Pausa de 100ms entre correos para no exceder límites de envío (Rate Limit)
      await delay(100); 
    }

    return NextResponse.json({
      mensaje: 'Despacho masivo finalizado',
      totalProcesados: estudiantesVerde.length,
      resultados: reportes
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Fallo catastrófico en el script', detalle: err.message }, { status: 500 });
  }
}