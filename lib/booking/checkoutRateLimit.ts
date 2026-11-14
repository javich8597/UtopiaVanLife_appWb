/**
 * Límite de intentos de checkout por IP, de mejor esfuerzo.
 *
 * Vive en la memoria de cada instancia del servidor: con varias instancias o tras un reinicio cada
 * una cuenta por su lado, así que frena a un cliente insistente, no a un ataque distribuido. Para
 * eso harían falta un servicio compartido o un captcha.
 *
 * La IP sale de la última entrada de `x-forwarded-for`, que es la que añade el proxy más cercano:
 * las anteriores las puede escribir el propio cliente. Sin esa cabecera no se limita, porque todos
 * los clientes compartirían un mismo contador.
 */

/** Igual que el bloqueo provisional: una IP no sostiene más de este número de bloqueos a la vez */
export const MAX_CHECKOUTS_PER_IP = 5
export const CHECKOUT_IP_WINDOW_MS = 15 * 60 * 1000

/**
 * Envíos de documentación por IP y titular. Cada uno puede llegar a 4,5 MB y abre lecturas de
 * reservas y escrituras en Storage, así que la ruta no puede quedarse sin límite; el margen es
 * amplio porque un cliente legítimo reintenta cuando una foto no sube.
 */
export const MAX_DOCUMENT_UPLOADS_PER_IP = 10
export const DOCUMENT_UPLOAD_IP_WINDOW_MS = 15 * 60 * 1000

export const MAX_ACCOUNT_ACTIVATIONS_PER_IP = 10
export const ACCOUNT_ACTIVATION_WINDOW_MS = 15 * 60 * 1000

export const MAX_VERIFY_PAYMENTS_PER_IP = 60
export const VERIFY_PAYMENT_WINDOW_MS = 10 * 60 * 1000

const MAX_TRACKED_IPS = 10000

/** Un contador por tipo de intento: el checkout y la subida no se gastan el límite entre ellos */
const buckets = {
    checkout: new Map<string, { count: number; resetAt: number }>(),
    documentUpload: new Map<string, { count: number; resetAt: number }>(),
    accountActivation: new Map<string, { count: number; resetAt: number }>(),
    verifyPayment: new Map<string, { count: number; resetAt: number }>(),
}

export function clientIp(headers: Headers): string | null {
    const forwarded = headers.get('x-forwarded-for')
    return forwarded?.split(',').at(-1)?.trim() || null
}

function forgetExpired(attempts: Map<string, { count: number; resetAt: number }>, now: number): void {
    for (const [ip, entry] of attempts) {
        if (entry.resetAt <= now) attempts.delete(ip)
    }
    if (attempts.size >= MAX_TRACKED_IPS) attempts.clear()
}

/** `key` es la IP, o la IP y el titular: sin clave (sin `x-forwarded-for`) no se limita nada */
function registerAttempt(
    attempts: Map<string, { count: number; resetAt: number }>,
    max: number,
    windowMs: number,
    key: string | null,
    now: number
): boolean {
    if (!key) return true

    const entry = attempts.get(key)
    if (!entry || entry.resetAt <= now) {
        if (attempts.size >= MAX_TRACKED_IPS) forgetExpired(attempts, now)
        attempts.set(key, { count: 1, resetAt: now + windowMs })
        return true
    }
    if (entry.count >= max) return false

    entry.count++
    return true
}

/** Apunta un intento de reserva. Devuelve false si esa IP ya ha llegado al límite */
export function registerCheckoutAttempt(ip: string | null, now: number = Date.now()): boolean {
    return registerAttempt(buckets.checkout, MAX_CHECKOUTS_PER_IP, CHECKOUT_IP_WINDOW_MS, ip, now)
}

/**
 * Clave del contador de envíos de documentación: la IP del proxy **y** el titular ya resuelto.
 *
 * El contador se apuntaba solo por IP y antes de saber quién enviaba (QA-SD-12), así que diez
 * peticiones anónimas —todas rechazadas con 401— dejaban sin poder subir documentación, durante 15
 * minutos, a cualquiera que compartiera salida: el wifi de un camping, una oficina, el CGNAT de una
 * red móvil o la pareja del propio cliente. Con el titular en la clave, cada cliente gasta su cupo.
 *
 * Sigue haciendo falta la IP: sin cabecera `x-forwarded-for` devuelve null y entonces NO hay límite
 * (es lo que hace `registerAttempt` con una clave nula), porque esa cabecera la pone el proxy y sin
 * ella no hay forma de separar a un cliente insistente del resto.
 */
export function documentUploadBucketKey(ip: string | null, userId: string | null | undefined): string | null {
    if (!ip) return null
    return userId ? `${ip}|${userId}` : ip
}

/** Apunta un envío de documentación. Devuelve false si esa clave ya ha llegado al límite */
export function registerDocumentUploadAttempt(key: string | null, now: number = Date.now()): boolean {
    return registerAttempt(buckets.documentUpload, MAX_DOCUMENT_UPLOADS_PER_IP, DOCUMENT_UPLOAD_IP_WINDOW_MS, key, now)
}

/** Apunta una activación de cuenta post-pago. Devuelve false si esa clave ya ha llegado al límite */
export function registerAccountActivationAttempt(key: string | null, now: number = Date.now()): boolean {
    return registerAttempt(buckets.accountActivation, MAX_ACCOUNT_ACTIVATIONS_PER_IP, ACCOUNT_ACTIVATION_WINDOW_MS, key, now)
}

/** Apunta una comprobación de pago en verify-payment. Devuelve false si esa IP supera el límite */
export function registerVerifyPaymentAttempt(ip: string | null, now: number = Date.now()): boolean {
    return registerAttempt(buckets.verifyPayment, MAX_VERIFY_PAYMENTS_PER_IP, VERIFY_PAYMENT_WINDOW_MS, ip, now)
}
