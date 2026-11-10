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
    closedPickupBookingIds,
    LIVE_BOOKING_STATUSES,
    sameDocument,
    sameDriverName,
    secondDriverLicenseConflict,
    secondDriverNameConflict,
    secondDriverRequirementError,
    uploadableSecondDriverBookings,
    uploadWindowRejection,
} from '@/lib/booking/secondDriver'
import { isValidServiceRoleKey, normalizeVerificationStatus } from '@/lib/admin/auth'
import { MAX_REQUEST_BYTES } from '@/lib/documentUploadBudget'
import { clientIp, documentUploadBucketKey, registerDocumentUploadAttempt } from '@/lib/booking/checkoutRateLimit'

// Vercel corta en torno a 4,5 MB por petición a una función: el navegador reduce las fotos para que
// todas quepan en una sola petición (lib/compressDocumentImage.ts). Ningún archivo suelto supera este límite.
const TOO_LARGE_MESSAGE = 'Los archivos pesan demasiado para enviarlos juntos. Haz otra foto de los documentos o súbelos en formato JPG.'

/**
 * ¿El formulario solo está reenviando el 2º conductor que ya constaba en el perfil?
 *
 * /dashboard/datos inicializaba el interruptor con `users.has_second_driver`, así que un cliente con
 * ese dato antiguo lo manda en cada guardado. Eso no introduce a nadie nuevo y no puede dejar al
 * titular sin poder guardar sus propios datos. La parte del 2º conductor se ignora: quien manda es
 * la reserva.
 *
 * Tiene que coincidir TODO lo que el perfil guarda de esa persona: con el documento guardado, antes
 * bastaba con acertarlo para que pasara cualquier nombre. Esto no autoriza a nadie —solo decide si
 * se ignora la parte del 2º conductor o si se responde con un error—, pero un nombre distinto es
 * otra persona y el cliente tiene que verlo.
 */
function profileRepeatsSecondDriver(
  current: { has_second_driver?: boolean | null; second_driver_name?: string | null; second_driver_dni?: string | null } | null | undefined,
  fullName: string,
  document: string
): boolean {
  if (!current?.has_second_driver) return false
  if (current.second_driver_dni && !sameDocument(document, current.second_driver_dni)) return false
  // Un nombre vacío no reclama nada: el formulario manda el campo de solo lectura y en blanco
  // cuando la ficha de la reserva no lo trae. Uno distinto sí es otra persona
  if (current.second_driver_name && fullName.trim() && !sameDriverName(fullName, current.second_driver_name)) return false
  // Un perfil que no guarda ni documento ni nombre no repite a nadie identificable
  return Boolean(current.second_driver_dni || current.second_driver_name)
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

    // El cupo se apunta aquí: con el titular ya resuelto y con los campos en forma, pero antes de
    // consultar reservas, de pasar el perfil a revisión y de escribir en Storage, que es lo caro.
    // Se apuntaba en la primera línea de la ruta y solo por IP (QA-SD-12): diez peticiones anónimas
    // rechazadas con 401 dejaban 15 minutos sin poder subir nada a todo el que compartiera salida.
    // Ni esos 401 ni los 400 de formato gastan cupo; sin `x-forwarded-for` no hay límite.
    if (!registerDocumentUploadAttempt(documentUploadBucketKey(clientIp(request.headers), user.id))) {
      return NextResponse.json(
        { error: 'Demasiados envíos de documentación desde esta conexión. Espera unos minutos y vuelve a intentarlo.' },
        { status: 429 }
      )
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
    // Nombre y nº de carnet que se guardan: los de la ficha que validó el checkout, nunca los del
    // formulario. Si la ficha no los trae quedan vacíos y el contrato dice «Pendiente»
    let resolvedSecondDriverName = ''
    let resolvedSecondDriverLicense = ''

    if (hasSecondDriver) {
      // Sin el documento no se puede saber a qué persona de qué reserva se refiere el envío. El
      // nombre y el nº de carnet ya no se exigen: el formulario los manda de solo lectura y
      // prellenados desde la ficha, así que lo que la ficha no trae llega en blanco y se queda
      // pendiente. Un `true` con el documento vacío sí se rechaza: antes borraba lo guardado
      if (!secondDriverDni) {
        return NextResponse.json(
          { error: 'Para subir la documentación del segundo conductor hace falta su DNI/NIE o pasaporte, el que consta en tu reserva.' },
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

      // `start_date` ascendente para que Postgres devuelva ya la más próxima primero; el orden
      // definitivo lo decide `uploadableSecondDriverBookings`, que es quien se prueba
      bookingQuery = bookingQuery.order('start_date', { ascending: true })

      const { data: bookingRows, error: bookingsErr } = await bookingQuery
      if (bookingsErr) throw new Error(bookingsErr.message)

      // De las reservas que autorizan a esa persona y siguen en plazo, la de recogida más próxima:
      // con dos reservas de la misma persona, la ficha y las fotos iban a una cualquiera (QA-SD-7)
      const rows = (bookingRows || []) as BookingSecondDriverRow[]
      const matching = rows.filter(row => {
        const driver = bookingSecondDriver(row)
        return !!driver?.document && sameDocument(secondDriverDni, driver.document)
      })
      // El plazo lo cierra la ENTREGA de llaves, no una fecha: se admite documentación mientras no
      // haya una entrega de recogida cerrada para esa reserva (decisión de Javier, 2026-11-09).
      // `kind: 'pickup'` y cerrada = `completed_at`, la marca que el panel escribe cuando no queda
      // ningún paso pendiente, el de comprobar al 2º conductor incluido.
      let closedPickups: ReadonlySet<string> = new Set<string>()
      const matchingIds = matching.map(row => String(row.id || '')).filter(Boolean)
      if (matchingIds.length > 0) {
        const { data: handoverRows, error: handoversErr } = await supabaseAdmin
          .from('handovers')
          .select('booking_id, kind, completed_at')
          .eq('kind', 'pickup')
          .in('booking_id', matchingIds)
        if (handoversErr) {
          // Si la tabla no responde no se deja al cliente sin poder subir nada: la consecuencia de
          // admitir una subida tardía es que llega después de la entrega y la revisamos nosotros,
          // mientras que bloquearlas todas por un fallo de lectura deja la reserva sin documentación
          console.error('upload-driver-docs: no se pudo leer la entrega de recogida; se admite la subida:', handoversErr.message)
        } else {
          closedPickups = closedPickupBookingIds(handoverRows || [])
        }
      }

      const candidates = uploadableSecondDriverBookings(matching, secondDriverDni, { closedPickups })
      if (candidates.length > 0) {
        secondDriverBooking = candidates[0].row
        authorizedSecondDriver = candidates[0].driver
      }

      if (authorizedSecondDriver) {
        // Los requisitos se vuelven a comprobar contra la fecha de recogida de esa reserva
        const requirementError = secondDriverRequirementError(authorizedSecondDriver, secondDriverBooking?.start_date)
        if (requirementError) {
          return NextResponse.json({ error: requirementError }, { status: 400 })
        }

        // Los tres datos de esa persona (nombre, documento y nº de carnet) salen de la ficha que
        // validó el checkout: el formulario solo puede confirmarlos o dejarlos en blanco. Acertar el
        // documento dejaba el contrato facultando a quien el titular quisiera teclear, con el
        // permiso que quisiera teclear (QA-SD-11, QA-SD-13 y hallazgo N2)
        const conflict =
          secondDriverNameConflict(secondDriverFullName, authorizedSecondDriver.fullName) ||
          secondDriverLicenseConflict(secondDriverLicense, authorizedSecondDriver.licenseId)
        if (conflict) {
          return NextResponse.json({ error: conflict }, { status: 400 })
        }

        resolvedSecondDriverName = authorizedSecondDriver.fullName
        resolvedSecondDriverLicense = authorizedSecondDriver.licenseId
      } else if (matching.length > 0) {
        // Alguna reserva lleva a esa persona, pero ninguna admite ya su documentación: la camper
        // está entregada (o la reserva no tiene fechas y no se puede situar).
        //
        // Va ANTES de `profileRepeatsSecondDriver` (QA-SD-14): el perfil del cliente guarda a esa
        // misma persona en cuanto subió su documentación una vez, así que el plazo cerrado se
        // respondía con un 200 y «guardados con éxito» y el cliente no se enteraba de nada
        return NextResponse.json(
          {
            error: uploadWindowRejection(matching, { closedPickups })
              || 'La reserva que autoriza a ese segundo conductor ya no admite su documentación. Escríbenos y lo resolvemos contigo.',
          },
          { status: 400 }
        )
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

    // ¿Esta petición trae alguna foto DEL 2º conductor? Es lo que marca su documentación como subida
    const secondDriverPhotos = toUpload.some(({ prefix }) => prefix.startsWith('second_'))

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
        resolvedSecondDriverName !== (current.second_driver_name || '') ||
        secondDriverDni !== (current.second_driver_dni || '') ||
        resolvedSecondDriverLicense !== (current.second_driver_license || '')
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
    const updatePayload: Record<string, string | boolean | null> = {
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
      // Nombre, documento y nº de carnet son los de la ficha de la reserva, igual que en la propia
      // reserva: del formulario no se acepta ninguno de los tres (QA-SD-11, QA-SD-13 y N2)
      updatePayload.second_driver_name = resolvedSecondDriverName
      updatePayload.second_driver_dni = authorizedSecondDriver?.document || secondDriverDni
      updatePayload.second_driver_license = resolvedSecondDriverLicense
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

    // Los datos del 2º conductor, en la reserva que lo autoriza: nombre, documento, nº de carnet y
    // fechas son los que validó el checkout, nunca los del formulario. Si las columnas aún no
    // existen, se registra y se sigue: la reserva sigue siendo la que manda a través de `passengers`
    if (secondDriverAccepted && secondDriverBooking?.id && authorizedSecondDriver) {
      const bookingPayload: Record<string, string | boolean | null> = {
        has_second_driver: true,
        second_driver_name: resolvedSecondDriverName,
        second_driver_dni: authorizedSecondDriver.document,
        second_driver_license: resolvedSecondDriverLicense,
        second_driver_birth_date: authorizedSecondDriver.birthDate,
        second_driver_license_date: authorizedSecondDriver.licenseDate,
      }
      // La marca significa «sus fotos ya están subidas», y es la que apaga el aviso del panel:
      // guardar el formulario sin ninguna foto suya la ponía igual (hallazgo N1) y dejaba al admin
      // sin saber que faltaba la documentación de esa persona
      if (secondDriverPhotos) bookingPayload.second_driver_docs_uploaded_at = new Date().toISOString()

      const { error: bookingUpdateErr } = await supabaseAdmin
        .from('bookings')
        .update(bookingPayload)
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

