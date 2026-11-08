/**
 * Reducción de fotos de documentos en el navegador (canvas). Solo para código de cliente.
 * La lógica de presupuesto y decisión está en lib/documentUploadBudget.ts, que es pura y tiene tests.
 */
import {
    buildEncodeLadder,
    fitToBudget,
    prepareDocuments,
    scaleToLongSide,
    type EncodeStep,
    type PrepareResult,
} from './documentUploadBudget'

interface DecodedImage {
    source: CanvasImageSource
    width: number
    height: number
    release: () => void
}

/** Decodifica respetando la orientación EXIF. Null si el navegador no puede (p. ej. HEIC fuera de Safari) */
async function decodeImage(file: File): Promise<DecodedImage | null> {
    if (typeof createImageBitmap === 'function') {
        for (const options of [{ imageOrientation: 'from-image' } as ImageBitmapOptions, undefined]) {
            try {
                const bitmap = await createImageBitmap(file, options)
                return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
            } catch {
                // Opción no admitida o formato no decodificable: se prueba la siguiente vía
            }
        }
    }

    // Los navegadores actuales aplican la orientación EXIF al dibujar un <img>
    const url = URL.createObjectURL(file)
    try {
        const image = new Image()
        image.decoding = 'async'
        image.src = url
        await image.decode()
        if (!image.naturalWidth || !image.naturalHeight) return null
        return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) }
    } catch {
        URL.revokeObjectURL(url)
        return null
    }
}

function encodeJpeg(decoded: DecodedImage, canvas: HTMLCanvasElement, step: EncodeStep): Promise<Blob | null> {
    const { width, height } = scaleToLongSide(decoded.width, decoded.height, step.maxSide)
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return Promise.resolve(null)

    // El JPEG no tiene transparencia: un PNG con fondo transparente saldría negro
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.source, 0, 0, width, height)
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', step.quality))
}

/**
 * Reduce una foto a JPEG para que pese como mucho `budget` bytes, conservando la legibilidad.
 * Devuelve null si el navegador no la puede decodificar: quien llama la envía tal cual.
 * Si ni con el último paso cabe, devuelve el resultado más pequeño y el total decidirá.
 */
export async function compressDocumentImage(file: File, budget: number): Promise<File | null> {
    const decoded = await decodeImage(file)
    if (!decoded) return null

    const canvas = document.createElement('canvas')
    try {
        const steps = buildEncodeLadder(Math.max(decoded.width, decoded.height))
        const blob = await fitToBudget(budget, steps, step => encodeJpeg(decoded, canvas, step))
        if (!blob) return null

        const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'documento'
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
    } catch {
        return null
    } finally {
        // Libera la memoria del lienzo cuanto antes: en el móvil pesa mucho
        canvas.width = 0
        canvas.height = 0
        decoded.release()
    }
}

/** Deja todos los archivos del envío dentro del presupuesto de una sola petición. Sin red ni servidor */
export function prepareDocumentsForUpload(files: File[]): Promise<PrepareResult> {
    return prepareDocuments(files, compressDocumentImage)
}
