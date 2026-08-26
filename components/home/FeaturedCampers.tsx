'use client'

import { useEffect, useState } from 'react'
import CamperCard from '@/components/campers/CamperCard'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl';

const CAMPER_IMAGES = [
    '/images/campers/neo/neo-ext.png',
    '/images/campers/space/space-ext.png',
]

// Static fallback campers
const demoCampers = [
    {
        id: '1', slug: 'neo', name: 'NEO',
        description_es: 'La camper más polivalente y compacta. Diseñada para viajar y dormir hasta 3 personas con la máxima comodidad por Mallorca.',
        thumbnail_url: CAMPER_IMAGES[0],
        specs: { beds: 3, seats: 3, length_m: 5.4 },
        deposit_amount: 500,
        pricePerNight: 120,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
    {
        id: '2', slug: 'space', name: 'SPACE',
        description_es: 'Espaciosa y con máxima libertad. Distribución optimizada para 4 plazas de viaje y hasta 3 para dormir.',
        thumbnail_url: CAMPER_IMAGES[1],
        specs: { beds: 3, seats: 4, length_m: 6.0 },
        deposit_amount: 600,
        pricePerNight: 140,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
]

export default function FeaturedCampers() {
    const t = useTranslations('HomePage.FeaturedCampers');
    const [campers, setCampers] = useState(demoCampers)

    useEffect(() => {
        // Try to load from API — falls back to demo if fetch fails
        fetch('/api/availability')
            .then(r => r.json())
            .then(data => { if (data.campers?.length > 0) setCampers(data.campers) })
            .catch(() => { })
    }, [])

    return (
        <section className="featured section" id="campers">
            <div className="container">
                <div className="featured__header">
                    <div>
                        <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('title')}</span>
                        <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>
                            {t('subtitle')}
                        </h2>
                    </div>
                    <Link href="/campers" className="btn btn-outline btn-sm hide-mobile">
                        Ver todas <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="featured__grid">
                    {campers.map(c => (
                        <CamperCard key={c.id} {...c as any} />
                    ))}
                </div>

                <div className="featured__cta hide-desktop">
                    <Link href="/campers" className="btn btn-outline">
                        Ver todas las campers <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            <style jsx>{`
        .featured__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: var(--space-12);
        }
        .featured__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-6);
        }
        .featured__cta {
          margin-top: var(--space-8);
          text-align: center;
        }
      `}</style>
        </section>
    )
}
