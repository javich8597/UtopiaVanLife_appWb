'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('HomePage.FAQ');

    const faqs = [
        { q: t('q1_question'), a: t('q1_answer') },
        { q: t('q2_question'), a: t('q2_answer') },
        { q: t('q3_question'), a: t('q3_answer') },
        { q: t('q4_question'), a: t('q4_answer') },
        { q: t('q5_question'), a: t('q5_answer') },
        { q: t('q6_question'), a: t('q6_answer') },
    ]

    return (
        <section className="faq-section section" id="faqs">
            <div className="container-narrow">
                <div style={{ marginBottom: 'var(--space-12)' }}>
                    <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('title')}</span>
                    <h2 className="text-h2" style={{ marginTop: 'var(--space-2)' }}>{t('subtitle')}</h2>
                </div>
                <div className="faq-list">
                    {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
                </div>
            </div>
        </section>
    )
}
