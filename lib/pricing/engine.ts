/**
 * UTOPIA VAN LIFE — Motor de Cálculo de Precios
 * 
 * Algoritmo:
 * 1. Determinar la temporada activa para cada noche del rango de fechas
 * 2. Calcular descuento por estancia > 7 días
 * 3. Sumar extras seleccionados
 * 4. Añadir la fianza de la camper
 */

export interface Season {
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    discount_7days_pct: number
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
    nightsPerSeason: { season: string; nights: number; pricePerNight: number; subtotal: number }[]
    baseTotal: number
    discountPct: number
    discountAmount: number
    extrasTotal: number
    deposit: number
    totalWithoutDeposit: number
    grandTotal: number
}

export function calculatePrice(
    startDate: Date,
    endDate: Date,
    seasons: Season[],
    selectedExtras: Extra[],
    depositAmount: number
): PriceBreakdown {
    const msPerDay = 1000 * 60 * 60 * 24
    const numNights = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay)

    if (numNights <= 0) {
        return emptyBreakdown(depositAmount)
    }

    // Calcular precio por noche según temporada
    const nightsPerSeason: Record<string, { season: string; nights: number; pricePerNight: number; subtotal: number }> = {}
    let baseTotal = 0

    for (let i = 0; i < numNights; i++) {
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

    // Descuento por estancia > 7 días (aplicar el descuento máximo de las temporadas involucradas)
    const maxDiscount = numNights >= 7
        ? Math.max(...seasons
            .filter(s => Object.keys(nightsPerSeason).includes(s.name))
            .map(s => s.discount_7days_pct), 0)
        : 0

    const discountAmount = (baseTotal * maxDiscount) / 100
    const discountedBase = baseTotal - discountAmount

    // Extras
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price * (e.quantity ?? 1), 0)

    return {
        numNights,
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
