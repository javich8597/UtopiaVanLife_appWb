import crypto from "crypto";
import { NextResponse } from 'next/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: sessionUser } } = await supabase.auth.getUser()
    const formData = await request.formData()

    // El checkout no exige sesión previa: tras pagar en Redsys el cliente llega a /checkout/success sin
    // haber iniciado sesión. En ese caso se identifica por el pedido de Redsys, solo si es una
    // reserva reciente y el cliente aún no tiene el carnet validado.
    let targetUserId: string | null = sessionUser?.id || null

    if (!targetUserId) {
      const orderId = (formData.get('orderId') as string) || (formData.get('order') as string) || ''
      if (orderId) {
        const adminClient = getSupabaseAdmin()
        const { data: booking } = await adminClient
          .from('bookings')
          .select('id, user_id, payment_status, status, created_at')
          .eq('payment_intent_id', orderId)
          .maybeSingle()

        if (booking?.user_id) {
          const bookingAgeHours = (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60)
          const isRecentOrPaid = bookingAgeHours <= 48 || booking.payment_status === 'paid'

          if (isRecentOrPaid) {
            const { data: usr } = await adminClient
              .from('users')
              .select('verification_status')
              .eq('id', booking.user_id)
              .maybeSingle()

            if (usr?.verification_status !== 'verified') {
              targetUserId = booking.user_id
            }
          }
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Inicia sesión o indica una referencia de reserva válida para subir tu documentación.' }, { status: 401 })
    }
    const user = { id: targetUserId }

    const fullName = formData.get('fullName') as string || ''
    const dniNie = formData.get('dniNie') as string || ''
    const driverLicenseId = formData.get('driverLicenseId') as string || ''
    const driverLicenseIssueDate = formData.get('driverLicenseIssueDate') as string || ''
    const driverLicenseExpiryDate = formData.get('driverLicenseExpiryDate') as string || ''
    const address = formData.get('address') as string || ''
    const phone = formData.get('phone') as string || ''

    const dniFront = formData.get('dni_front') as File | null
    const dniBack = formData.get('dni_back') as File | null
    const licenseFront = formData.get('license_front') as File | null
    const licenseBack = formData.get('license_back') as File | null

    const hasSecondDriver = formData.get('hasSecondDriver') === 'true'
    const secondDriverFullName = formData.get('secondDriverFullName') as string || ''
    const secondDriverDni = formData.get('secondDriverDni') as string || ''
    const secondDriverLicense = formData.get('secondDriverLicense') as string || ''
    const secondDriverDniFront = formData.get('second_dni_front') as File | null
    const secondDriverDniBack = formData.get('second_dni_back') as File | null
    const secondDriverLicenseFront = formData.get('second_license_front') as File | null
    const secondDriverLicenseBack = formData.get('second_license_back') as File | null

    // Validate license dates
    const validation = validateDriverLicense(driverLicenseIssueDate, driverLicenseExpiryDate)
    if (!validation.isValid && validation.isExpired) {
      return NextResponse.json({ error: validation.warningMessage || 'El carnet de conducir está caducado.' }, { status: 400 })
    }

    // Service Role para bypass RLS de Storage y actualización de perfil
    // (sin service role, la sesión del propio cliente; nunca la clave anónima sin sesión)
    const supabaseAdmin = getAdminClientOrSession(supabase)

    try {
      await supabaseAdmin.storage.createBucket('documents', { public: false })
    } catch {
      // Ignorar si ya existe
    }

    const timestamp = Date.now()
    const validateMagicBytes = async (f: File) => {
        const buffer = await f.arrayBuffer()
        const view = new Uint8Array(buffer)
        if (view.length < 4) return false;
        if (view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF) return true; // JPEG
        if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) return true; // PNG
        if (view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46) return true; // PDF
        if (view.length > 12) {
            const type = String.fromCharCode(view[8], view[9], view[10], view[11])
            if (['heic', 'heix', 'mif1', 'msf1'].includes(type)) return true; // HEIC
        }
        return false;
    }
    const uploadFile = async (file: File | null, prefix: string) => {
      if (!file || typeof file === 'string' || (file instanceof File && file.size === 0)) return null
      const ext = file.name ? (file.name.split('.').pop() || 'jpg') : 'jpg'
      const filePath = `${user.id}/${prefix}_${crypto.randomUUID()}.${ext}`
      const { error } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, file, { upsert: true })
      if (error) {
        console.error(`Error subiendo ${prefix}:`, error)
        throw new Error('No hemos podido subir una de las fotos. Revisa el archivo e inténtalo de nuevo.')
      }
      return filePath
    }

    // Solo imágenes o PDF de hasta 10 MB
    const files = [dniFront, dniBack, licenseFront, licenseBack, secondDriverDniFront, secondDriverDniBack, secondDriverLicenseFront, secondDriverLicenseBack]
    for (const f of files) {
      if (!f || typeof f === 'string' || f.size === 0) continue
      const isValidMagic = await validateMagicBytes(f)
      if (!isValidMagic) {
        return NextResponse.json({ error: 'Solo se aceptan fotos reales (JPG, PNG, HEIC) o PDF.' }, { status: 400 })
      }
      if (f.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Cada archivo puede pesar como máximo 10 MB.' }, { status: 400 })
      }
    }

    const uploaded = await Promise.all([
      uploadFile(dniFront, 'dni_front'),
      uploadFile(dniBack, 'dni_back'),
      uploadFile(licenseFront, 'front'), // 'front' is also compatible with existing verification view
      uploadFile(licenseBack, 'back'),
      uploadFile(secondDriverDniFront, 'second_dni_front'),
      uploadFile(secondDriverDniBack, 'second_dni_back'),
      uploadFile(secondDriverLicenseFront, 'second_license_front'),
      uploadFile(secondDriverLicenseBack, 'second_license_back')
    ])

    // Solo vuelve a revisión si hay fotos nuevas o cambian los datos del carnet/DNI.
    // Cambiar el teléfono o la dirección no debe quitarle a un cliente la validación.
    const { data: current } = await supabaseAdmin
      .from('users')
      .select('verification_status, dni_nie, driver_license_id, driver_license_issue_date, driver_license_expiry_date')
      .eq('id', user.id)
      .maybeSingle()
    const hasNewFiles = uploaded.some(Boolean)
    const identityChanged = !!current && (
      (dniNie && dniNie !== (current.dni_nie || '')) ||
      (driverLicenseId && driverLicenseId !== (current.driver_license_id || '')) ||
      (driverLicenseIssueDate && driverLicenseIssueDate !== (current.driver_license_issue_date || '')) ||
      (driverLicenseExpiryDate && driverLicenseExpiryDate !== (current.driver_license_expiry_date || ''))
    )
    const alreadyReviewed = ['verified', 'approved', 'pending_validation', 'pending'].includes(current?.verification_status || '')
    const needsReview = hasNewFiles || (alreadyReviewed && identityChanged)

    // Update user profile in database
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }
    if (needsReview) updatePayload.verification_status = 'pending_validation'

    if (fullName) updatePayload.full_name = fullName
    if (dniNie) updatePayload.dni_nie = dniNie
    if (driverLicenseId) updatePayload.driver_license_id = driverLicenseId
    if (driverLicenseIssueDate) updatePayload.driver_license_issue_date = driverLicenseIssueDate
    if (driverLicenseExpiryDate) updatePayload.driver_license_expiry_date = driverLicenseExpiryDate
    if (address) updatePayload.address = address
    if (phone) updatePayload.phone = phone

    if (hasSecondDriver) {
      updatePayload.has_second_driver = true
      updatePayload.second_driver_name = secondDriverFullName
      updatePayload.second_driver_dni = secondDriverDni
      updatePayload.second_driver_license = secondDriverLicense
    } else if (formData.get('hasSecondDriver') === 'false') {
      updatePayload.has_second_driver = false
    }

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateErr) {
      console.error('Could not update driver profile:', updateErr.message)
      return NextResponse.json({ error: 'No hemos podido guardar tus datos. Inténtalo de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      validation,
      verificationStatus: needsReview ? 'pending_validation' : (current?.verification_status || 'not_submitted'),
      message: 'Documentación y datos de conductor guardados con éxito.'
    })
  } catch (error: any) {
    console.error('Upload Driver Docs Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

