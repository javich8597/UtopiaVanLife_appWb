'use client'

import { createClient } from '@/lib/supabase/client'

/** Reduce una foto del móvil (4-8 MB) a ~200-400 KB: lado mayor 1600 px, JPEG calidad 0,72 */
export async function compressImage(file: File | Blob, maxSide = 1600, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo comprimir la foto'))), 'image/jpeg', quality)
  )
}

/** Formato de vídeo que admite el navegador (Safari graba mp4, Chrome/Android webm) */
export function pickVideoMime(): { mime: string; ext: 'webm' | 'mp4' } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const options: { mime: string; ext: 'webm' | 'mp4' }[] = [
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
  ]
  return options.find(o => MediaRecorder.isTypeSupported(o.mime)) || null
}

/** Ajustes de grabación ligera: 720p a ~1 Mbps (unos 7-8 MB por minuto) */
export const VIDEO_BITS_PER_SECOND = 1_000_000
export const VIDEO_MAX_SECONDS = 180
export const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
}

/** Sube un archivo a Storage con una URL firmada que prepara el servidor */
export async function uploadWithSignedUrl(
  endpoint: string,
  body: Record<string, unknown>,
  file: Blob,
  bucket: string
): Promise<string> {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'No se pudo preparar la subida')
  const supabase = createClient()
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(data.path, data.token, file, {
    contentType: file.type || undefined,
  })
  if (error) throw new Error('No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo.')
  return data.path as string
}

export function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}
