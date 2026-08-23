'use client'

import { Compass, Shield, Headphones, Leaf } from 'lucide-react'

const reasons = [
    {
        icon: Compass,
        title: 'Libertad Total',
        desc: 'Sin itinerarios fijos. Tú decides cuándo parar, cuándo avanzar. Mallorca a tu ritmo.',
    },
    {
        icon: Shield,
        title: 'Campers Premium',
        desc: 'Vehículos impecables, equipados con todo lo necesario para una experiencia de lujo sobre ruedas.',
    },
    {
        icon: Headphones,
        title: 'Soporte 24/7',
        desc: 'Nuestro equipo está disponible en todo momento para que tu aventura sea perfecta.',
    },
    {
        icon: Leaf,
        title: 'Viaje Consciente',
        desc: 'Compensamos las emisiones de CO₂ de cada alquiler. Disfruta sin culpa.',
    },
]

export default function WhyUtopia() {
    return (
        <section className="why" id="experiences">
            <div className="container">
                <div className="why__header">
                    <span className="text-label" style={{ color: 'var(--sand-dark)' }}>Por qué elegirnos</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>
                        La experiencia <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Utopia</em>
                    </h2>
                    <p className="text-body" style={{ maxWidth: 520, color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                        Cada detalle ha sido cuidado para que tu único trabajo sea disfrutar.
                    </p>
                </div>

                <div className="why__grid">
                    {reasons.map((r, i) => (
                        <div key={i} className="why__card">
                            <div className="why__icon-wrap">
                                <r.icon size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-h4">{r.title}</h3>
                            <p className="text-small" style={{ color: 'var(--gray-600)' }}>{r.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .why {
          background: var(--cream);
          padding-block: var(--space-24);
        }
        .why__header {
          margin-bottom: var(--space-16);
        }
        .why__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: var(--space-6);
        }
        .why__card {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-8);
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-100);
          transition: box-shadow var(--transition-base), transform var(--transition-base);
        }
        .why__card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .why__icon-wrap {
          width: 48px; height: 48px;
          background: var(--gray-100);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
        }
      `}</style>
        </section>
    )
}
