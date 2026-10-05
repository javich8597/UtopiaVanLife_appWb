/**
 * Documentos de identidad que sube el cliente al bucket 'documents', en la carpeta de su id.
 *
 * /api/upload-driver-docs los guarda como `<prefijo>_<timestamp>.<ext>`:
 *   dni_front, dni_back, front (carnet), back (carnet), second_dni_front, second_license_front…
 * Un `includes('front_')` mezclaría el carnet con el DNI o con el del segundo conductor,
 * así que se busca el prefijo exacto y gana el timestamp más reciente.
 */

export interface StoredFile {
  name: string
}

export interface CustomerDocumentUrls {
  dniFrontUrl: string | null
  dniBackUrl: string | null
  licenseFrontUrl: string | null
  licenseBackUrl: string | null
}

/** Prefijos aceptados para cada documento, por orden de preferencia */
export const DOCUMENT_PREFIXES: Record<keyof CustomerDocumentUrls, string[]> = {
  dniFrontUrl: ['dni_front'],
  dniBackUrl: ['dni_back'],
  licenseFrontUrl: ['license_front', 'front'],
  licenseBackUrl: ['license_back', 'back'],
}

/** Nombre del archivo más reciente que empieza exactamente por uno de los prefijos */
export function latestDocument(files: StoredFile[], prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    const re = new RegExp(`^${prefix}_(\\d+)\\.[a-z0-9]+$`, 'i')
    let best: string | null = null
    let bestTs = -1
    for (const f of files) {
      const m = re.exec(f.name)
      if (m && Number(m[1]) > bestTs) {
        best = f.name
        bestTs = Number(m[1])
      }
    }
    if (best) return best
  }
  return null
}

/** URLs firmadas (1 h) de los documentos de un cliente. Requiere un cliente con acceso al bucket. */
export async function resolveCustomerDocumentUrls(client: any, userId: string): Promise<CustomerDocumentUrls> {
  const urls: CustomerDocumentUrls = { dniFrontUrl: null, dniBackUrl: null, licenseFrontUrl: null, licenseBackUrl: null }

  try {
    const { data: files } = await client.storage.from('documents').list(userId)
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
