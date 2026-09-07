import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/auth'
import { generateContractData } from '@/lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'
import { ContractTemplateData } from '@/lib/contracts/templateTypes'

async function verifyAdminAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'No autorizado', status: 401 }
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
    return { authorized: false, error: 'Acceso denegado. Se requieren permisos de administrador.', status: 403 }
  }

  return { authorized: true, user }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminAuth()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const templateOverride: Partial<ContractTemplateData> = body?.template || body || {}

    // Datos simulados realistas para la previsualización del administrador
    const mockBooking = {
      id: 'PREVIEW-SAMPLE-2026',
      start_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
      pickup_time: templateOverride.terms?.pickupWindow ? templateOverride.terms.pickupWindow.split('-')[0].trim() : '10:00',
      dropoff_time: templateOverride.terms?.dropoffWindow ? templateOverride.terms.dropoffWindow.split('-')[0].trim() : '18:00',
      pickup_location: 'Palma de Mallorca (Base Utopia Son Oms / Aeropuerto PMI)',
      dropoff_location: 'Palma de Mallorca (Base Utopia Son Oms / Aeropuerto PMI)',
      total_price: 1120,
      extras: ['Seguro a todo riesgo', 'Menaje completo premium', 'Kit cama y toallas', '2 Máscaras de snorkel'],
      customer_name: 'Alejandro Martínez Silva',
      customer_email: 'alejandro.martinez@ejemplo.com',
      customer_phone: '+34 622 334 455'
    }

    const mockProfile = {
      full_name: 'Alejandro Martínez Silva',
      dni_nie: '48291038K',
      driver_license_id: 'ES-48291038K',
      driver_license_issue_date: '2016-04-12',
      driver_license_expiry_date: '2031-04-12',
      address: 'Calle Mayor 45, 3ºB, 28013 Madrid',
      phone: '+34 622 334 455',
      email: 'alejandro.martinez@ejemplo.com',
      has_second_driver: true,
      second_driver_name: 'Laura Gómez Santos',
      second_driver_dni: '51928374M',
      second_driver_license: 'ES-51928374M'
    }

    const mockCamper = {
      slug: 'space',
      name: 'Camper Utopia Nomade SPACE',
      plate_number: '4182-MXP',
      capacity: '4 Plazas viajar / 4 dormir'
    }

    const contractData = generateContractData(mockBooking, mockProfile, mockCamper, templateOverride)
    const { buffer } = await generateOfficialContractPdfBlob(contractData)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="vista-previa-plantilla-contrato.pdf"',
        'Cache-Control': 'no-store, max-age=0'
      }
    })
  } catch (error: any) {
    console.error('[admin/contract-template/preview] Error generating preview PDF:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al generar la previsualización del PDF' },
      { status: 500 }
    )
  }
}
