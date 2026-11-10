/**
 * Documentos de identidad que sube el cliente al bucket 'documents', en la carpeta de su id.
 *
 * /api/upload-driver-docs los guarda como `<prefijo>_<uuid>.<ext>`:
 *   dni_front, dni_back, front (carnet), back (carnet), second_dni_front, second_license_front…
 * Las subidas antiguas usaban `<prefijo>_<timestamp numérico>.<ext>` y se siguen leyendo.
 * Un `includes('front_')` mezclaría el carnet con el DNI o con el del segundo conductor,
 * así que se busca el prefijo exacto. Un UUID no ordena por tiempo: gana el archivo con
 * `created_at` más reciente en Storage (y, sin esa fecha, el timestamp del nombre antiguo).
 */

export interface StoredFile {
  name: string
  /** Fecha de creación que devuelve storage.list() */
  created_at?: string | null
  updated_at?: string | null
}

export interface CustomerDocumentUrls {
  dniFrontUrl: string | null
  dniBackUrl: string | null
  licenseFrontUrl: string | null
  licenseBackUrl: string | null
}

/** Prefijos aceptados para cada documento. `front`/`back` son los que escribe hoy la subida */
export const DOCUMENT_PREFIXES: Record<keyof CustomerDocumentUrls, string[]> = {
  dniFrontUrl: ['dni_front'],
  dniBackUrl: ['dni_back'],
  licenseFrontUrl: ['license_front', 'front'],
  licenseBackUrl: ['license_back', 'back'],
}

/**
 * Opciones de storage.list(): las más recientes primero y sin el límite por defecto (100),
 * porque las subidas se acumulan y el archivo que interesa podría quedar fuera de la página.
 */
export const DOCUMENT_LIST_OPTIONS = {
  limit: 1000,
  sortBy: { column: 'created_at', order: 'desc' },
} as const

// Sufijo de un nombre guardado: UUID (actual) o dígitos (timestamp de las subidas antiguas)
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

function uploadTime(file: StoredFile, legacyDigits: string | undefined): number {
  for (const iso of [file.created_at, file.updated_at]) {
    const t = iso ? Date.parse(iso) : NaN
    if (Number.isFinite(t)) return t
  }
  return legacyDigits ? Number(legacyDigits) : -1
}

/**
 * Patrones de nombre guardado para esos prefijos. Un `includes()` mezclaría el carnet con el DNI o
 * con el del segundo conductor, así que el prefijo tiene que coincidir exacto y el resto del nombre
 * ser un UUID (subidas de hoy) o un timestamp (subidas antiguas).
 */
export function documentNamePatterns(prefixes: string[]): RegExp[] {
  return prefixes.map(p => new RegExp(`^${p}_(?:(\\d+)|${UUID})\\.[a-z0-9]+$`, 'i'))
}

/**
 * TODOS los nombres de archivo que son uno de esos documentos, no solo el más reciente.
 *
 * `latestDocument` se queda con la última copia porque es la que hay que enseñar; para conservar o
 * borrar hacen falta todas, porque cada reenvío del formulario dejó otra copia en la carpeta.
 */
export function documentsMatching(files: StoredFile[], prefixes: string[]): string[] {
  const patterns = documentNamePatterns(prefixes)
  return (files || [])
    .filter(f => typeof f?.name === 'string' && patterns.some(re => re.test(f.name)))
    .map(f => f.name)
}

/** Nombre del archivo más reciente que empieza exactamente por uno de los prefijos */
export function latestDocument(files: StoredFile[], prefixes: string[]): string | null {
  const patterns = documentNamePatterns(prefixes)
  let best: string | null = null
  let bestTime = -Infinity
  for (const f of files) {
    const match = patterns.map(re => re.exec(f.name)).find(Boolean)
    if (!match) continue
    const time = uploadTime(f, match[1])
    // Empate: el nombre mayor, para que el resultado no dependa del orden de la lista
    if (best === null || time > bestTime || (time === bestTime && f.name > best)) {
      best = f.name
      bestTime = time
    }
  }
  return best
}

/** Nombres de las fotos del carnet (anverso y reverso) más recientes, para la hoja de entrega */
export function latestLicensePhotoNames(files: StoredFile[]): string[] {
  return [DOCUMENT_PREFIXES.licenseFrontUrl, DOCUMENT_PREFIXES.licenseBackUrl]
    .map(prefixes => latestDocument(files, prefixes))
    .filter((name): name is string => Boolean(name))
}

/** URLs firmadas (1 h) de los documentos de un cliente. Requiere un cliente con acceso al bucket. */
export async function resolveCustomerDocumentUrls(client: any, userId: string): Promise<CustomerDocumentUrls> {
  const urls: CustomerDocumentUrls = { dniFrontUrl: null, dniBackUrl: null, licenseFrontUrl: null, licenseBackUrl: null }

  try {
    const { data: files } = await client.storage.from('documents').list(userId, DOCUMENT_LIST_OPTIONS)
    if (!files || files.length === 0) return urls

    await Promise.all(
      (Object.keys(DOCUMENT_PREFIXES) as (keyof CustomerDocumentUrls)[]).map(async key => {
        const name = latestDocument(files, DOCUMENT_PREFIXES[key])
        if (!name) return
        const { data } = await client.storage.from('documents').createSignedUrl(`${userId}/${name}`, 3600)
        urls[key] = data?.signedUrl || null
      })
    )
  } catch (e) {
    console.error('Error resolviendo documentos del cliente', userId, e)
  }

  return urls
}
