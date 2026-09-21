import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser, getAdminClientOrSession } from '@/lib/admin/auth'
import { generateContractData } from '@/lib/contracts/contractEngine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Falta bookingId' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAuthorized = isAdminUser({
      id: user.id,
      email: user.email,
      role: profile?.role,
      user_metadata: user.user_metadata
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const clientToUse = getAdminClientOrSession(supabase)

    const { data: booking, error: bookingErr } = await clientToUse
      .from('bookings')
      .select(`
        *,
        campers (*),
        users (*)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    const contract = generateContractData(booking, booking.users, booking.campers)

    // Render contract as printable HTML
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato de Alquiler · ${contract.contractNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: auto; line-height: 1.5; font-size: 14px; }
    .header { border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 22px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; }
    .contract-tag { font-size: 13px; font-weight: 700; color: #4b5563; background: #f3f4f6; padding: 4px 10px; border-radius: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .card-title { font-weight: 700; font-size: 13px; text-transform: uppercase; color: #16a34a; margin-bottom: 8px; }
    .field { margin-bottom: 4px; }
    .field strong { color: #374151; font-size: 12px; }
    .clauses { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #4b5563; }
    .clauses ol { padding-left: 20px; margin: 0; }
    .clauses li { margin-bottom: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; }
    .sig-box { border-top: 1px dashed #9ca3af; padding-top: 10px; font-size: 12px; color: #6b7280; }
    @media print {
      body { padding: 0; font-size: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Imprimir / Guardar PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="logo">UTOPIA VAN LIFE</div>
      <div style="font-size: 12px; color: #6b7280;">Alquiler de Campers Premium en Mallorca</div>
    </div>
    <div style="text-align: right;">
      <div class="contract-tag">${contract.contractNumber}</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Fecha: ${contract.generatedAt}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Arrendador (Empresa)</div>
      <div class="field"><strong>Empresa:</strong> ${contract.lessor.companyName}</div>
      <div class="field"><strong>CIF:</strong> ${contract.lessor.cif}</div>
      <div class="field"><strong>Dirección:</strong> ${contract.lessor.address}</div>
      <div class="field"><strong>Email:</strong> ${contract.lessor.email}</div>
      <div class="field"><strong>Teléfono:</strong> ${contract.lessor.phone}</div>
    </div>

    <div class="card">
      <div class="card-title">Arrendatario (Cliente)</div>
      <div class="field"><strong>Nombre:</strong> ${contract.lessee.fullName}</div>
      <div class="field"><strong>DNI / NIE:</strong> ${contract.lessee.dniNie}</div>
      <div class="field"><strong>Nº Carnet:</strong> ${contract.lessee.driverLicenseId}</div>
      <div class="field"><strong>Email:</strong> ${contract.lessee.email}</div>
      <div class="field"><strong>Teléfono:</strong> ${contract.lessee.phone}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Vehículo Asignado</div>
      <div class="field"><strong>Modelo:</strong> ${contract.vehicle.modelName}</div>
      <div class="field"><strong>Tipo:</strong> ${contract.vehicle.vehicleType}</div>
      <div class="field"><strong>Capacidad:</strong> ${contract.vehicle.capacity}</div>
      <div class="field"><strong>Matrícula:</strong> ${contract.vehicle.plateNumber}</div>
    </div>

    <div class="card">
      <div class="card-title">Periodo y Tarifas</div>
      <div class="field"><strong>Recogida:</strong> ${contract.booking.startDate} a las ${contract.booking.pickupTime}h</div>
      <div class="field"><strong>Devolución:</strong> ${contract.booking.endDate} a las ${contract.booking.dropoffTime}h</div>
      <div class="field"><strong>Lugar:</strong> ${contract.booking.pickupLocation}</div>
      <div class="field" style="margin-top: 8px;"><strong>Total Alquiler:</strong> <span style="color: #16a34a; font-weight: 700; font-size: 15px;">${contract.pricing.totalPrice} €</span></div>
      <div class="field"><strong>Fianza Obligatoria:</strong> ${contract.pricing.depositAmount} €</div>
    </div>
  </div>

  <div class="clauses">
    <div class="card-title" style="margin-bottom: 10px;">Cláusulas del Contrato de Alquiler</div>
    <ol>
      ${contract.clauses.map(c => `<li>${c}</li>`).join('')}
    </ol>
  </div>

  <div class="signatures">
    <div class="sig-box">
      Firma del Arrendador<br>
      <strong>Utopia Van Life S.L.</strong>
    </div>
    <div class="sig-box">
      Firma del Arrendatario (Conductor)<br>
      <strong>${contract.lessee.fullName}</strong>
    </div>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })

  } catch (error: any) {
    console.error('Contract API Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}