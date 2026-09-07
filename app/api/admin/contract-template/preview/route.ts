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

    // Datos en blanco con líneas de cumplimentación para la plantilla del contrato
    const BLANK_LINE = '____________________________________'
    const BLANK_SHORT = '____________________'

    const mockBooking = {
      id: 'PLANTILLA-MODELO',
      start_date: BLANK_SHORT,
      end_date: BLANK_SHORT,
      pickup_time: templateOverride.terms?.pickupWindow || '10:00 - 14:00',
      dropoff_time: templateOverride.terms?.dropoffWindow || '16:00 - 20:00',
      pickupLocation: 'Palma de Mallorca (Base Utopia Son Oms / Aeropuerto PMI)',
      dropoffLocation: 'Palma de Mallorca (Base Utopia Son Oms / Aeropuerto PMI)',
      total_price: 0,
      extras: ['[ Según extras contratados en reserva ]'],
      customer_name: BLANK_LINE,
      customer_email: BLANK_SHORT,
      customer_phone: BLANK_SHORT
    }

    const mockProfile = {
      full_name: BLANK_LINE,
      dni_nie: BLANK_SHORT,
      driver_license_id: BLANK_SHORT,
      driver_license_issue_date: '',
      driver_license_expiry_date: '',
      address: BLANK_LINE,
      phone: BLANK_SHORT,
      email: BLANK_SHORT,
      has_second_driver: false
    }

    const mockCamper = {
      slug: 'general',
      name: '[ Vehículo según reserva: Utopia Neo / Space ]',
      plate_number: BLANK_SHORT,
      capacity: 'Hasta 4 Plazas viajar / 4 dormir'
    }

    const contractData = generateContractData(mockBooking, mockProfile, mockCamper, templateOverride)
    // Personalizar contractNumber para indicar que es el modelo / plantilla base
    contractData.contractNumber = 'CTR-PLANTILLA-MODELO'

    const { buffer } = await generateOfficialContractPdfBlob(contractData)

    return new Response(new Uint8Array(buffer), {
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
