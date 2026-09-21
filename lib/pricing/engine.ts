/**
 * UTOPIA VAN LIFE — Motor de Cálculo de Precios
 * 
 * Algoritmo:
 * 1. Determinar la temporada activa para cada noche del rango de fechas
 *    (Precio Noche = Base Camper + Suplemento Temporada)
 * 2. Calcular suplemento por medio día de entrada (morning) y/o salida (afternoon)
 * 3. Calcular descuento por estancia según tramos dinámicos de días
 * 4. Sumar extras seleccionados
 * 5. Añadir la fianza de la camper
 */

export type DaySlot = 'morning' | 'afternoon'

// ==========================================
// TIPOS V1 (Legacy para compatibilidad)
// ==========================================
export interface Season {
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    discount_7days_pct: number
    min_nights?: number
}

// ==========================================
// TIPOS V2 (Desacoplados: Categorías + Periodos + Tramos)
// ==========================================
export interface SeasonV2 {
    id: string
    code: 'baja' | 'media' | 'alta' | string
    name: string
    supplement_per_night: number
    min_nights: number
    is_default?: boolean
    color_badge?: string
}

export interface SeasonPeriod {
    id?: string
    season_id: string
    start_date: string // YYYY-MM-DD
    end_date: string   // YYYY-MM-DD
    label?: string | null
}

export interface DurationDiscount {
    id?: string
    min_days: number
    discount_pct: number
    is_active: boolean
}

export interface Extra {
    id: string
    name_es: string
    name_en?: string
    price: number
    price_type?: 'per_rental' | 'per_day'
    icon?: string
    quantity?: number
}

export interface PriceBreakdown {
    numNights: number
    totalDays: number
    nightsPerSeason: { season: string; nights: number; pricePerNight: number; subtotal: number }[]
    baseTotal: number
    discountPct: number
    discountAmount: number
    extrasTotal: number
    deposit: number
    totalWithoutDeposit: number
    grandTotal: number
}

// ==========================================
// UTILIDADES DE FECHA Y RANGOS
// ==========================================

export function formatDateToString(date: Date | string): string {
    if (typeof date === 'string') {
        return date.split('T')[0]
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Valida si un periodo de fechas colisiona con periodos ya existentes.
 * Dos intervalos [s1, e1] y [s2, e2] colisionan si: s1 <= e2 && e1 >= s2.
 * Si se especifica un `id` en newPeriod, se ignora ese mismo periodo (edición).
 */
export function hasOverlappingPeriods(
    newPeriod: { start_date: string; end_date: string; id?: string },
    existingPeriods: { id?: string; start_date: string; end_date: string }[]
): boolean {
    const newStart = newPeriod.start_date
    const newEnd = newPeriod.end_date

    return existingPeriods.some(p => {
        if (newPeriod.id && p.id && newPeriod.id === p.id) {
            return false
        }
        return newStart <= p.end_date && newEnd >= p.start_date
    })
}

/**
 * Resuelve la temporada aplicable a una fecha concreta basándose en season_periods.
 * Si no está asignada a ningún periodo explícito, recurre a la temporada por defecto (Baja).
 */
export function resolveSeasonForDate(
    date: Date | string,
    seasons: SeasonV2[],
    periods: SeasonPeriod[]
): SeasonV2 {
    const dateStr = formatDateToString(date)
    const matchingPeriod = periods.find(p => p.start_date <= dateStr && p.end_date >= dateStr)

    if (matchingPeriod) {
        const season = seasons.find(s => s.id === matchingPeriod.season_id)
        if (season) return season
    }

    const defaultSeason = seasons.find(s => s.is_default) ||
        seasons.find(s => s.code.toLowerCase() === 'baja') ||
        seasons[0]

    return defaultSeason || {
        id: 'default-baja',
        code: 'baja',
        name: 'Temporada Baja',
        supplement_per_night: 0,
        min_nights: 3,
        is_default: true,
        color_badge: '#64748b'
    }
}

export function getMinNightsForDateV2(
    date: Date | string,
    seasons: SeasonV2[],
    periods: SeasonPeriod[]
): number {
    return resolveSeasonForDate(date, seasons, periods).min_nights
}

/**
 * Resuelve el tramo de descuento de mayor porcentaje que aplique según el número de días.
 */
export function resolveDurationDiscount(
    totalDays: number,
    discounts: DurationDiscount[]
): { discountPct: number; matchedTier?: DurationDiscount } {
    const applicable = discounts.filter(d => d.is_active && totalDays >= d.min_days)
    if (applicable.length === 0) {
        return { discountPct: 0, matchedTier: undefined }
    }

    const matchedTier = applicable.reduce((best, current) =>
        current.discount_pct > best.discount_pct ? current : best
    , applicable[0])

    return {
        discountPct: matchedTier.discount_pct,
        matchedTier
    }
}

// ==========================================
// CÁLCULO DE PRECIOS V2 (Base Camper + Suplemento)
// ==========================================

export interface CalculatePriceV2Params {
    startDate: Date
    startSlot?: DaySlot
    endDate: Date
    endSlot?: DaySlot
    camperBasePrice: number
    seasons: SeasonV2[]
    periods: SeasonPeriod[]
    discounts?: DurationDiscount[]
    selectedExtras?: Extra[]
    depositAmount?: number
}

export function calculatePriceV2({
    startDate,
    startSlot = 'afternoon',
    endDate,
    endSlot = 'morning',
    camperBasePrice,
    seasons,
    periods,
    discounts = [],
    selectedExtras = [],
    depositAmount = 0
}: CalculatePriceV2Params): PriceBreakdown {
    const msPerDay = 1000 * 60 * 60 * 24
    const baseNights = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

    if (baseNights <= 0) {
        return emptyBreakdown(depositAmount)
    }

    const startSeason = resolveSeasonForDate(startDate, seasons, periods)
    const endSeason = resolveSeasonForDate(endDate, seasons, periods)
    const startPrice = Number(camperBasePrice) + Number(startSeason.supplement_per_night)
    const endPrice = Number(camperBasePrice) + Number(endSeason.supplement_per_night)

    let extraDays = 0
    let extraSlotCost = 0

    if (startSlot === 'morning') {
        extraDays += 0.5
        extraSlotCost += startPrice * 0.5
    }
    if (endSlot === 'afternoon') {
        extraDays += 0.5
        extraSlotCost += endPrice * 0.5
    }

    const totalDays = baseNights + extraDays

    // Calcular precio por noche según temporada
    const nightsPerSeason: Record<string, { season: string; nights: number; pricePerNight: number; subtotal: number }> = {}
    let baseTotal = 0

    for (let i = 0; i < baseNights; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + i)

        const activeSeason = resolveSeasonForDate(currentDate, seasons, periods)
        const pricePerNight = Number(camperBasePrice) + Number(activeSeason.supplement_per_night)
        const seasonName = activeSeason.name

        if (!nightsPerSeason[seasonName]) {
            nightsPerSeason[seasonName] = { season: seasonName, nights: 0, pricePerNight, subtotal: 0 }
        }
        nightsPerSeason[seasonName].nights++
        nightsPerSeason[seasonName].subtotal += pricePerNight
        baseTotal += pricePerNight
    }

    baseTotal += extraSlotCost

    // Descuento por estancia
    const { discountPct } = resolveDurationDiscount(totalDays, discounts)
    const discountAmount = Math.round(((baseTotal * discountPct) / 100) * 100) / 100
    const discountedBase = baseTotal - discountAmount

    // Extras
    const extrasTotal = selectedExtras.reduce((sum, e) => {
        const qty = e.quantity ?? 1
        const price = Number(e.price) || 0
        const multiplier = e.price_type === 'per_day' ? Math.ceil(totalDays) : 1
        return sum + (price * multiplier * qty)
    }, 0)
    const numDeposit = Number(depositAmount) || 0

    return {
        numNights: baseNights,
        totalDays,
        nightsPerSeason: Object.values(nightsPerSeason),
        baseTotal,
        discountPct,
        discountAmount,
        extrasTotal,
        deposit: numDeposit,
        totalWithoutDeposit: discountedBase + extrasTotal,
        grandTotal: discountedBase + extrasTotal + numDeposit,
    }
}

// ==========================================
// CÁLCULO DE PRECIOS V1 (Compatibilidad hacia atrás)
// ==========================================

export function getMinNightsForDate(date: Date, seasons: Season[]): number {
    const active = findSeason(date, seasons)
    return active?.min_nights ?? 3
}

export function calculatePrice(
    startDate: Date,
    endDate: Date,
    seasons: Season[],
    selectedExtras: Extra[],
    depositAmount: number
): PriceBreakdown
export function calculatePrice(
    startDate: Date,
    startSlot: DaySlot,
    endDate: Date,
    endSlot: DaySlot,
    seasons: Season[],
    selectedExtras: Extra[],
    depositAmount: number
): PriceBreakdown
export function calculatePrice(
    startDate: Date,
    arg2: Date | DaySlot,
    arg3: Season[] | Date,
    arg4: Extra[] | DaySlot,
    arg5: number | Season[],
    arg6?: Extra[],
    arg7?: number
): PriceBreakdown {
    let startSlot: DaySlot = 'afternoon'
    let endDate: Date
    let endSlot: DaySlot = 'morning'
    let seasons: Season[]
    let selectedExtras: Extra[]
    let depositAmount: number

    if (arg2 instanceof Date) {
        endDate = arg2
        seasons = arg3 as Season[]
        selectedExtras = (arg4 as Extra[]) || []
        depositAmount = (arg5 as number) ?? 0
    } else {
        startSlot = arg2 as DaySlot
        endDate = arg3 as Date
        endSlot = arg4 as DaySlot
        seasons = (arg5 as Season[]) || []
        selectedExtras = arg6 || []
        depositAmount = arg7 ?? 0
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const baseNights = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

    if (baseNights <= 0) {
        return emptyBreakdown(depositAmount)
    }

    const startSeason = findSeason(startDate, seasons)
    const endSeason = findSeason(endDate, seasons)
    const startPrice = Number(startSeason?.price_per_night ?? 120)
    const endPrice = Number(endSeason?.price_per_night ?? 120)

    let extraDays = 0
    let extraSlotCost = 0

    if (startSlot === 'morning') {
        extraDays += 0.5
        extraSlotCost += startPrice * 0.5
    }
    if (endSlot === 'afternoon') {
        extraDays += 0.5
        extraSlotCost += endPrice * 0.5
    }

    const totalDays = baseNights + extraDays

    // Calcular precio por noche según temporada
    const nightsPerSeason: Record<string, { season: string; nights: number; pricePerNight: number; subtotal: number }> = {}
    let baseTotal = 0

    for (let i = 0; i < baseNights; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + i)

        const activeSeason = findSeason(currentDate, seasons)
        const pricePerNight = Number(activeSeason?.price_per_night ?? 120)
        const seasonName = activeSeason?.name ?? 'Temporada Estándar'

        if (!nightsPerSeason[seasonName]) {
            nightsPerSeason[seasonName] = { season: seasonName, nights: 0, pricePerNight, subtotal: 0 }
        }
        nightsPerSeason[seasonName].nights++
        nightsPerSeason[seasonName].subtotal += pricePerNight
        baseTotal += pricePerNight
    }

    baseTotal += extraSlotCost

    // Descuento por estancia >= 7 días
    const maxDiscount = totalDays >= 7
        ? Math.max(...seasons
            .filter(s => Object.keys(nightsPerSeason).includes(s.name))
            .map(s => Number(s.discount_7days_pct) || 0), 0)
        : 0

    const discountAmount = Math.round(((baseTotal * maxDiscount) / 100) * 100) / 100
    const discountedBase = baseTotal - discountAmount

    // Extras
    const extrasTotal = selectedExtras.reduce((sum, e) => {
        const qty = e.quantity ?? 1
        const price = Number(e.price) || 0
        const multiplier = e.price_type === 'per_day' ? Math.ceil(totalDays) : 1
        return sum + (price * multiplier * qty)
    }, 0)
    const numDeposit = Number(depositAmount) || 0

    return {
        numNights: baseNights,
        totalDays,
        nightsPerSeason: Object.values(nightsPerSeason),
        baseTotal,
        discountPct: maxDiscount,
        discountAmount,
        extrasTotal,
        deposit: numDeposit,
        totalWithoutDeposit: discountedBase + extrasTotal,
        grandTotal: discountedBase + extrasTotal + numDeposit,
    }
}

function findSeason(date: Date, seasons: Season[]): Season | undefined {
    const dateStr = formatDateToString(date)
    return seasons.find(s => s.start_date <= dateStr && s.end_date >= dateStr)
}

function emptyBreakdown(depositAmount: number): PriceBreakdown {
    return {
        numNights: 0,
        totalDays: 0,
        nightsPerSeason: [],
        baseTotal: 0,
        discountPct: 0,
        discountAmount: 0,
        extrasTotal: 0,
        deposit: depositAmount,
        totalWithoutDeposit: 0,
        grandTotal: depositAmount,
    }
}

export function formatPrice(amount: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}
