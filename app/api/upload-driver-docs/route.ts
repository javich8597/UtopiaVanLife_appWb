import crypto from "crypto";
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'
import { CHECKOUT_ACCESS_COOKIE, expiredCheckoutAccessCookie, resolveCheckoutUploadOwner } from '@/lib/checkoutAccess'
import { detectDocumentType, driverFieldError, DocumentType, normalizeDriverText } from '@/lib/driverDocuments'
import { normalizeVerificationStatus } from '@/lib/admin/auth'
import { MAX_REQUEST_BYTES } from '@/lib/documentUploadBudget'

// Vercel corta en torno a 4,5 MB por petición a una función: el navegador reduce las fotos para que
// todas quepan en una sola petición (lib/compressDocumentImage.ts). Ningún archivo suelto supera este límite.
const TOO_LARGE_MESSAGE = 'Los archivos pesan demasiado para enviarlos juntos. Haz otra foto de los documentos o súbelos en formato JPG.'

export async function POST(request: NextRequest) {
  try {
    // Nada de esto lee el cuerpo: el tamaño y el acceso se comprueban antes
    const declaredBytes = Number(request.headers.get('content-length'))
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes <= 0) {
      return NextResponse.json({ error: 'Falta el tamaño de la petición.' }, { status: 411 })
    }
    if (declaredBytes > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 413 })
    }

    const supabase = await createServerClient()
    const { data: { user: sessionUser } } = await supabase.auth.getUser()

    // Tras pagar en Redsys el cliente llega a /checkout/success sin sesión. El número de pedido viaja
    // en la URL y no demuestra nada: hace falta la cookie que recibe quien creó su cuenta en ese checkout.
    let targetUserId: string | null = sessionUser?.id || null
    const accessCookie = request.cookies.get(CHECKOUT_ACCESS_COOKIE)?.value

    if (!targetUserId) {
      targetUserId = await resolveCheckoutUploadOwner(
        getSupabaseAdmin(),
        request.nextUrl.searchParams.get('order') || '',
        accessCookie
      )
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Para subir tu documentación, entra con el enlace de acceso que te hemos enviado por email.' }, { status: 401 })
    }
    const user = { id: targetUserId }
    const formData = await request.formData()

    const fieldError = driverFieldError(formData)
    if (fieldError) {
      return NextResponse.json({ error: fieldError }, { status: 400 })
    }

    // Se guarda y se compara lo normalizado (marcas invisibles, guiones y comillas tipográficas, NFC)
    const normalizedField = (name: string) => normalizeDriverText(formData.get(name) as string || '') || ''
    const fullName = normalizedField('fullName')
    const dniNie = formData.get('dniNie') as string || ''
    const driverLicenseId = formData.get('driverLicenseId') as string || ''
    const driverLicenseIssueDate = formData.get('driverLicenseIssueDate') as string || ''
    const driverLicenseExpiryDate = formData.get('driverLicenseExpiryDate') as string || ''
    const address = normalizedField('address')
    const phone = normalizedField('phone')

    const dniFront = formData.get('dni_front') as File | null
    const dniBack = formData.get('dni_back') as File | null
    const licenseFront = formData.get('license_front') as File | null
    const licenseBack = formData.get('license_back') as File | null

    const hasSecondDriver = formData.get('hasSecondDriver') === 'true'
    const secondDriverFullName = normalizedField('secondDriverFullName')
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

    // Solo imágenes o PDF. Extensión y tipo salen del contenido, nunca del navegador.
    // Se sube un Buffer y no el File: con un File, storage-js ignora contentType y usa el del navegador.
    const documents: Array<[File | null, string]> = [
      [dniFront, 'dni_front'],
      [dniBack, 'dni_back'],
      [licenseFront, 'front'], // 'front' is also compatible with existing verification view
      [licenseBack, 'back'],
      [secondDriverDniFront, 'second_dni_front'],
      [secondDriverDniBack, 'second_dni_back'],
      [secondDriverLicenseFront, 'second_license_front'],
      [secondDriverLicenseBack, 'second_license_back'],
    ]
    const toUpload: Array<{ prefix: string; content: Buffer; type: DocumentType }> = []
    for (const [file, prefix] of documents) {
      if (!file || typeof file === 'string' || file.size === 0) continue
      const content = Buffer.from(await file.arrayBuffer())
      const type = detectDocumentType(content)
      if (!type) {
        return NextResponse.json({ error: 'Solo se aceptan fotos reales (JPG, PNG, HEIC) o PDF.' }, { status: 400 })
      }
      toUpload.push({ prefix, content, type })
    }

    const { data: current, error: currentErr } = await supabaseAdmin
      .from('users')
      .select('verification_status, full_name, dni_nie, driver_license_id, driver_license_issue_date, driver_license_expiry_date, has_second_driver, second_driver_name, second_driver_dni, second_driver_license')
      .eq('id', user.id)
      .maybeSingle()
    if (currentErr) throw new Error(currentErr.message)

    // Antes de subir: una foto nueva nunca debe quedar en un perfil que sigue constando como verificado
    if (toUpload.length > 0 && normalizeVerificationStatus(current?.verification_status) === 'verified') {
      const { error: reviewErr } = await supabaseAdmin
        .from('users')
        .update({ verification_status: 'pending_validation' })
        .eq('id', user.id)
      if (reviewErr) throw new Error(reviewErr.message)
    }

    const uploaded = await Promise.all(toUpload.map(async ({ prefix, content, type }) => {
      const filePath = `${user.id}/${prefix}_${crypto.randomUUID()}.${type.extension}`
      const { error } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, content, { contentType: type.contentType })
      if (error) console.error(`Error subiendo ${prefix}:`, error)
      return !error
    }))
    if (uploaded.includes(false)) {
      return NextResponse.json({ error: 'No hemos podido subir una de las fotos. Revisa el archivo e inténtalo de nuevo.' }, { status: 500 })
    }

    // Solo vuelve a revisión si hay fotos nuevas o cambian los datos del carnet/DNI.
    // Cambiar el teléfono o la dirección no debe quitarle a un cliente la validación.
    const hasNewFiles = uploaded.length > 0
    const secondDriverChanged = !!current && (hasSecondDriver
      ? !current.has_second_driver ||
        secondDriverFullName !== (current.second_driver_name || '') ||
        secondDriverDni !== (current.second_driver_dni || '') ||
        secondDriverLicense !== (current.second_driver_license || '')
      : formData.get('hasSecondDriver') === 'false' && !!current.has_second_driver)
    const identityChanged = !!current && (
      secondDriverChanged ||
      (fullName && fullName !== (current.full_name || '')) ||
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

    const response = NextResponse.json({
      success: true,
      validation,
      verificationStatus: needsReview ? 'pending_validation' : (current?.verification_status || 'not_submitted'),
      message: 'Documentación y datos de conductor guardados con éxito.'
    })

    // La documentación ya está enviada: desde aquí se entra con el enlace del email o con sesión
    if (accessCookie) {
      const expired = expiredCheckoutAccessCookie()
      response.cookies.set(expired.name, expired.value, expired.options)
    }
    return response
  } catch (error) {
    console.error('Upload Driver Docs Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

