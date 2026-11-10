import { bookingSecondDriver } from '../booking/secondDriver'

/**
 * Desglose económico de una reserva tal y como lo enseña el backoffice.
 *
 * Todo lo que se cobra va dentro de `bookings.total_price`: alquiler base (antes de descuento) menos
 * descuento, más kilometraje, cancelación flexible, suplemento de fianza Flex, suplemento del segundo
 * conductor y extras. El panel enseña una línea por concepto para que la suma cuadre con el total.
 *
 * El suplemento Flex y el del segundo conductor no tienen columna propia: solo viven en
 * `bookings.pricing_breakdown` (`flexDepositSupplement`, `secondDriverSupplement`...). Se leen de ahí
 * tal como se cobraron; no se recalculan.
 */

type Row = Record<string, unknown>

const asRow = (value: unknown): Row | null =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null

const money = (value: unknown): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

/** Redondeo a céntimos: evita que 0,1 + 0,2 deje restos en el cuadre */
const cents = (value: number): number => Math.round(value * 100) / 100

function breakdownOf(booking: unknown): Row {
    return asRow(asRow(booking)?.pricing_breakdown) ?? {}
}

export interface FlexDeposit {
    /** La reserva se hizo con fianza Flex (1.000 €) */
    isFlex: boolean
    ratePerDay: number
    /** Suplemento total cobrado por la fianza Flex (va dentro de total_price) */
    supplement: number
}

/** Fianza Flex de la reserva, según el desglose con el que se cobró */
export function bookingFlexDeposit(booking: unknown): FlexDeposit {
    const b = breakdownOf(booking)
    const supplement = cents(money(b.flexDepositSupplement))
    const ratePerDay = money(b.flexDepositRatePerDay)
    const isFlex = b.depositOption === 'flex_1000' || supplement > 0
    return { isFlex, ratePerDay, supplement }
}

export interface AdminSecondDriver {
    /** Nombre de la ficha; vacío si la reserva cobró/registró al segundo conductor pero no consta quién */
    fullName: string
    document: string
    /** Con fianza Flex va incluido: no suma al total */
    included: boolean
    ratePerDay: number
    /** Suplemento total cobrado (0 si va incluido) */
    supplement: number
}

/**
 * Segundo conductor DE LA RESERVA, o null si no lleva ninguno.
 *
 * Quién es lo decide `bookingSecondDriver` (lib/booking/secondDriver.ts), la MISMA regla que usan el
 * contrato y la subida de documentos: columnas `second_driver_*` de la reserva, luego `passengers`,
 * luego el desglose cobrado. Nunca el perfil del cliente: una cuenta tiene varias reservas y solo
 * algunas llevan segundo conductor. El importe sale de `pricing_breakdown`.
 *
 * Si se cobró suplemento pero no consta quién (ni columnas, ni ficha, ni bandera), la línea se
 * enseña igualmente sin nombre: ocultarla dejaría el desglose por debajo del Total Abonado.
 */
export function adminBookingSecondDriver(booking: unknown): AdminSecondDriver | null {
    if (!asRow(booking)) return null
    const b = breakdownOf(booking)
    const supplement = cents(money(b.secondDriverSupplement))

    const driver = bookingSecondDriver(booking)
    if (!driver && supplement <= 0) return null

    return {
        fullName: driver?.fullName ?? '',
        document: driver?.document ?? '',
        included: supplement === 0,
        ratePerDay: money(b.secondDriverRatePerDay),
        supplement,
    }
}

export interface BasePriceParts {
    kmSupplement: number
    cancellationSupplement: number
    extrasSubtotal: number
    discountAmount: number
}

/**
 * Alquiler base (antes de descuento). Si la fila trae `base_price` o `pricing_breakdown.baseRentalTotal`,
 * se usa tal cual.
 * Respaldo: total_price menos todo lo que se suma encima, incluidos los suplementos de fianza Flex
 * y de segundo conductor (si no se restaran, el alquiler base saldría inflado).
 */
export function resolveBasePrice(booking: unknown, parts: BasePriceParts): number {
    const row = asRow(booking) ?? {}
    // `pricing_breakdown.basePrice` es la tarifa por noche de la camper, no el alquiler: no sirve aquí
    const b = breakdownOf(booking)
    const stored = row.base_price ?? b.baseRentalTotal ?? b.baseTotal
    if (stored !== undefined && stored !== null) return Number(stored)

    const flex = bookingFlexDeposit(booking)
    const second = adminBookingSecondDriver(booking)
    return Math.max(
        0,
        cents(
            money(row.total_price) -
                parts.kmSupplement -
                parts.cancellationSupplement -
                flex.supplement -
                (second?.supplement ?? 0) -
                parts.extrasSubtotal +
                parts.discountAmount
        )
    )
}

export type BreakdownLineKind = 'base' | 'discount' | 'km' | 'cancellation' | 'flexDeposit' | 'secondDriver' | 'extras'

export interface BreakdownLine {
    kind: BreakdownLineKind
    label: string
    /** Importe con signo: el descuento es negativo */
    amount: number
    /** Línea sin coste que se enseña como «Incluido» en vez de 0,00 € */
    included?: boolean
}

export interface BreakdownInput extends BasePriceParts {
    basePrice: number
    nights: number
    kmLabel: string
    cancellationLabel: string
    extrasCount: number
}

const euro = (value: number): string =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

/**
 * Líneas del «Desglose Económico Pormenorizado», en orden. La suma de `amount` es el total que
 * debe coincidir con `bookings.total_price` en una reserva con datos completos.
 */
export function buildBreakdownLines(booking: unknown, input: BreakdownInput): BreakdownLine[] {
    const lines: BreakdownLine[] = [
        { kind: 'base', label: `Alquiler base camper (${input.nights} noches)`, amount: input.basePrice },
    ]

    if (input.discountAmount > 0) {
        lines.push({ kind: 'discount', label: 'Descuento aplicado por estancia prolongada', amount: -input.discountAmount })
    }

    lines.push({ kind: 'km', label: `Paquete de KM: ${input.kmLabel}`, amount: input.kmSupplement })
    lines.push({ kind: 'cancellation', label: `Política de Cancelación: ${input.cancellationLabel}`, amount: input.cancellationSupplement })

    const flex = bookingFlexDeposit(booking)
    if (flex.isFlex) {
        lines.push({
            kind: 'flexDeposit',
            label: `Fianza Flex 1.000 €${flex.ratePerDay > 0 ? ` (+${euro(flex.ratePerDay)} €/día)` : ''}`,
            amount: flex.supplement,
        })
    }

    const second = adminBookingSecondDriver(booking)
    if (second) {
        const who = second.fullName ? `: ${second.fullName}` : ''
        const rate = second.ratePerDay > 0 ? ` (+${euro(second.ratePerDay)} €/día)` : ''
        lines.push({
            kind: 'secondDriver',
            label: second.included
                ? `Segundo conductor${who} (${flex.isFlex ? 'incluido con fianza Flex' : 'sin suplemento registrado'})`
                : `Segundo conductor${who}${rate}`,
            amount: second.supplement,
            included: second.included,
        })
    }

    if (input.extrasSubtotal > 0) {
        lines.push({ kind: 'extras', label: `Extras y experiencias (${input.extrasCount} seleccionados)`, amount: input.extrasSubtotal })
    }

    return lines
}

/** Suma de las líneas, a céntimos */
export function sumBreakdownLines(lines: BreakdownLine[]): number {
    return cents(lines.reduce((acc, line) => acc + line.amount, 0))
}
