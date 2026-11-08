/**
 * Presupuesto de peso de la documentación del conductor. Lógica pura, sin navegador: la usan las
 * pantallas de subida, la ruta /api/upload-driver-docs y los tests.
 *
 * Vercel rechaza con 413 las peticiones de más de unos 4,5 MB a una función, antes de que lleguen a la
 * ruta. Todos los archivos viajan en UNA sola petición (la ruta pasa a revisión y revoca el acceso con
 * el primer envío con archivos: una segunda petición daría 401), así que el navegador reduce las fotos
 * para que quepan entre todas.
 */

/** Límite de Vercel por petición a una función (4,5 MB). La ruta no admite más que esto. */
export const MAX_REQUEST_BYTES = 4_500_000

/** Peso máximo de todos los archivos juntos. El resto del límite queda para el multipart y los campos de texto */
export const FILES_BUDGET_BYTES = 3_800_000

/** Foto original máxima que se acepta elegir: se reduce en el navegador antes de enviarla */
export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024

/** Lado largo por debajo del cual el DNI empieza a perder legibilidad: solo se baja de aquí como último recurso */
export const COMFORT_LONG_SIDE = 1600

export type DocumentKind = 'jpeg' | 'png' | 'heic' | 'pdf' | 'other'

const EXTENSION_KIND: Record<string, DocumentKind> = {
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    heic: 'heic',
    heif: 'heic',
    pdf: 'pdf',
}

const TYPE_KIND: Record<string, DocumentKind> = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heic',
    'application/pdf': 'pdf',
}

/** Algunos móviles y navegadores de escritorio dejan el tipo vacío (típico en HEIC): se mira también la extensión */
export function classifyDocument(file: { name: string; type: string }): DocumentKind {
    const byType = TYPE_KIND[(file.type || '').toLowerCase()]
    if (byType) return byType
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    return EXTENSION_KIND[extension] || 'other'
}

/** Solo estas fotos se pueden reducir con canvas. El PDF y lo desconocido viajan tal cual */
export function isReducibleImage(kind: DocumentKind): boolean {
    return kind === 'jpeg' || kind === 'png' || kind === 'heic'
}

export type BudgetAction = { action: 'keep' } | { action: 'reduce'; budget: number }

/**
 * Reparte el presupuesto entre los archivos del envío. Lo que no se puede reducir (PDF) se descuenta
 * primero. Las fotos que ya caben en su parte se envían tal cual y dejan margen a las más pesadas.
 */
export function planUploadBudget(
    files: Array<{ size: number; kind: DocumentKind }>,
    totalBudget: number = FILES_BUDGET_BYTES
): BudgetAction[] {
    const plan: BudgetAction[] = files.map(() => ({ action: 'keep' }))

    let remaining = totalBudget
    const images: number[] = []
    files.forEach((file, index) => {
        if (isReducibleImage(file.kind)) images.push(index)
        else remaining -= file.size
    })

    images.sort((a, b) => files[a].size - files[b].size)
    images.forEach((index, position) => {
        const share = Math.max(0, remaining) / (images.length - position)
        if (files[index].size <= share) {
            remaining -= files[index].size
        } else {
            plan[index] = { action: 'reduce', budget: Math.floor(share) }
            remaining -= share
        }
    })
    return plan
}

export interface EncodeStep {
    maxSide: number
    quality: number
}

const COMFORT_SIDES = [2400, 2000, COMFORT_LONG_SIDE]
const COMFORT_QUALITIES = [0.85, 0.75, 0.65, 0.55]
const LAST_RESORT_SIDES = [1400, 1200, 1000]
const LAST_RESORT_QUALITIES = [0.6, 0.5]

/**
 * Pasos para reducir una foto, del más fiel al más pequeño. Por debajo de 1600 px de lado largo solo se
 * baja si no hay otra forma de que quepa. Nunca se amplía: los lados mayores que la foto se repiten y se quitan.
 */
export function buildEncodeLadder(sourceLongSide: number): EncodeStep[] {
    const steps: EncodeStep[] = []
    const seen = new Set<number>()
    const add = (sides: number[], qualities: number[]) => {
        for (const side of sides) {
            const maxSide = Math.min(side, Math.max(1, Math.round(sourceLongSide)))
            if (seen.has(maxSide)) continue
            seen.add(maxSide)
            for (const quality of qualities) steps.push({ maxSide, quality })
        }
    }
    add(COMFORT_SIDES, COMFORT_QUALITIES)
    add(LAST_RESORT_SIDES, LAST_RESORT_QUALITIES)
    return steps
}

/** Tamaño tras limitar el lado largo, sin ampliar ni deformar */
export function scaleToLongSide(width: number, height: number, maxSide: number): { width: number; height: number } {
    const longSide = Math.max(width, height)
    if (longSide <= maxSide) return { width, height }
    const ratio = maxSide / longSide
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

/**
 * Prueba los pasos en orden y se queda con el primero que cabe en el presupuesto. Si ninguno cabe,
 * devuelve el más pequeño (el último) para que quien llama decida con el total. Null si no se pudo codificar.
 */
export async function fitToBudget<T extends { size: number }>(
    budget: number,
    steps: EncodeStep[],
    encode: (step: EncodeStep) => Promise<T | null>
): Promise<T | null> {
    let smallest: T | null = null
    for (const step of steps) {
        const result = await encode(step)
        if (!result) return null
        if (result.size <= budget) return result
        smallest = result
    }
    return smallest
}

export type PrepareResult =
    | { ok: true; files: File[]; totalBytes: number }
    | { ok: false; totalBytes: number }

/**
 * Deja los archivos del envío dentro del presupuesto. `reduce` devuelve la foto reducida, o null si el
 * navegador no la puede decodificar (HEIC sin soporte): entonces viaja tal cual. Si el total sigue por
 * encima del presupuesto, no se envía nada.
 */
export async function prepareDocuments(
    files: File[],
    reduce: (file: File, budget: number) => Promise<File | null>,
    totalBudget: number = FILES_BUDGET_BYTES
): Promise<PrepareResult> {
    const kinds = files.map(classifyDocument)
    const prepared: Array<File | undefined> = files.map(() => undefined)

    // Los HEIC primero: si el navegador no los decodifica viajan con su peso real y el resto debe adaptarse
    const order = files.map((_, index) => index).sort((a, b) => Number(kinds[b] === 'heic') - Number(kinds[a] === 'heic'))

    for (const i of order) {
        // El reparto se rehace en cada paso con lo que ya está resuelto: lo que sobró de una foto pasa a las demás
        const plan = planUploadBudget(
            files.map((file, index) => {
                const done = prepared[index]
                return done ? { size: done.size, kind: 'other' as const } : { size: file.size, kind: kinds[index] }
            }),
            totalBudget
        )
        const step = plan[i]
        if (step.action === 'keep') {
            prepared[i] = files[i]
            continue
        }
        const reduced = await reduce(files[i], step.budget)
        prepared[i] = reduced && reduced.size < files[i].size ? reduced : files[i]
    }

    const result = prepared as File[]
    const totalBytes = result.reduce((sum, file) => sum + file.size, 0)
    return totalBytes > totalBudget ? { ok: false, totalBytes } : { ok: true, files: result, totalBytes }
}

export type UploadOutcome<T = Record<string, unknown>> =
    | { kind: 'ok'; data: T }
    | { kind: 'tooLarge' }
    | { kind: 'error'; message: string | null }

/**
 * Interpreta la respuesta de la subida sin fallar al parsear. Un 413 de Vercel no es JSON, y con mala
 * cobertura puede llegar una página de error en lugar de la respuesta de la ruta.
 */
export function interpretUploadResponse<T = Record<string, unknown>>(status: number, bodyText: string): UploadOutcome<T> {
    if (status === 413) return { kind: 'tooLarge' }

    let data: unknown = null
    try {
        data = JSON.parse(bodyText)
    } catch {
        return { kind: 'error', message: null }
    }
    const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    const message = typeof body.error === 'string' && body.error ? body.error : null

    if (status < 200 || status >= 300 || message) return { kind: 'error', message }
    return { kind: 'ok', data: body as T }
}
