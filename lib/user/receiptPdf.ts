/**
 * Justificante de reserva y pago (no es una factura).
 * Resume lo que el cliente ha pagado con los datos reales de la reserva y del arrendador.
 */
import type { ContractData } from '@/lib/contracts/contractEngine'
import { formatPrice } from '@/lib/pricing/engine'

export interface ReceiptInput {
  contract: ContractData
  booking: {
    id: string
    created_at?: string | null
    start_date: string
    end_date: string
    total_price?: number | null
    deposit_amount?: number | null
    payment_status?: string | null
  }
  extras: string[]
}

const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export function receiptReference(bookingId: string) {
  return `RES-${bookingId.slice(0, 8).toUpperCase()}`
}

export async function downloadReceiptPdf({ contract, booking, extras }: ReceiptInput) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ink: [number, number, number] = [31, 27, 23]
  const muted: [number, number, number] = [106, 97, 87]
  const line: [number, number, number] = [234, 229, 221]
  const ref = receiptReference(booking.id)
  let y = 24

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(...ink)
  pdf.text(contract.lessor.companyName.toUpperCase(), 18, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...muted)
  pdf.text(`CIF ${contract.lessor.cif} · ${contract.lessor.address}, ${contract.lessor.city}`, 18, y + 5)
  pdf.text(`${contract.lessor.email} · ${contract.lessor.phone}`, 18, y + 9)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(...ink)
  pdf.text(ref, 192, y, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...muted)
  pdf.text(`Emitido el ${fmt(new Date().toISOString())}`, 192, y + 5, { align: 'right' })

  y += 18
  pdf.setDrawColor(...line)
  pdf.setLineWidth(0.4)
  pdf.line(18, y, 192, y)

  y += 12
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(...ink)
  pdf.text('Justificante de reserva y pago', 18, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...muted)
  pdf.text('Este documento acredita la reserva y el pago. No sustituye a la factura.', 18, y + 6)

  const rows: [string, string][] = [
    ['Titular', contract.lessee.fullName],
    ['DNI / NIE', contract.lessee.dniNie || '—'],
    ['Email', contract.lessee.email],
    ['Vehículo', `${contract.vehicle.modelName} (${contract.vehicle.vehicleType})`],
    ['Recogida', `${fmt(booking.start_date)} · ${contract.booking.pickupLocation}`],
    ['Devolución', `${fmt(booking.end_date)} · ${contract.booking.dropoffLocation}`],
    ['Extras', extras.length > 0 ? extras.join(', ') : 'Sin extras'],
    ['Fecha de reserva', booking.created_at ? fmt(booking.created_at) : '—'],
    ['Estado del pago', booking.payment_status === 'paid' ? 'Pagado' : 'Pendiente'],
  ]

  y += 16
  pdf.setFontSize(9)
  for (const [label, value] of rows) {
    pdf.setTextColor(...muted)
    pdf.setFont('helvetica', 'normal')
    pdf.text(label, 18, y)
    pdf.setTextColor(...ink)
    const lines = pdf.splitTextToSize(value, 120)
    pdf.text(lines, 70, y)
    y += 6 * lines.length + 2
    pdf.setDrawColor(...line)
    pdf.line(18, y - 4, 192, y - 4)
  }

  y += 6
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...ink)
  pdf.text('Total del alquiler (IVA incluido)', 18, y)
  pdf.text(formatPrice(Number(booking.total_price || 0)), 192, y, { align: 'right' })
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...muted)
  pdf.text('Fianza reembolsable', 18, y)
  pdf.text(formatPrice(Number(booking.deposit_amount || 0)), 192, y, { align: 'right' })

  pdf.setFontSize(7.5)
  pdf.text(`Referencia de reserva ${booking.id}`, 18, 284)

  pdf.save(`${ref}_justificante.pdf`)
}
