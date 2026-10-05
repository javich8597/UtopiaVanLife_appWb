/**
 * Entrega (pickup) y devolución (return) de la camper.
 * Define los pasos obligatorios y valida que todo esté hecho antes de cerrar la entrega.
 */

export type HandoverKind = 'pickup' | 'return'

export interface ChecklistItem {
  id: string
  label: string
}

export const FUEL_LEVELS = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'] as const

export const CHECKLIST: Record<HandoverKind, ChecklistItem[]> = {
  pickup: [
    { id: 'water', label: 'Depósito de agua limpia lleno' },
    { id: 'gas', label: 'Gas comprobado' },
    { id: 'clean', label: 'Camper limpia por dentro y por fuera' },
    { id: 'damages', label: 'Daños previos revisados con el cliente' },
    { id: 'keys', label: 'Llaves entregadas' },
    { id: 'papers', label: 'Documentación del vehículo a bordo' },
    { id: 'extras', label: 'Extras contratados entregados' },
    { id: 'explained', label: 'Funcionamiento explicado al cliente' },
  ],
  return: [
    { id: 'water', label: 'Aguas grises vaciadas' },
    { id: 'wc', label: 'WC químico vaciado' },
    { id: 'clean', label: 'Interior limpio' },
    { id: 'damages', label: 'Daños nuevos revisados con el cliente' },
    { id: 'keys', label: 'Llaves devueltas' },
    { id: 'extras', label: 'Extras devueltos completos' },
  ],
}

export interface HandoverLike {
  kind: HandoverKind
  license_checked?: boolean | null
  km?: number | null
  fuel_level?: string | null
  dashboard_photo_path?: string | null
  exterior_video_path?: string | null
  interior_video_path?: string | null
  checklist?: Record<string, boolean> | null
  customer_signature?: string | null
}

export interface HandoverStep {
  id: 'license' | 'km' | 'exterior' | 'interior' | 'checklist' | 'signature'
  label: string
  done: boolean
}

export function handoverSteps(h: HandoverLike): HandoverStep[] {
  const items = CHECKLIST[h.kind]
  const checks = h.checklist || {}
  const steps: HandoverStep[] = []
  if (h.kind === 'pickup') {
    steps.push({ id: 'license', label: 'Carnet comprobado', done: Boolean(h.license_checked) })
  }
  steps.push(
    { id: 'km', label: 'Kilómetros y cuadro', done: Number.isFinite(h.km) && (h.km as number) >= 0 && Boolean(h.fuel_level) && Boolean(h.dashboard_photo_path) },
    { id: 'exterior', label: 'Vídeo exterior', done: Boolean(h.exterior_video_path) },
    { id: 'interior', label: 'Vídeo interior', done: Boolean(h.interior_video_path) },
    { id: 'checklist', label: 'Revisión', done: items.every(i => checks[i.id] === true) },
    { id: 'signature', label: 'Firma del cliente', done: Boolean(h.customer_signature) },
  )
  return steps
}

export function missingSteps(h: HandoverLike): string[] {
  return handoverSteps(h).filter(s => !s.done).map(s => s.label)
}

/** En la devolución: km recorridos y si se pasó del paquete de 150 km/día */
export function kmSummary(pickupKm?: number | null, returnKm?: number | null, nights?: number, kmPackage?: string | null) {
  if (!Number.isFinite(pickupKm) || !Number.isFinite(returnKm)) return null
  const driven = Math.max(0, (returnKm as number) - (pickupKm as number))
  const allowance = kmPackage === 'unlimited' ? null : Math.max(1, nights || 1) * 150
  return { driven, allowance, extra: allowance === null ? 0 : Math.max(0, driven - allowance) }
}
