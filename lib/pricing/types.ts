/**
 * UTOPIA VAN LIFE — Tipos del Motor de Precios y Reservas
 */

export type DaySlot = 'morning' | 'afternoon'

export type KmPackage = 'included_150' | 'unlimited'
export type CancellationPolicy = 'standard' | 'flexible'
export type ExtraPricingType = 'per_rental' | 'per_day' | 'fixed'

export interface CategorizedExtra {
    id?: string
    extraId?: string
    name: string
    name_es?: string
    name_en?: string
    category: 'Equipamiento' | 'Deporte' | 'Confort' | string
    price: number
    pricingType?: ExtraPricingType
    pricing_type?: ExtraPricingType
    price_type?: ExtraPricingType
    quantity?: number
}

export interface ItemizedExtra {
    id: string
    name: string
    category: string
    quantity: number
    unitPrice: number
    pricingType: ExtraPricingType
    total: number
}

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
    name?: string
    price: number
    price_type?: 'per_rental' | 'per_day' | 'fixed'
    pricing_type?: 'per_rental' | 'per_day' | 'fixed'
    pricingType?: 'per_rental' | 'per_day' | 'fixed'
    category?: 'Equipamiento' | 'Deporte' | 'Confort' | string
    icon?: string
    quantity?: number
}

export interface Season {
    id: string
    name: string
    start_date: string
    end_date: string
    price_per_night: number
    discount_7days_pct: number
    min_nights?: number
}

export interface PricingBreakdown {
    // Standard V2 interface fields
    basePrice: number
    nights: number
    numNights: number
    totalDays: number
    baseRentalTotal: number
    slotSupplement: number
    nightsPerSeason: Array<{ season: string; nights: number; pricePerNight: number; subtotal: number }>
    discountPct: number
    discountAmount: number
    discountedBaseTotal: number
    kmPackage: KmPackage
    kmRatePerDay: number
    kmSupplement: number
    kmPrice: number
    cancellationPolicy: CancellationPolicy
    cancellationRatePerDay: number
    cancellationSupplement: number
    cancellationPrice: number
    extrasSubtotal: number
    extrasTotal: number
    itemizedExtras: ItemizedExtra[]
    totalPrice: number
    payableTotal: number
    depositAmount: number
    deposit: number
    totalWithoutDeposit: number
    grandTotal: number
    grandTotalWithDeposit: number
    baseTotal: number
}

export type PriceBreakdown = PricingBreakdown

export interface CalculatePriceV2Params {
    startDate: Date | string
    startSlot?: DaySlot
    pickupSlot?: DaySlot
    endDate: Date | string
    endSlot?: DaySlot
    dropoffSlot?: DaySlot
    camperBasePrice: number
    camperId?: string
    seasons?: SeasonV2[]
    periods?: SeasonPeriod[]
    discounts?: DurationDiscount[]
    kmPackage?: KmPackage
    cancellationPolicy?: CancellationPolicy
    extrasSelected?: CategorizedExtra[] | Extra[]
    selectedExtras?: Extra[] | CategorizedExtra[]
    depositAmount?: number
}
