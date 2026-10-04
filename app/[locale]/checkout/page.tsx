import { redirect } from '@/i18n/routing'

// El checkout antiguo llamaba a /api/checkout/redsys/initiate, que ya no existe, y
// calculaba el precio con otra lógica. Todo pago pasa ahora por el asistente de
// reserva (/reserva/[slug]), así que aquí solo reenviamos conservando los datos.
const FORWARDED_PARAMS = ['from', 'to', 'pax', 'pickup_time', 'dropoff_time', 'extras'] as const

export default async function LegacyCheckoutRedirect({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { locale } = await params
    const search = await searchParams
    const camper = typeof search.camper === 'string' ? search.camper : ''

    if (!camper) {
        redirect({ href: '/reservar', locale })
    }

    const query = new URLSearchParams()
    for (const key of FORWARDED_PARAMS) {
        const value = search[key]
        if (typeof value === 'string' && value) query.set(key, value)
    }
    const qs = query.toString()

    redirect({ href: `/reserva/${encodeURIComponent(camper)}${qs ? `?${qs}` : ''}`, locale })
}
