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

const MAX_TRACKED_IPS = 10000

const attempts = new Map<string, { count: number; resetAt: number }>()

export function clientIp(headers: Headers): string | null {
    const forwarded = headers.get('x-forwarded-for')
    return forwarded?.split(',').at(-1)?.trim() || null
}

function forgetExpired(now: number): void {
    for (const [ip, entry] of attempts) {
        if (entry.resetAt <= now) attempts.delete(ip)
    }
    if (attempts.size >= MAX_TRACKED_IPS) attempts.clear()
}

/** Apunta un intento. Devuelve false si esa IP ya ha llegado al límite */
export function registerCheckoutAttempt(ip: string | null, now: number = Date.now()): boolean {
    if (!ip) return true

    const entry = attempts.get(ip)
    if (!entry || entry.resetAt <= now) {
        if (attempts.size >= MAX_TRACKED_IPS) forgetExpired(now)
        attempts.set(ip, { count: 1, resetAt: now + CHECKOUT_IP_WINDOW_MS })
        return true
    }
    if (entry.count >= MAX_CHECKOUTS_PER_IP) return false

    entry.count++
    return true
}
