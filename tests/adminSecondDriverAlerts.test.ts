import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { secondDriverAlerts } from '../lib/admin/secondDriverAlerts'

/**
 * Los avisos del segundo conductor (ficha incompleta, requisitos de la póliza, plazo de subida) se
 * calculan desde la propia reserva y se enseñan en su detalle. Antes solo existían como líneas de
 * log del servidor. Sin Supabase: filas en memoria.
 */

const NOW = new Date('2026-12-01T10:00:00Z')

function row(extra: Record<string, unknown> = {}): Record<string, any> {
    return {
        id: '11111111-aaaa-bbbb-cccc-222222222222',
        status: 'confirmed',
        payment_status: 'paid',
        start_date: '2027-06-01',
        end_date: '2027-06-08',
        passengers: [{ fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2012-01-01' }],
        ...extra,
    }
}
const codes = (booking: unknown) => secondDriverAlerts(booking, NOW).map(a => a.code)

describe('Avisos del segundo conductor en el detalle de la reserva', () => {
    it('una ficha completa y en regla no avisa de nada', () => {
        assert.deepEqual(codes(row()), [])
    })

    it('sin segundo conductor, o con la reserva cancelada, no hay avisos', () => {
        assert.deepEqual(codes(row({ passengers: [] })), [])
        assert.deepEqual(codes(row({ status: 'cancelled', passengers: [{ isSecondDriver: true }] })), [])
        assert.deepEqual(codes(null), [])
    })

    it('ficha sin fechas: avisa de que no se puede comprobar la edad ni la antigüedad del carnet', () => {
        const booking = row({ passengers: [{ fullName: 'Ana Ruiz', dniNie: '12345678Z', isSecondDriver: true }] })
        const [alert] = secondDriverAlerts(booking, NOW)
        assert.equal(alert.code, 'missing_dates')
        assert.match(alert.text, /fecha de nacimiento ni fecha de expedición/)
        assert.equal(alert.severity, 'danger')
        assert.match(alert.text, /no podrá subir su documentación/)
    })

    it('cobrado sin documento: aviso para actuar antes de la entrega', () => {
        const booking = row({ passengers: [], has_second_driver: true })
        const [alert] = secondDriverAlerts(booking, NOW)
        assert.equal(alert.code, 'missing_document')
        assert.equal(alert.severity, 'danger')
    })

    it('ficha sin nombre: avisa de que el contrato dirá «Pendiente de verificación»', () => {
        const booking = row({ passengers: [{ dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2012-01-01' }] })
        assert.deepEqual(codes(booking), ['missing_name'])
    })

    it('menor de 25 años en la recogida: aviso grave con el motivo de la póliza', () => {
        const booking = row({ passengers: [{ fullName: 'Joven', dniNie: '12345678Z', isSecondDriver: true, birthDate: '2005-01-01', licenseDate: '2012-01-01' }] })
        const [alert] = secondDriverAlerts(booking, NOW)
        assert.equal(alert.code, 'requirement')
        assert.equal(alert.severity, 'danger')
        assert.match(alert.text, /25 años/)
    })

    it('carnet con menos de 2 años en la recogida: aviso grave', () => {
        const booking = row({ passengers: [{ fullName: 'Novel', dniNie: '12345678Z', isSecondDriver: true, birthDate: '1990-01-01', licenseDate: '2026-06-01' }] })
        assert.deepEqual(codes(booking), ['requirement'])
    })

    it('documentación sin subir dentro del plazo: aviso suave; pasado el plazo, grave', () => {
        const inWindow = row({ second_driver_docs_uploaded_at: null })
        assert.deepEqual(secondDriverAlerts(inWindow, NOW).map(a => [a.code, a.severity]), [['docs_pending', 'warn']])

        const closed = row({ second_driver_docs_uploaded_at: null, status: 'completed', start_date: '2026-10-01', end_date: '2026-10-08' })
        const alerts = secondDriverAlerts(closed, NOW)
        assert.deepEqual(alerts.map(a => [a.code, a.severity]), [['upload_closed', 'danger']])
        assert.match(alerts[0].text, /el día de la devolución/i)
    })

    it('con la documentación subida no avisa; sin la columna (migración sin aplicar) no inventa avisos', () => {
        assert.deepEqual(codes(row({ second_driver_docs_uploaded_at: '2026-11-20T10:00:00Z' })), [])
        assert.deepEqual(codes(row()), [])
    })
})
