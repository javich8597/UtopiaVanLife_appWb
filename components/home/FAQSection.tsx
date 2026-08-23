'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
    {
        q: '¿Cuántos años debo tener para alquilar?',
        a: 'Debes tener al menos 25 años y llevar más de 3 años con el carnet de conducir en vigor.',
    },
    {
        q: 'Está incluido el GPS?',
        a: 'Sí, todas nuestras campers incluyen GPS integrado y conexión Bluetooth con tu smartphone.',
    },
    {
        q: '¿Puedo llevar mascotas?',
        a: 'Aceptamos mascotas pequeñas previo aviso, con un cargo adicional de limpieza al final del alquiler.',
    },
    {
        q: '¿Qué pasa si hay una avería?',
        a: 'Disponemos de asistencia en carretera 24/7. Contacta con nuestro número de emergencias y gestionamos todo.',
    },
    {
        q: '¿Cómo funciona la fianza?',
        a: 'La fianza se bloquea temporalmente en tu tarjeta al inicio del alquiler y se libera en los 7 días posteriores a la devolución del vehículo en perfecto estado.',
    },
    {
        q: '¿Puedo cancelar mi reserva?',
        a: 'Sí. Las cancelaciones con más de 7 días de antelación reciben un reembolso del 100%. Consulta nuestra política completa.',
    },
]

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
            <button className="faq-item__btn" onClick={() => setOpen(!open)}>
                <span>{q}</span>
                <ChevronDown size={18} className="faq-item__icon" />
            </button>
            {open && <p className="faq-item__answer text-body">{a}</p>}
            <style jsx>{`
        .faq-item {
          border-bottom: 1px solid var(--gray-200);
        }
        .faq-item__btn {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-5) 0;
          font-size: 1rem;
          font-weight: 500;
          text-align: left;
          gap: var(--space-4);
          cursor: pointer;
          background: none;
          border: none;
          color: var(--black-matte);
          transition: color var(--transition-fast);
        }
        .faq-item__btn:hover { color: var(--forest-green); }
        .faq-item__icon {
          flex-shrink: 0;
          transition: transform var(--transition-base);
        }
        .faq-item--open .faq-item__icon { transform: rotate(180deg); }
        .faq-item__answer {
          padding-bottom: var(--space-5);
          color: var(--gray-600);
          line-height: 1.7;
        }
      `}</style>
        </div>
    )
}

export default function FAQSection() {
    return (
        <section className="faq-section section" id="faqs">
            <div className="container-narrow">
                <div style={{ marginBottom: 'var(--space-12)' }}>
                    <span className="text-label" style={{ color: 'var(--sand-dark)' }}>Preguntas Frecuentes</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>Todo lo que necesitas saber</h2>
                </div>
                <div className="faq-list">
                    {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
                </div>
            </div>
        </section>
    )
}
