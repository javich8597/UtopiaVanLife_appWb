/**
 * UTOPIA VAN LIFE — Motor de Cálculo de Precios
 * 
 * Algoritmo:
 * 1. Determinar la temporada activa para cada noche del rango de fechas
 * 2. Calcular suplemento por medio día de entrada (morning) y/o salida (afternoon)
 * 3. Calcular descuento por estancia >= 7 días
 * 4. Sumar extras seleccionados
 * 5. Añadir la fianza de la camper
 */

export type DaySlot = 'morning' | 'afternoon'

export interface Season {
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    discount_7days_pct: number
    min_nights?: number
}

export interface Extra {
    id: string
    name_es: string
    name_en?: string
    price: number
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
    const startPrice = startSeason?.price_per_night ?? 120
    const endPrice = endSeason?.price_per_night ?? 120

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
        const pricePerNight = activeSeason?.price_per_night ?? 120 // fallback
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
            .map(s => s.discount_7days_pct), 0)
        : 0

    const discountAmount = (baseTotal * maxDiscount) / 100
    const discountedBase = baseTotal - discountAmount

    // Extras
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price * (e.quantity ?? 1), 0)

    return {
        numNights: baseNights,
        totalDays,
        nightsPerSeason: Object.values(nightsPerSeason),
        baseTotal,
        discountPct: maxDiscount,
        discountAmount,
        extrasTotal,
        deposit: depositAmount,
        totalWithoutDeposit: discountedBase + extrasTotal,
        grandTotal: discountedBase + extrasTotal + depositAmount,
    }
}

function findSeason(date: Date, seasons: Season[]): Season | undefined {
    const dateStr = date.toISOString().split('T')[0]
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
