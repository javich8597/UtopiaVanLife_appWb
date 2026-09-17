'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Search,
  X,
  Truck,
  Calendar,
  ShieldCheck,
  Compass,
  CreditCard,
  AlertCircle,
  HeartHandshake,
  HelpCircle,
  Sparkles,
  MessageCircle,
  Mail,
  ArrowRight,
  Check
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { FAQ_CATEGORIES, FAQ_ITEMS, FAQItem } from '@/lib/data/faqs'

const CATEGORY_ICONS: Record<string, any> = {
  all: HelpCircle,
  vehiculo: Truck,
  reserva: Calendar,
  seguro: ShieldCheck,
  uso: Compass,
  fianza: CreditCard,
  normas: AlertCircle,
  tranquilidad: HeartHandshake,
}

export default function FAQAccordionList({
  showSearch = true,
  showCategories = true,
  initialCategory = 'all',
  title,
  subtitle,
}: {
  showSearch?: boolean
  showCategories?: boolean
  initialCategory?: string
  title?: string
  subtitle?: string
}) {
  const locale = useLocale()
  const isEs = locale === 'es'

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ 'faq-1': true }) // First item open by default

  const toggleItem = (id: string) => {
    setOpenIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {}
    filteredItems.forEach(item => {
      allOpen[item.id] = true
    })
    setOpenIds(allOpen)
  }

  const collapseAll = () => {
    setOpenIds({})
  }

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    let list = FAQ_ITEMS

    if (activeCategory !== 'all') {
      list = list.filter(item => item.categoryId === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(item => {
        const question = (isEs ? item.question_es : item.question_en).toLowerCase()
        const answer = (isEs ? item.answer_es : item.answer_en).toLowerCase()
        return question.includes(q) || answer.includes(q)
      })
    }

    return list
  }, [activeCategory, searchQuery, isEs])

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FAQ_ITEMS.length }
    FAQ_ITEMS.forEach(item => {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1
    })
    return counts
  }, [])

  // Helper to render formatted answer
  const renderFormattedAnswer = (text: string) => {
    const paragraphs = text.split('\n\n')

    return paragraphs.map((para, pIdx) => {
      // Check if paragraph is a list of bullet points
      if (para.includes('• ')) {
        const lines = para.split('\n')
        return (
          <ul key={pIdx} className="faq-answer-list">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^[•\s-]+/, '').trim()
              if (!cleanLine) return null
              return (
                <li key={lIdx} className="faq-answer-item">
                  <span className="faq-bullet-icon">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{renderWithBold(cleanLine)}</span>
                </li>
              )
            })}
          </ul>
        )
      }

      // Check if line contains markdown bold
      return (
        <p key={pIdx} className="faq-answer-p">
          {renderWithBold(para)}
        </p>
      )
    })
  }

  const renderWithBold = (text: string) => {
    if (!text.includes('**')) {
      return text
    }

    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="faq-strong-highlight">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="faq-experience">
      {/* Header */}
      <div className="faq-header text-center">
        <div className="faq-eyebrow-pill">
          <Sparkles size={14} className="text-forest" />
          <span>{isEs ? 'PREGUNTAS FRECUENTES · TRANSPARENCIA TOTAL' : 'FREQUENTLY ASKED QUESTIONS'}</span>
        </div>
        <h2 className="faq-title text-display">
          {title || (isEs ? 'Todo lo que necesitas saber' : 'Everything You Need to Know')}
        </h2>
        <p className="faq-subtitle text-body-large">
          {subtitle || (isEs
            ? 'Respuestas claras sobre nuestras campers, el seguro a todo riesgo, la autonomía eléctrica Victron y el alquiler en Mallorca.'
            : 'Clear answers about our fleet, full insurance, Victron off-grid electrical system and traveling in Mallorca.')}
        </p>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="faq-search-wrap">
          <div className="faq-search-bar">
            <Search size={18} className="faq-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                isEs
                  ? 'Buscar por tema (ej. fianza, aire acondicionado, kilometraje, seguro, pernocta...)'
                  : 'Search by keyword (e.g. deposit, air conditioning, insurance, mileage...)'
              }
              className="faq-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="faq-search-clear"
                aria-label={isEs ? 'Limpiar búsqueda' : 'Clear search'}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Categories Filter Pills */}
      {showCategories && (
        <div className="faq-categories-container">
          <div className="faq-categories-scroll">
            {FAQ_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat.id] || HelpCircle
              const isActive = activeCategory === cat.id
              const count = categoryCounts[cat.id] || 0

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`faq-cat-btn ${isActive ? 'faq-cat-btn--active' : ''}`}
                >
                  <Icon size={16} className="faq-cat-icon" />
                  <span>{isEs ? cat.name_es : cat.name_en}</span>
                  <span className={`faq-cat-badge ${isActive ? 'faq-cat-badge--active' : ''}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Controls: count & expand/collapse all */}
      <div className="faq-controls">
        <span className="faq-results-count">
          {filteredItems.length} {filteredItems.length === 1 ? (isEs ? 'pregunta' : 'question') : (isEs ? 'preguntas disponibles' : 'questions available')}
          {searchQuery && (
            <span className="faq-filter-tag">
              · {isEs ? `Filtrado por "${searchQuery}"` : `Filtered by "${searchQuery}"`}
            </span>
          )}
        </span>

        <div className="faq-toggle-actions">
          <button type="button" onClick={expandAll} className="faq-action-link">
            {isEs ? 'Expandir todas' : 'Expand all'}
          </button>
          <span className="faq-action-sep">•</span>
          <button type="button" onClick={collapseAll} className="faq-action-link">
            {isEs ? 'Cerrar todas' : 'Collapse all'}
          </button>
        </div>
      </div>

      {/* Questions Accordion List */}
      <div className="faq-list">
        {filteredItems.length === 0 ? (
          <div className="faq-empty-state">
            <HelpCircle size={40} className="text-sand" />
            <h3 className="faq-empty-title">{isEs ? 'No encontramos respuestas para esa búsqueda' : 'No answers found for that search'}</h3>
            <p className="faq-empty-text">
              {isEs
                ? 'Prueba con otras palabras o selecciona otra categoría superior.'
                : 'Try searching for other terms or select another category above.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('all')
              }}
              className="btn btn-forest btn-sm"
              style={{ marginTop: 12 }}
            >
              {isEs ? 'Ver todas las preguntas' : 'View all questions'}
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            const isOpen = !!openIds[item.id]
            const qText = isEs ? item.question_es : item.question_en
            const aText = isEs ? item.answer_es : item.answer_en
            const catName = isEs ? item.categoryName_es : item.categoryName_en

            return (
              <div
                key={item.id}
                className={`faq-card ${isOpen ? 'faq-card--open' : ''}`}
              >
                <button
                  type="button"
                  className="faq-card__header"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-body-${item.id}`}
                >
                  <div className="faq-card__header-content">
                    {activeCategory === 'all' && (
                      <span className="faq-card__category-chip">{catName}</span>
                    )}
                    <h3 className="faq-card__question">{qText}</h3>
                  </div>
                  <div className="faq-card__chevron-wrap">
                    <ChevronDown
                      size={18}
                      className={`faq-card__chevron ${isOpen ? 'faq-card__chevron--rotated' : ''}`}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-body-${item.id}`}
                      role="region"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="faq-card__collapse"
                    >
                      <div className="faq-card__body">
                        {renderFormattedAnswer(aText)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>

      {/* Support & Concierge CTA Card */}
      <div className="faq-contact-card">
        <div className="faq-contact-card__glow" />
        <div className="faq-contact-card__content">
          <div className="faq-contact-badge">
            <MessageCircle size={14} />
            <span>{isEs ? 'ATENCIÓN DIRECTA Y CERCANA' : 'DIRECT PERSONAL SUPPORT'}</span>
          </div>
          <h3 className="faq-contact-title">
            {isEs ? '¿Tienes alguna duda sobre tu viaje?' : 'Have any questions about your trip?'}
          </h3>
          <p className="faq-contact-desc">
            {isEs
              ? 'Estamos aquí para ayudarte a planificar tu aventura en Mallorca. Escríbenos directamente y te responderemos en minutos.'
              : 'We are here to help you plan your Mallorca road trip. Message us directly and we will respond promptly.'}
          </p>

          <div className="faq-contact-actions">
            <a
              href="https://wa.me/34611560916"
              target="_blank"
              rel="noopener noreferrer"
              className="faq-contact-btn faq-contact-btn--whatsapp"
            >
              <MessageCircle size={18} />
              <span>{isEs ? 'WhatsApp (+34 611 560 916)' : 'WhatsApp Chat (+34 611 560 916)'}</span>
            </a>
            <a
              href="mailto:hola@utopiavanlife.com"
              className="faq-contact-btn faq-contact-btn--email"
            >
              <Mail size={18} />
              <span>hola@utopiavanlife.com</span>
            </a>
            <Link
              href="/campers"
              className="faq-contact-btn faq-contact-btn--fleet"
            >
              <span>{isEs ? 'Ver Nuestras Campers' : 'View Our Campers'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .faq-experience {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .faq-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .faq-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(43, 76, 55, 0.08);
          color: var(--forest-green);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(43, 76, 55, 0.15);
        }
        .faq-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 3.5vw, 2.75rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
          color: var(--black-matte);
          margin: 0;
        }
        .faq-subtitle {
          color: var(--gray-600);
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Search Bar */
        .faq-search-wrap {
          position: relative;
          width: 100%;
        }
        .faq-search-bar {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-full);
          padding: 6px 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
        }
        .faq-search-bar:focus-within {
          border-color: var(--forest-green);
          box-shadow: 0 6px 24px rgba(43, 76, 55, 0.12);
        }
        .faq-search-icon {
          color: var(--gray-400);
          margin-right: 12px;
          flex-shrink: 0;
        }
        .faq-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 15px;
          color: var(--black-matte);
          padding: 8px 0;
          box-shadow: none;
          height: auto;
        }
        .faq-search-input::placeholder {
          color: var(--gray-400);
          font-size: 14px;
        }
        .faq-search-clear {
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
          cursor: pointer;
          transition: all 0.2s;
        }
        .faq-search-clear:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--black-matte);
        }

        /* Category Selector Pills */
        .faq-categories-container {
          width: 100%;
          overflow: hidden;
        }
        .faq-categories-scroll {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .faq-cat-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-full);
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-700);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }
        .faq-cat-btn:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
          transform: translateY(-1px);
        }
        .faq-cat-btn--active {
          background: var(--forest-green);
          border-color: var(--forest-green);
          color: white;
          box-shadow: 0 4px 14px rgba(43, 76, 55, 0.25);
        }
        .faq-cat-btn--active:hover {
          background: #233e2d;
          color: white;
        }
        .faq-cat-badge {
          font-size: 11px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.06);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          color: var(--gray-600);
        }
        .faq-cat-badge--active {
          background: rgba(255, 255, 255, 0.22);
          color: white;
        }

        /* Controls bar */
        .faq-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--gray-500);
          padding: 0 var(--space-2);
        }
        .faq-results-count {
          font-weight: 500;
        }
        .faq-filter-tag {
          color: var(--forest-green);
          font-weight: 600;
          margin-left: 4px;
        }
        .faq-toggle-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .faq-action-link {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--forest-green);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .faq-action-link:hover {
          color: #1e3626;
        }
        .faq-action-sep {
          color: var(--gray-300);
        }

        /* FAQ List & Cards */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .faq-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          transition: all 0.25s ease;
        }
        .faq-card:hover {
          border-color: rgba(43, 76, 55, 0.2);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
        }
        .faq-card--open {
          border-color: rgba(43, 76, 55, 0.3);
          box-shadow: 0 6px 24px rgba(43, 76, 55, 0.06);
        }
        .faq-card__header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-5) var(--space-6);
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: var(--space-4);
          transition: background 0.15s ease;
        }
        .faq-card__header:hover {
          background: rgba(0, 0, 0, 0.015);
        }
        .faq-card__header-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .faq-card__category-chip {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--forest-green);
          background: rgba(43, 76, 55, 0.07);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          width: fit-content;
        }
        .faq-card__question {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--black-matte);
          margin: 0;
          line-height: 1.4;
        }
        .faq-card__chevron-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(43, 76, 55, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-green);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .faq-card--open .faq-card__chevron-wrap {
          background: var(--forest-green);
          color: white;
        }
        .faq-card__chevron {
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-card__chevron--rotated {
          transform: rotate(180deg);
        }

        .faq-card__collapse {
          overflow: hidden;
        }
        .faq-card__body {
          padding: 0 var(--space-6) var(--space-6) var(--space-6);
          border-top: 1px solid rgba(0, 0, 0, 0.04);
          padding-top: var(--space-4);
          font-size: 15px;
          color: var(--gray-700);
          line-height: 1.75;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .faq-answer-p {
          margin: 0;
        }
        .faq-strong-highlight {
          color: var(--black-matte);
          font-weight: 700;
        }
        .faq-answer-list {
          list-style: none;
          padding: 0;
          margin: 4px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .faq-answer-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .faq-bullet-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(43, 76, 55, 0.1);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 3px;
        }

        /* Empty State */
        .faq-empty-state {
          padding: var(--space-12) var(--space-6);
          text-align: center;
          background: white;
          border-radius: var(--radius-lg);
          border: 1px dashed var(--gray-300);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        .faq-empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--black-matte);
          margin: 0;
        }
        .faq-empty-text {
          font-size: 14px;
          color: var(--gray-500);
          max-width: 400px;
          margin: 0;
        }

        /* Support / Concierge card */
        .faq-contact-card {
          position: relative;
          background: linear-gradient(135deg, #18261e 0%, #0f1813 100%);
          color: white;
          border-radius: var(--radius-xl);
          padding: var(--space-8) var(--space-10);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: var(--space-6);
        }
        .faq-contact-card__glow {
          position: absolute;
          top: -40%;
          right: -20%;
          width: 80%;
          height: 180%;
          background: radial-gradient(circle, rgba(197, 160, 89, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .faq-contact-card__content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-3);
        }
        .faq-contact-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(197, 160, 89, 0.18);
          color: #e5c07b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }
        .faq-contact-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .faq-contact-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.75);
          max-width: 540px;
          line-height: 1.6;
          margin: 0;
        }
        .faq-contact-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-top: var(--space-3);
        }
        .faq-contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .faq-contact-btn--whatsapp {
          background: #25D366;
          color: white;
          box-shadow: 0 4px 14px rgba(37, 211, 102, 0.25);
        }
        .faq-contact-btn--whatsapp:hover {
          background: #20ba59;
          transform: translateY(-1px);
        }
        .faq-contact-btn--email {
          background: rgba(255, 255, 255, 0.12);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .faq-contact-btn--email:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .faq-contact-btn--fleet {
          background: white;
          color: var(--forest-green);
        }
        .faq-contact-btn--fleet:hover {
          background: #f4f5f4;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .faq-categories-scroll {
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }
          .faq-card__header {
            padding: var(--space-4) var(--space-4);
          }
          .faq-card__body {
            padding: 0 var(--space-4) var(--space-4) var(--space-4);
          }
          .faq-contact-card {
            padding: var(--space-6) var(--space-4);
          }
          .faq-contact-actions {
            flex-direction: column;
            width: 100%;
          }
          .faq-contact-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
