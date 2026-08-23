'use client'

import { useEffect, useState } from 'react'
import CamperCard from '@/components/campers/CamperCard'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const CAMPER_IMAGES = [
    'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80',
    'https://images.unsplash.com/photo-1612865547334-09cb8cb455da?w=800&q=80',
]

// Static demo campers — replaced by live Supabase data once campers are added
const demoCampers = [
    {
        id: '1', slug: 'aurora', name: 'Aurora',
        description_es: 'La perfecta compañera para parejas. Elegante, cómoda y lista para explorar cada rincón de Mallorca.',
        thumbnail_url: CAMPER_IMAGES[0],
        specs: { beds: 2, seats: 2, length_m: 5.4 },
        deposit_amount: 500,
        pricePerNight: 130,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
    {
        id: '2', slug: 'solara', name: 'Solara',
        description_es: 'Espaciosa y familiar. Diseñada para aventureros que no quieren renunciar a ninguna comodidad.',
        thumbnail_url: CAMPER_IMAGES[1],
        specs: { beds: 2, seats: 4, length_m: 6.2 },
        deposit_amount: 600,
        pricePerNight: 150,
        seasonName: 'Temporada Media',
        isAvailable: true,
    },
]

export default function FeaturedCampers() {
    const [campers, setCampers] = useState(demoCampers)

    useEffect(() => {
        // Try to load from API — falls back to demo if no campers exist yet
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
                        <span className="text-label" style={{ color: 'var(--sand-dark)' }}>Nuestra Flota</span>
                        <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>
                            Campers que inspiran
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
