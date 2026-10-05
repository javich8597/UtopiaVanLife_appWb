import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
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

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json({ error: 'Esta reserva ya no admite la firma del contrato.' }, { status: 409 })
    }
    if (booking.contract_signed_at) {
      return NextResponse.json({ error: 'El contrato de esta reserva ya está firmado.' }, { status: 409 })
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
    const { buffer } = await generateOfficialContractPdfBlob(contractData, signatureDataUrl)

    // 5. Conexión de administración para almacenamiento y bypass RLS
    //    (sin service role, la sesión del propio cliente; nunca la clave anónima sin sesión)
    const supabaseAdmin = getAdminClientOrSession(supabase)

    // Asegurar que el bucket documents existe (privado: contiene DNI y contratos)
    try {
      await supabaseAdmin.storage.createBucket('documents', { public: false })
    } catch {
      // Ignorar si ya existe
    }

    // Archivar el PDF firmado. El bucket es privado, así que no guardamos una URL pública
    // (daría "Bucket not found"); el cliente regenera el PDF a partir de la firma guardada.
    const storagePath = `contracts/${bookingId}_contrato_firmado.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })
    if (uploadError) {
      console.warn('Could not upload contract PDF to Storage:', uploadError.message)
    }

    const signedAt = new Date().toISOString()

    // 6. Actualizar la reserva con la firma
    const updatePayload: Record<string, any> = {
      contract_signed_at: signedAt,
      contract_signature: signatureDataUrl,
      updated_at: signedAt
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select('id')

    // Sin la firma guardada el contrato no cuenta como firmado: no responder éxito.
    if (updateErr || !updated || updated.length === 0) {
      console.error('Could not save contract signature:', updateErr?.message || 'sin filas actualizadas')
      return NextResponse.json(
        { error: 'No hemos podido guardar tu firma. Inténtalo de nuevo o escríbenos.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contrato formalizado y firmado con éxito.',
      signedAt,
      contractNumber: contractData.contractNumber
    })
  } catch (err: any) {
    console.error('Contract Sign API Error:', err)
    return NextResponse.json({ error: err.message || 'Error interno al firmar el contrato' }, { status: 500 })
  }
}
