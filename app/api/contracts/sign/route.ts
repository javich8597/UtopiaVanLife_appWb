import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateContractData, validateContractRequirements } from '@/lib/contracts/contractEngine'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado. Debes iniciar sesión.' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, signatureDataUrl } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Identificador de reserva no proporcionado.' }, { status: 400 })
    }

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Firma digital no válida o vacía.' }, { status: 400 })
    }

    // 1. Obtener la reserva y verificar propiedad
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        *,
        camper:campers (*)
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada o no pertenece al usuario.' }, { status: 404 })
    }

    // 2. Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // 3. Validar requisitos legales del perfil
    const validation = validateContractRequirements(profile)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.errorMessage || 'Faltan datos obligatorios en tu perfil.',
          missingFields: validation.missingFields,
          issues: validation.issues
        },
        { status: 400 }
      )
    }

    // 4. Obtener la plantilla activa (o fábrica de reserva) y generar datos del contrato
    const { getContractTemplate } = await import('@/lib/contracts/templateService')
    const activeTemplate = await getContractTemplate()
    const contractData = generateContractData(booking, profile, undefined, activeTemplate)
    const { buffer, doc } = await generateOfficialContractPdfBlob(contractData, signatureDataUrl)

    // 5. Conexión de administración para almacenamiento y bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Asegurar que el bucket documents existe
    try {
      await supabaseAdmin.storage.createBucket('documents', { public: true })
    } catch {
      // Ignorar si ya existe
    }

    // Subir el PDF a Supabase Storage
    const storagePath = `contracts/${bookingId}_contrato_firmado.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    let pdfUrl = ''
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(storagePath)
      pdfUrl = urlData?.publicUrl || ''
    } else {
      console.warn('Could not upload contract PDF to Storage:', uploadError.message)
    }

    const signedAt = new Date().toISOString()

    // 6. Actualizar la reserva con la firma y el enlace al contrato
    const updatePayload: Record<string, any> = {
      contract_signed_at: signedAt,
      contract_signature: signatureDataUrl,
      updated_at: signedAt
    }
    if (pdfUrl) {
      updatePayload.contract_pdf_url = pdfUrl
    }

    const { error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)

    if (updateErr) {
      console.warn('Could not update booking contract fields directly:', updateErr.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Contrato formalizado y firmado con éxito.',
      signedAt,
      pdfUrl,
      contractNumber: contractData.contractNumber
    })
  } catch (err: any) {
    console.error('Contract Sign API Error:', err)
    return NextResponse.json({ error: err.message || 'Error interno al firmar el contrato' }, { status: 500 })
  }
}
