import { createClient } from '@/lib/supabase/server'
import AdminPageHeader from '../AdminPageHeader'
import SettingsTabs from './SettingsTabs'
import ExtrasTableClient from './ExtrasTableClient'
import SeasonsSupplementClient from './SeasonsSupplementClient'
import DurationDiscountsClient from './DurationDiscountsClient'
import { SeasonV2, SeasonPeriod, DurationDiscount } from '@/lib/pricing/engine'

export const metadata = {
  title: 'Ajustes | Admin Utopia Van Life',
  description: 'Gestión de temporadas, suplementos, descuentos por estancia y catálogo de extras de alquiler.',
}

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  // 1. Cargar temporadas v2 y periodos
  const { data: rawSeasons } = await supabase
    .from('seasons_v2')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: rawPeriods } = await supabase
    .from('season_periods')
    .select('*')
    .order('start_date', { ascending: true })

  // 2. Cargar campers para el simulador de tarifas
  const { data: rawCampers } = await supabase
    .from('campers')
    .select('id, name, slug, base_price_per_night, is_active')
    .order('name', { ascending: true })

  // 3. Cargar tramos de descuento por duración
  const { data: rawDiscounts } = await supabase
    .from('duration_discounts')
    .select('*')
    .order('min_days', { ascending: true })

  // 4. Cargar catálogo de extras
  const { data: rawExtras } = await supabase
    .from('extras')
    .select('*')
    .order('name_es', { ascending: true })

  const seasons: SeasonV2[] = (rawSeasons || []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    supplement_per_night: Number(s.supplement_per_night) || 0,
    min_nights: Number(s.min_nights) || 3,
    is_default: Boolean(s.is_default),
    color_badge: s.color_badge || '#64748b',
  }))

  const periods: SeasonPeriod[] = (rawPeriods || []).map((p: any) => ({
    id: p.id,
    season_id: p.season_id,
    start_date: p.start_date,
    end_date: p.end_date,
    label: p.label,
  }))

  const campers = (rawCampers || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    base_price_per_night: Number(c.base_price_per_night) || (c.slug === 'space' ? 135 : 110),
    is_active: Boolean(c.is_active),
  }))

  const discounts: DurationDiscount[] = (rawDiscounts || []).map((d: any) => ({
    id: d.id,
    min_days: Number(d.min_days) || 7,
    discount_pct: Number(d.discount_pct) || 10,
    is_active: Boolean(d.is_active),
  }))

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Ajustes"
        description="Extras del checkout, temporadas y descuentos por duración."
      />

      <SettingsTabs
        tabs={[
          { id: 'extras', label: 'Extras', content: <ExtrasTableClient initialExtras={rawExtras || []} /> },
          {
            id: 'temporadas',
            label: 'Temporadas',
            content: <SeasonsSupplementClient initialSeasons={seasons} initialPeriods={periods} campers={campers} />,
          },
          { id: 'descuentos', label: 'Descuentos por duración', content: <DurationDiscountsClient initialDiscounts={discounts} /> },
        ]}
      />
    </div>
  )
}
