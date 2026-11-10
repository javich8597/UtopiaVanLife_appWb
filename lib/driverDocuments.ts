import { isValidDateString } from './booking/checkoutRules'

/**
 * Tipos de archivo admitidos en la documentación del conductor. La extensión y el tipo se deducen
 * del contenido: nada de lo que diga el navegador (nombre del archivo o tipo) llega a Storage.
 */

/** Máximo de la dirección completa guardada (dirección, ciudad, código postal y país) */
export const MAX_ADDRESS_LENGTH = 300
/** Máximo del teléfono guardado, con su prefijo */
export const MAX_PHONE_LENGTH = 30
/** Longitud del texto tal como llega, antes de normalizar: nada más largo se procesa */
export const MAX_RAW_TEXT_LENGTH = 1000

const NAME_PATTERN = /^(?=.*\p{L}.*\p{L})[\p{L}\p{M} .,·'´`-]{2,120}$/u
const DOCUMENT_ID_PATTERN = /^(?=.*[A-Za-z0-9])[A-Za-z0-9 -]{5,20}$/
const LICENSE_ID_PATTERN = /^[A-Za-z0-9 ./-]{3,30}$/
const PHONE_PATTERN = new RegExp(`^(?=(?:\\D*\\d){6})[+0-9 ().\\/-]{6,${MAX_PHONE_LENGTH}}$`)
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/
/** Controles de dirección del texto: en una dirección pueden cambiar el orden en que se lee */
const BIDI_CONTROLS = /[؜‎‏‪-‮⁦-⁩]/
/** Uso privado y mitades sueltas de pares sustitutos: no son texto que se pueda imprimir ni copiar */
const PRIVATE_USE_OR_LONE_SURROGATE = /[\p{Co}\p{Cs}]/u

/** No-caracteres de Unicode: U+FDD0–U+FDEF y los dos últimos de cada plano (U+FFFE, U+FFFF, U+1FFFE…) */
function hasNonCharacter(value: string): boolean {
    for (const char of value) {
        const codePoint = char.codePointAt(0)!
        if ((codePoint >= 0xfdd0 && codePoint <= 0xfdef) || (codePoint & 0xfffe) === 0xfffe) return true
    }
    return false
}

/**
 * Unifica lo que se cuela al pegar: marcas invisibles, espacios raros y tabuladores, guiones y
 * comillas tipográficas, y acentos compuestos (NFC). Es lo que se guarda. Devuelve null si el texto
 * crudo supera MAX_RAW_TEXT_LENGTH: no se normaliza ni se valida algo tan largo.
 */
export function normalizeDriverText(value: string): string | null {
    if (typeof value !== 'string' || value.length > MAX_RAW_TEXT_LENGTH) return null
    return value
        .replace(/\p{Cf}/gu, '')
        .replace(/[\t\n\v\f\r\p{Zs}\p{Zl}\p{Zp}]/gu, ' ')
        .replace(/\p{Pd}/gu, '-')
        .replace(/[‘’]/g, "'")
        .normalize('NFC')
        .trim()
}

const matchesNormalized = (value: string, pattern: RegExp) => {
    const normalized = normalizeDriverText(value)
    return normalized !== null && pattern.test(normalized)
}

/** Una sola regla para el paso 5 del asistente, el checkout y la subida: lo que pasa antes de pagar pasa después */
export const isValidPersonName = (value: string) => matchesNormalized(value, NAME_PATTERN)
export const isValidPhoneText = (value: string) => matchesNormalized(value, PHONE_PATTERN)
/** Documento de identidad con el patrón de la subida, sobre el texto normalizado (lo que se guarda) */
export const isValidDocumentIdText = (value: string) => matchesNormalized(value, DOCUMENT_ID_PATTERN)
/**
 * Número de permiso de conducir con el patrón de la subida (`LICENSE_ID_PATTERN`), sobre el texto
 * normalizado, que es el que se guarda.
 *
 * El paso 5 pide el nº de carnet del 2º conductor y la subida compara el que teclea el cliente con
 * el de la ficha de la reserva (`secondDriverLicenseConflict`): si las dos puntas no validan igual,
 * el checkout aceptaría un número que después la subida rechaza y el contrato ya habría facultado.
 */
export const isValidLicenseIdText = (value: string) => matchesNormalized(value, LICENSE_ID_PATTERN)

/**
 * Dirección tal como llega a la subida de documentos: sin caracteres de control ni de dirección del
 * texto, de uso privado, sustitutos sueltos ni no-caracteres, y hasta 300 caracteres normalizada.
 */
export function isValidAddressText(value: string): boolean {
    if (typeof value !== 'string' || BIDI_CONTROLS.test(value) || CONTROL_CHARACTERS.test(value)) return false
    if (PRIVATE_USE_OR_LONE_SURROGATE.test(value) || hasNonCharacter(value)) return false
    const normalized = normalizeDriverText(value)
    return normalized !== null && normalized.length <= MAX_ADDRESS_LENGTH
}

/**
 * Dirección del paso 5 y del checkout: un tabulador o salto de línea pegado se convierte en espacio
 * (es lo que se guarda) y lo guardado cumple isValidAddressText. Los controles de dirección del texto
 * se rechazan, no se quitan: pueden cambiar el orden en que se lee la dirección.
 */
export function isValidTypedAddress(value: string): boolean {
    if (typeof value !== 'string' || BIDI_CONTROLS.test(value)) return false
    const normalized = normalizeDriverText(value)
    return normalized !== null && isValidAddressText(normalized)
}

/** Dirección completa tal como la guarda el checkout: las partes con contenido, separadas por comas */
export function joinAddressParts(parts: unknown[]): string {
    return parts
        .filter((part): part is string | number => (typeof part === 'string' || typeof part === 'number') && String(part).trim() !== '')
        .map(part => String(part).trim())
        .join(', ')
}

/**
 * Teléfono tal como se guarda: normalizado y con el prefijo del país delante, salvo que ya lo traiga.
 * Normaliza antes de mirar el `+`: un espacio raro o una marca invisible al principio no lo esconden.
 */
export function formatPhoneWithPrefix(phone: string, countryCode: string | null | undefined = '+34'): string {
    const normalized = normalizeDriverText(phone) ?? phone.trim()
    if (normalized.startsWith('+')) return normalized
    return `${(countryCode || '+34').trim()} ${normalized}`
}

/** Campos de texto del formulario de documentación. Vacío es válido: significa que no se cambia */
const DRIVER_FIELD_RULES: Record<string, { label: string; isValid: (value: string) => boolean }> = {
    fullName: { label: 'el nombre', isValid: isValidPersonName },
    dniNie: { label: 'el documento de identidad', isValid: value => DOCUMENT_ID_PATTERN.test(value) },
    driverLicenseId: { label: 'el número del carnet', isValid: value => LICENSE_ID_PATTERN.test(value) },
    driverLicenseIssueDate: { label: 'la fecha de expedición del carnet', isValid: isValidDateString },
    driverLicenseExpiryDate: { label: 'la fecha de caducidad del carnet', isValid: isValidDateString },
    address: { label: 'la dirección', isValid: isValidAddressText },
    phone: { label: 'el teléfono', isValid: isValidPhoneText },
    secondDriverFullName: { label: 'el nombre del segundo conductor', isValid: isValidPersonName },
    secondDriverDni: { label: 'el documento del segundo conductor', isValid: value => DOCUMENT_ID_PATTERN.test(value) },
    secondDriverLicense: { label: 'el carnet del segundo conductor', isValid: value => LICENSE_ID_PATTERN.test(value) },
}

/** Mensaje para el cliente si algún campo no es válido; null si todos lo son */
export function driverFieldError(formData: FormData): string | null {
    for (const [name, { label, isValid }] of Object.entries(DRIVER_FIELD_RULES)) {
        const value = formData.get(name)
        if (value === null || value === '') continue
        if (typeof value !== 'string' || !isValid(value)) return `Revisa ${label}.`
    }
    return null
}

export interface DocumentType {
    extension: 'jpg' | 'png' | 'pdf' | 'heic'
    contentType: 'image/jpeg' | 'image/png' | 'application/pdf' | 'image/heic'
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const HEIC_BRANDS = ['heic', 'heix', 'mif1', 'msf1']
const MIN_FTYP_BOX_BYTES = 16

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, i) => bytes[i] === byte)

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))

/** HEIC es un contenedor ISO: empieza por una caja `ftyp`, con su tamaño y su marca */
function isHeic(bytes: Uint8Array): boolean {
    if (bytes.length < MIN_FTYP_BOX_BYTES) return false
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0)
    return boxSize >= MIN_FTYP_BOX_BYTES
        && boxSize <= bytes.length
        && ascii(bytes, 4, 8) === 'ftyp'
        && HEIC_BRANDS.includes(ascii(bytes, 8, 12))
}

export function detectDocumentType(bytes: Uint8Array): DocumentType | null {
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { extension: 'jpg', contentType: 'image/jpeg' }
    if (startsWith(bytes, PNG_SIGNATURE)) return { extension: 'png', contentType: 'image/png' }
    if (ascii(bytes, 0, 5) === '%PDF-') return { extension: 'pdf', contentType: 'application/pdf' }
    if (isHeic(bytes)) return { extension: 'heic', contentType: 'image/heic' }
    return null
}
