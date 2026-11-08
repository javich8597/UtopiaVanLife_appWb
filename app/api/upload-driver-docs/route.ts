import crypto from "crypto";
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClientOrSession } from '@/lib/admin/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'
import { CHECKOUT_ACCESS_COOKIE, expiredCheckoutAccessCookie, resolveCheckoutUploadOwner } from '@/lib/checkoutAccess'
import { detectDocumentType, driverFieldError, DocumentType, normalizeDriverText } from '@/lib/driverDocuments'
import {
    bookingSecondDriver,
    BookingSecondDriver,
    BookingSecondDriverRow,
    LIVE_BOOKING_STATUSES,
    sameDocument,
    secondDriverRequirementError,
} from '@/lib/booking/secondDriver'
import { isValidServiceRoleKey, normalizeVerificationStatus } from '@/lib/admin/auth'
import { MAX_REQUEST_BYTES } from '@/lib/documentUploadBudget'

// Vercel corta en torno a 4,5 MB por petición a una función: el navegador reduce las fotos para que
// todas quepan en una sola petición (lib/compressDocumentImage.ts). Ningún archivo suelto supera este límite.
const TOO_LARGE_MESSAGE = 'Los archivos pesan demasiado para enviarlos juntos. Haz otra foto de los documentos o súbelos en formato JPG.'

/**
 * ¿El formulario solo está reenviando el 2º conductor que ya constaba en el perfil?
 *
 * /dashboard/datos inicializaba el interruptor con `users.has_second_driver`, así que un cliente con
 * ese dato antiguo lo manda en cada guardado. Eso no introduce a nadie nuevo —coincide el documento
 * o, si el perfil no lo guardaba, el nombre—, y no puede dejar al titular sin poder guardar sus
 * propios datos. La parte del 2º conductor se ignora: quien manda es la reserva.
 */
function profileRepeatsSecondDriver(
  current: { has_second_driver?: boolean | null; second_driver_name?: string | null; second_driver_dni?: string | null } | null | undefined,
  fullName: string,
  document: string
): boolean {
  if (!current?.has_second_driver) return false
  if (current.second_driver_dni) return sameDocument(document, current.second_driver_dni)
  const stored = (normalizeDriverText(current.second_driver_name || '') || '').toLocaleLowerCase('es-ES')
  return stored.length > 0 && stored === fullName.toLocaleLowerCase('es-ES')
}

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

    // El perfil actual se lee antes de validar o escribir nada: decide si hace falta volver a
    // revisión y si el formulario solo está reenviando un 2º conductor que ya constaba
    const { data: current, error: currentErr } = await supabaseAdmin
      .from('users')
      .select('verification_status, full_name, dni_nie, driver_license_id, driver_license_issue_date, driver_license_expiry_date, has_second_driver, second_driver_name, second_driver_dni, second_driver_license')
      .eq('id', user.id)
      .maybeSingle()
    if (currentErr) throw new Error(currentErr.message)

    // El 2º conductor pertenece a la RESERVA, no al cliente: aquí solo se sube la documentación de
    // la persona que una reserva suya autoriza. La reserva sale del `bookingId` del formulario o del
    // pedido de la URL; si no llegan, de la reserva viva y pagada cuyo 2º conductor es justamente
    // esa persona. En todos los casos el documento subido tiene que ser el de la reserva: antes
    // bastaba con que "alguna" reserva llevara un 2º conductor, sin comparar con quién.
    // Todo esto se comprueba antes de subir o escribir nada.
    let secondDriverBooking: BookingSecondDriverRow | null = null
    let authorizedSecondDriver: BookingSecondDriver | null = null
    // El 2º conductor que se acepta guardar: puede quedar en false aunque el formulario lo mande
    let secondDriverAccepted = hasSecondDriver

    if (hasSecondDriver) {
      // Sin los tres datos no se guarda nada: antes un `true` con los campos vacíos borraba los
      // valores del perfil y lo dejaba incoherente
      if (!secondDriverFullName || !secondDriverDni || !secondDriverLicense) {
        return NextResponse.json(
          { error: 'Para registrar al segundo conductor hacen falta su nombre completo, su DNI/NIE o pasaporte y su número de carnet.' },
          { status: 400 }
        )
      }

      // Sin sesión, las reservas solo se pueden leer con la service role: RLS se las oculta al
      // visitante. Sin clave válida el fallo es del servidor, no del cliente
      if (!sessionUser && !isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
        console.error('upload-driver-docs: sin sesión y sin SUPABASE_SERVICE_ROLE_KEY válida; no se puede comprobar la reserva')
        return NextResponse.json(
          { error: 'No podemos comprobar tu reserva en este momento. Vuelve a intentarlo en unos minutos o escríbenos.' },
          { status: 503 }
        )
      }

      const formBookingId = typeof formData.get('bookingId') === 'string' ? (formData.get('bookingId') as string).trim() : ''
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formBookingId)
      if (formBookingId && !isUuid) {
        return NextResponse.json({ error: 'La reserva indicada no es válida.' }, { status: 400 })
      }
      const orderId = request.nextUrl.searchParams.get('order') || ''

      // Solo reservas vivas y pagadas: una cancelada, rechazada o sin pagar no autoriza a nadie a
      // conducir. `select('*')` porque las columnas second_driver_* de bookings pueden no estar
      // aplicadas todavía (migración 20261108, preparada sin aplicar)
      let bookingQuery = supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .in('status', LIVE_BOOKING_STATUSES as unknown as string[])
      if (isUuid) bookingQuery = bookingQuery.eq('id', formBookingId)
      else if (orderId) bookingQuery = bookingQuery.eq('payment_intent_id', orderId)

      const { data: bookingRows, error: bookingsErr } = await bookingQuery
      if (bookingsErr) throw new Error(bookingsErr.message)

      for (const row of (bookingRows || []) as BookingSecondDriverRow[]) {
        const driver = bookingSecondDriver(row)
        // Un 2º conductor cobrado del que no consta el documento no autoriza a nadie
        if (!driver?.document || !sameDocument(secondDriverDni, driver.document)) continue
        secondDriverBooking = row
        authorizedSecondDriver = driver
        break
      }

      if (authorizedSecondDriver) {
        // Los requisitos se vuelven a comprobar contra la fecha de recogida de esa reserva
        const requirementError = secondDriverRequirementError(authorizedSecondDriver, secondDriverBooking?.start_date)
        if (requirementError) {
          return NextResponse.json({ error: requirementError }, { status: 400 })
        }
      } else if (profileRepeatsSecondDriver(current, secondDriverFullName, secondDriverDni)) {
        // El formulario de /dashboard/datos reenvía el 2º conductor que ya constaba en el perfil.
        // Si ninguna reserva lo lleva, el titular no puede quedarse sin poder guardar SUS datos:
        // se ignora esa parte (la reserva manda) y no se toca lo que había
        console.warn('upload-driver-docs: 2º conductor del perfil sin reserva que lo autorice; se ignora')
        secondDriverAccepted = false
      } else {
        return NextResponse.json(
          { error: 'Ninguna reserva tuya pagada autoriza a ese segundo conductor. Escríbenos para añadirlo a tu reserva antes de subir su documentación.' },
          { status: 400 }
        )
      }
    }

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
    // Las fotos del 2º conductor van ligadas a su reserva (`<cliente>/<reserva>/second_*`), no a la
    // carpeta del perfil: la persona autorizada es de esa reserva y solo de esa
    const secondDriverFolder = secondDriverBooking?.id ? `${user.id}/${secondDriverBooking.id}` : null
    const toUpload: Array<{ folder: string; prefix: string; content: Buffer; type: DocumentType }> = []
    for (const [file, prefix] of documents) {
      if (!file || typeof file === 'string' || file.size === 0) continue
      const isSecondDriverFile = prefix.startsWith('second_')
      if (isSecondDriverFile && !secondDriverFolder) {
        return NextResponse.json(
          { error: 'Esas fotos son de un segundo conductor que ninguna reserva tuya pagada autoriza. Escríbenos para añadirlo a tu reserva.' },
          { status: 400 }
        )
      }
      const content = Buffer.from(await file.arrayBuffer())
      const type = detectDocumentType(content)
      if (!type) {
        return NextResponse.json({ error: 'Solo se aceptan fotos reales (JPG, PNG, HEIC) o PDF.' }, { status: 400 })
      }
      toUpload.push({ folder: isSecondDriverFile ? secondDriverFolder! : user.id, prefix, content, type })
    }

    // Antes de subir: una foto nueva nunca debe quedar en un perfil que sigue constando como verificado
    if (toUpload.length > 0 && normalizeVerificationStatus(current?.verification_status) === 'verified') {
      const { error: reviewErr } = await supabaseAdmin
        .from('users')
        .update({ verification_status: 'pending_validation' })
        .eq('id', user.id)
      if (reviewErr) throw new Error(reviewErr.message)
    }

    const uploaded = await Promise.all(toUpload.map(async ({ folder, prefix, content, type }) => {
      const filePath = `${folder}/${prefix}_${crypto.randomUUID()}.${type.extension}`
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
    const secondDriverChanged = !!current && (secondDriverAccepted
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

    // El 2º conductor se guarda en SU reserva. Las columnas del perfil se siguen escribiendo solo
    // mientras la migración 20261108 no esté aplicada: en cuanto lo esté, este bloque desaparece y
    // `users.second_driver_*` queda como dato histórico (ya no lo lee ni el contrato ni la subida)
    if (secondDriverAccepted) {
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

    // Los datos del 2º conductor, en la reserva que lo autoriza. Las fechas son las que validó el
    // checkout; del formulario solo se acepta el nombre y el carnet de la MISMA persona
    // (el documento ya se comparó arriba). Si las columnas aún no existen, se registra y se sigue:
    // la reserva sigue siendo la que manda a través de `passengers`
    if (secondDriverAccepted && secondDriverBooking?.id && authorizedSecondDriver) {
      const { error: bookingUpdateErr } = await supabaseAdmin
        .from('bookings')
        .update({
          has_second_driver: true,
          second_driver_name: secondDriverFullName || authorizedSecondDriver.fullName,
          second_driver_dni: authorizedSecondDriver.document,
          second_driver_license: secondDriverLicense || authorizedSecondDriver.licenseId,
          second_driver_birth_date: authorizedSecondDriver.birthDate,
          second_driver_license_date: authorizedSecondDriver.licenseDate,
          second_driver_docs_uploaded_at: new Date().toISOString(),
        })
        .eq('id', secondDriverBooking.id)
        .eq('user_id', user.id)

      if (bookingUpdateErr) {
        console.error('No se pudieron guardar los datos del 2º conductor en la reserva (¿migración 20261108 sin aplicar?):', bookingUpdateErr.message)
      }
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

