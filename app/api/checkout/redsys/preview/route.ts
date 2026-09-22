import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePrice } from '@/lib/pricing/engine'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { camperSlug, from, to, extraIds } = await req.json()

        if (!camperSlug || !from || !to) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
        }

        // 1. Fetch camper
        const { data: camper, error: camperErr } = await supabase
            .from('campers')
            .select('*')
            .eq('slug', camperSlug)
            .single()

        if (camperErr || !camper) {
            return NextResponse.json({ error: 'Camper no encontrada' }, { status: 404 })
        }

        // 2. Fetch seasons & extras
        const { data: seasons } = await supabase.from('seasons').select('*')
        const { data: extras } = await supabase
            .from('extras')
            .select('*')
            .in('id', extraIds && extraIds.length > 0 ? extraIds : ['__empty__'])

        // 3. Calculate price
        const startDate = new Date(from)
        const endDate = new Date(to)
        const breakdown = calculatePrice(startDate, endDate, seasons || [], extras || [], camper.deposit_amount)

        return NextResponse.json({
            camper,
            breakdown,
        })
    } catch (error: any) {
        console.error('Redsys Preview Error:', error)
        return NextResponse.json({ error: error.message || 'Error al calcular precio' }, { status: 500 })
    }
}
