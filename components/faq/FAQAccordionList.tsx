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
  ArrowRight,
  Check,
  Zap,
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

// 4 essential questions shown by default so users are never overloaded
const CURATED_DEFAULT_IDS = ['faq-1', 'faq-12', 'faq-14', 'faq-21']

const QUICK_SEARCH_TAGS = [
  { label_es: 'Fianza', label_en: 'Deposit', query: 'fianza' },
  { label_es: 'Seguro a todo riesgo', label_en: 'Full insurance', query: 'seguro' },
  { label_es: 'Pernocta en Mallorca', label_en: 'Overnight in Mallorca', query: 'pernocta' },
  { label_es: 'Autonomía Victron', label_en: 'Solar autonomy', query: 'autonomía' },
  { label_es: 'Carnet de conducir', label_en: 'Driver license', query: 'carnet' },
  { label_es: 'Qué incluye', label_en: 'What is included', query: 'incluye' },
]

export default function FAQAccordionList({
  showSearch = true,
  showCategories = true,
  initialCategory = 'all',
  title,
  subtitle,
  variant = 'light',
}: {
  showSearch?: boolean
  showCategories?: boolean
  initialCategory?: string
  title?: string
  subtitle?: string
  variant?: 'light' | 'dark'
}) {
  const locale = useLocale()
  const isEs = locale === 'es'

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ 'faq-1': true }) // First item open by default

  const toggleItem = (id: string) => {
    setOpenIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {}
    displayItems.forEach(item => {
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

  // If user searched or explicitly toggled showAll, show filtered items;
  // otherwise, show only the 4 essential curated questions
  const isSearching = searchQuery.trim().length > 0
  const displayItems = useMemo(() => {
    if (isSearching || showAll || activeCategory !== 'all') {
      return filteredItems
    }
    // Return curated 4 questions (falling back to first 4 if IDs not found)
    const curated = FAQ_ITEMS.filter(item => CURATED_DEFAULT_IDS.includes(item.id))
    return curated.length > 0 ? curated : FAQ_ITEMS.slice(0, 4)
  }, [isSearching, showAll, activeCategory, filteredItems])

  const renderFormattedAnswer = (text: string) => {
    const paragraphs = text.split('\n\n')

    return paragraphs.map((para, pIdx) => {
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

  const handleQuickTagClick = (tagQuery: string) => {
    setSearchQuery(tagQuery)
    setShowAll(true)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div className={`faq-experience ${variant === 'dark' ? 'faq-experience--dark' : ''}`}>
      {/* Header */}
      <div className="faq-header">
        <div className="faq-eyebrow-pill">
          <Sparkles size={13} className="text-forest" />
          <span>{isEs ? 'PREGUNTAS FRECUENTES · TRANSPARENCIA' : 'FREQUENTLY ASKED QUESTIONS'}</span>
        </div>
        <h2 className="faq-title text-display">
          {title || (isEs ? 'Todo lo que necesitas saber' : 'Everything You Need to Know')}
        </h2>
        <p className="faq-subtitle text-body-large">
          {subtitle || (isEs
            ? 'Busca cualquier duda sobre fianzas, seguro a todo riesgo, autonomía Victron o pernocta en Mallorca.'
            : 'Search anything about deposits, full insurance, solar autonomy or traveling in Mallorca.')}
        </p>
      </div>

      {/* Modern Search Experience */}
      {showSearch && (
        <div className="faq-search-section">
          <div className="faq-search-bar">
            <Search size={19} className="faq-search-icon" />
            <input
              id="faq-search-input"
              name="faq-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                isEs
                  ? 'Escribe tu duda: fianza, seguro, aire acondicionado, pernocta...'
                  : 'Type your question: deposit, insurance, air conditioning...'
              }
              className="faq-search-input"
              aria-label={isEs ? 'Buscar preguntas frecuentes' : 'Search frequently asked questions'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="faq-search-clear"
                aria-label={isEs ? 'Limpiar búsqueda' : 'Clear search'}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Search Tag Pills */}
          <div className="faq-quick-tags">
            <span className="faq-quick-label">
              <Zap size={13} className="text-sand" />
              {isEs ? 'Consultas rápidas:' : 'Quick topics:'}
            </span>
            <div className="faq-quick-chips">
              {QUICK_SEARCH_TAGS.map(t => {
                const label = isEs ? t.label_es : t.label_en
                const isSelected = searchQuery.toLowerCase() === t.query.toLowerCase()
                return (
                  <button
                    key={t.query}
                    type="button"
                    onClick={() => handleQuickTagClick(t.query)}
                    className={`faq-quick-chip ${isSelected ? 'faq-quick-chip--active' : ''}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Categories Filter Pills (Visible when expanded or searched) */}
      {showCategories && (showAll || isSearching) && (
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
                  <Icon size={15} className="faq-cat-icon" />
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
          {isSearching ? (
            isEs ? (
              <>
                Se encontraron <strong>{displayItems.length}</strong> {displayItems.length === 1 ? 'respuesta' : 'respuestas'} para &ldquo;{searchQuery}&rdquo;
              </>
            ) : (
              <>
                Found <strong>{displayItems.length}</strong> {displayItems.length === 1 ? 'result' : 'results'} for &ldquo;{searchQuery}&rdquo;
              </>
            )
          ) : !showAll && activeCategory === 'all' ? (
            isEs ? 'Preguntas esenciales más consultadas' : 'Essential most requested questions'
          ) : (
            isEs ? `${displayItems.length} preguntas disponibles` : `${displayItems.length} questions available`
          )}
        </span>

        {displayItems.length > 1 && (
          <div className="faq-toggle-actions">
            <button type="button" onClick={expandAll} className="faq-action-link">
              {isEs ? 'Expandir todas' : 'Expand all'}
            </button>
            <span className="faq-action-sep">•</span>
            <button type="button" onClick={collapseAll} className="faq-action-link">
              {isEs ? 'Cerrar todas' : 'Collapse all'}
            </button>
          </div>
        )}
      </div>

      {/* Questions Accordion List */}
      <div className="faq-list">
        {displayItems.length === 0 ? (
          <div className="faq-empty-state">
            <HelpCircle size={40} className="faq-empty-icon" />
            <h3 className="faq-empty-title">{isEs ? 'No encontramos respuestas para esa búsqueda' : 'No answers found for that search'}</h3>
            <p className="faq-empty-text">
              {isEs
                ? 'Prueba con otras palabras o contáctanos por WhatsApp para resolverlo al instante.'
                : 'Try searching for other terms or chat with us on WhatsApp for instant help.'}
            </p>
            <div className="faq-empty-actions">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                }}
                className="btn btn-forest btn-sm"
              >
                {isEs ? 'Ver preguntas frecuentes' : 'View all questions'}
              </button>
              <a
                href="https://wa.me/34600000000?text=Hola,%20tengo%20una%20duda%20sobre%20el%20alquiler%20de%20campers"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <MessageCircle size={15} />
                <span>{isEs ? 'Preguntar por WhatsApp' : 'Ask on WhatsApp'}</span>
              </a>
            </div>
          </div>
        ) : (
          displayItems.map(item => {
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
                    <span className="faq-card__category-chip">{catName}</span>
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
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
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

      {/* Expand/Collapse Toggle Button (When not searching) */}
      {!isSearching && activeCategory === 'all' && (
        <div className="faq-view-all-wrap">
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="faq-view-all-btn"
          >
            <span>
              {showAll
                ? (isEs ? 'Ver solo las preguntas principales' : 'Show only essential questions')
                : (isEs ? `Ver todas las preguntas frecuentes (${FAQ_ITEMS.length})` : `View all frequently asked questions (${FAQ_ITEMS.length})`)}
            </span>
            <ChevronDown
              size={16}
              className={`faq-view-all-icon ${showAll ? 'faq-view-all-icon--up' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Support & Concierge CTA Card */}
      <div className="faq-contact-card">
        <div className="faq-contact-card__glow" />
        <div className="faq-contact-card__content">
          <div className="faq-contact-badge">
            <MessageCircle size={14} />
            <span>{isEs ? 'ATENCIÓN PERSONALIZADA' : 'DIRECT PERSONAL SUPPORT'}</span>
          </div>
          <h3 className="faq-contact-title">
            {isEs ? '¿Tienes alguna duda que no encuentras?' : 'Have a question not listed here?'}
          </h3>
          <p className="faq-contact-desc">
            {isEs
              ? 'Respondemos en menos de 15 minutos por WhatsApp para asesorarte con las fechas, normativas de pernocta o detalles de la camper.'
              : 'We reply in under 15 minutes on WhatsApp to assist you with dates, parking regulations or camper specs.'}
          </p>
          <div className="faq-contact-actions">
            <a
              href="https://wa.me/34600000000?text=Hola%20Utopia%20Van%20Life,%20tengo%20una%20consulta"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-forest"
            >
              <MessageCircle size={16} />
              <span>{isEs ? 'Hablar por WhatsApp' : 'Chat on WhatsApp'}</span>
            </a>
            <Link href="/contacto" className="btn btn-outline">
              <span>{isEs ? 'Enviar email' : 'Send email'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .faq-experience {
          max-width: 860px;
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        .faq-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: var(--space-3);
          max-width: 680px;
          margin-inline: auto;
        }

        .faq-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(45, 58, 45, 0.08);
          border: 1px solid rgba(45, 58, 45, 0.15);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--forest-green);
          text-transform: uppercase;
        }

        .faq-title {
          font-family: var(--font-serif, serif);
          font-size: clamp(2rem, 3.8vw, 2.85rem);
          font-weight: 400;
          color: var(--black-matte);
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        .faq-subtitle {
          color: var(--gray-600);
          font-size: 1rem;
          line-height: 1.6;
          max-width: 580px;
        }

        /* Search Section */
        .faq-search-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          width: 100%;
        }

        .faq-search-bar {
          display: flex;
          align-items: center;
          background: white;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-full);
          padding: 10px 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .faq-search-bar:focus-within {
          border-color: var(--forest-green);
          box-shadow: 0 6px 24px rgba(45, 58, 45, 0.12);
        }

        :global(.faq-search-icon) {
          color: var(--gray-400);
          margin-right: 12px;
          flex-shrink: 0;
        }

        .faq-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          color: var(--black-matte);
          font-family: inherit;
        }

        .faq-search-input::placeholder {
          color: var(--gray-400);
        }

        .faq-search-clear {
          background: var(--gray-100);
          border: none;
          color: var(--gray-500);
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 150ms ease;
          padding: 0;
        }

        .faq-search-clear:hover {
          background: var(--gray-200);
          color: var(--black-matte);
        }

        /* Quick Search Tag Pills */
        .faq-quick-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding-inline: 8px;
        }

        .faq-quick-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .faq-quick-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .faq-quick-chip {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 0.78rem;
          color: var(--gray-700);
          cursor: pointer;
          transition: all 180ms ease;
        }

        .faq-quick-chip:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
          background: rgba(45, 58, 45, 0.04);
        }

        .faq-quick-chip--active {
          background: var(--forest-green);
          border-color: var(--forest-green);
          color: white;
        }

        /* Categories Filter */
        .faq-categories-container {
          width: 100%;
          overflow: hidden;
        }

        .faq-categories-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0 10px;
          scrollbar-width: none;
        }

        .faq-categories-scroll::-webkit-scrollbar {
          display: none;
        }

        .faq-cat-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--gray-700);
          white-space: nowrap;
          cursor: pointer;
          transition: all 180ms ease;
        }

        .faq-cat-btn:hover {
          border-color: var(--forest-green);
          color: var(--forest-green);
        }

        .faq-cat-btn--active {
          background: var(--forest-green);
          border-color: var(--forest-green);
          color: white;
        }

        .faq-cat-badge {
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.06);
          padding: 1px 6px;
          border-radius: 999px;
        }

        .faq-cat-badge--active {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        /* Controls */
        .faq-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: var(--gray-500);
          padding-inline: 4px;
        }

        .faq-results-count {
          font-weight: 500;
        }

        .faq-results-count strong {
          color: var(--forest-green);
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
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--forest-green);
          cursor: pointer;
          text-decoration: underline;
        }

        .faq-action-sep {
          color: var(--gray-300);
        }

        /* FAQ List */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-card {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .faq-card:hover {
          border-color: rgba(45, 58, 45, 0.3);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.03);
        }

        .faq-card--open {
          border-color: rgba(45, 58, 45, 0.35);
          box-shadow: 0 8px 24px rgba(45, 58, 45, 0.06);
        }

        .faq-card__header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }

        .faq-card__header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .faq-card__category-chip {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--forest-green);
          background: rgba(45, 58, 45, 0.06);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .faq-card__question {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--black-matte);
          margin: 0;
          line-height: 1.35;
        }

        .faq-card__chevron-wrap {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--gray-100);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-600);
          transition: background 200ms ease;
        }

        :global(.faq-card__chevron) {
          transition: transform 220ms ease;
        }

        :global(.faq-card__chevron--rotated) {
          transform: rotate(180deg);
        }

        .faq-card__body {
          padding: 0 24px 22px;
          color: var(--gray-700);
          font-size: 0.94rem;
          line-height: 1.65;
          border-top: 1px solid var(--gray-100);
          padding-top: 16px;
        }

        :global(.faq-answer-p) {
          margin-bottom: 12px;
        }

        :global(.faq-answer-p:last-child) {
          margin-bottom: 0;
        }

        :global(.faq-answer-list) {
          list-style: none;
          padding: 0;
          margin: 0 0 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        :global(.faq-answer-item) {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        :global(.faq-bullet-icon) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(45, 58, 45, 0.1);
          color: var(--forest-green);
          flex-shrink: 0;
        }

        :global(.faq-strong-highlight) {
          font-weight: 600;
          color: var(--black-matte);
        }

        /* View all button */
        .faq-view-all-wrap {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .faq-view-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1.5px solid var(--forest-green);
          color: var(--forest-green);
          font-weight: 600;
          font-size: 0.92rem;
          padding: 12px 24px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 200ms ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
        }

        .faq-view-all-btn:hover {
          background: var(--forest-green);
          color: white;
          box-shadow: 0 6px 18px rgba(45, 58, 45, 0.2);
        }

        :global(.faq-view-all-icon) {
          transition: transform 200ms ease;
        }

        :global(.faq-view-all-icon--up) {
          transform: rotate(180deg);
        }

        /* Empty state */
        .faq-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-12) var(--space-6);
          background: white;
          border-radius: var(--radius-xl);
          border: 1px dashed var(--gray-300);
          gap: 12px;
        }

        :global(.faq-empty-icon) {
          color: var(--sand-500, #c4a482);
        }

        .faq-empty-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--black-matte);
          margin: 0;
        }

        .faq-empty-text {
          color: var(--gray-600);
          font-size: 0.9rem;
          max-width: 440px;
          margin: 0;
        }

        .faq-empty-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-top: 8px;
        }

        /* Concierge Contact Card */
        .faq-contact-card {
          position: relative;
          background: linear-gradient(135deg, #1b261e 0%, #111a13 100%);
          color: white;
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: var(--space-4);
        }

        .faq-contact-card__glow {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(156, 209, 166, 0.25) 0%, transparent 70%);
          pointer-events: none;
        }

        .faq-contact-card__content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .faq-contact-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #9cd1a6;
          text-transform: uppercase;
        }

        .faq-contact-title {
          font-family: var(--font-serif, serif);
          font-size: 1.45rem;
          font-weight: 400;
          color: white;
          margin: 0;
        }

        .faq-contact-desc {
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.92rem;
          line-height: 1.55;
          max-width: 600px;
          margin: 0;
        }

        .faq-contact-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .faq-card__header {
            padding: 16px 18px;
          }
          .faq-card__body {
            padding: 0 18px 18px;
          }
          .faq-quick-tags {
            flex-direction: column;
            align-items: flex-start;
          }
          .faq-contact-card {
            padding: var(--space-6);
          }
          .faq-contact-actions {
            width: 100%;
          }
          .faq-contact-actions :global(.btn) {
            width: 100%;
            justify-content: center;
          }
        }

        /* ── Dark Luxury Variant (matching Home & Camper Detail) ── */
        .faq-experience--dark .faq-eyebrow-pill {
          background: rgba(204, 160, 83, 0.12);
          border-color: rgba(204, 160, 83, 0.35);
          color: #CCA053;
        }
        .faq-experience--dark .faq-eyebrow-pill :global(.text-forest) {
          color: #CCA053;
        }
        .faq-experience--dark .faq-title {
          color: #FFFFFF;
          font-family: var(--font-display, sans-serif);
          font-weight: 800;
          text-transform: uppercase;
        }
        .faq-experience--dark .faq-subtitle {
          color: rgba(255, 255, 255, 0.65);
        }
        .faq-experience--dark .faq-search-bar {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .faq-experience--dark .faq-search-bar:focus-within {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.2);
        }
        .faq-experience--dark .faq-search-input {
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .faq-experience--dark :global(.faq-search-icon) {
          color: #CCA053;
        }
        .faq-experience--dark .faq-search-clear {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        .faq-experience--dark .faq-quick-chip {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        .faq-experience--dark .faq-quick-chip:hover {
          border-color: #CCA053;
          color: #CCA053;
        }
        .faq-experience--dark .faq-quick-chip--active {
          background: #CCA053;
          border-color: #CCA053;
          color: #0B0C0E;
          font-weight: 700;
        }
        .faq-experience--dark .faq-cat-btn {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.75);
        }
        .faq-experience--dark .faq-cat-btn:hover {
          border-color: rgba(204, 160, 83, 0.5);
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-cat-btn--active {
          background: #CCA053;
          border-color: #CCA053;
          color: #0B0C0E;
          font-weight: 700;
        }
        .faq-experience--dark .faq-cat-badge {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.75);
        }
        .faq-experience--dark .faq-cat-badge--active {
          background: rgba(0, 0, 0, 0.2);
          color: #0B0C0E;
        }
        .faq-experience--dark .faq-results-count {
          color: rgba(255, 255, 255, 0.5);
        }
        .faq-experience--dark .faq-results-count strong {
          color: #CCA053;
        }
        .faq-experience--dark .faq-action-link {
          color: #CCA053;
        }
        .faq-experience--dark .faq-card {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.08);
          border-radius: 18px;
        }
        .faq-experience--dark .faq-card:hover {
          border-color: rgba(204, 160, 83, 0.35);
        }
        .faq-experience--dark .faq-card--open {
          border-color: rgba(204, 160, 83, 0.5);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
        }
        .faq-experience--dark .faq-card__category-chip {
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
        }
        .faq-experience--dark .faq-card__question {
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-card__chevron-wrap {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.75);
        }
        .faq-experience--dark .faq-card__body {
          color: rgba(255, 255, 255, 0.72);
          border-color: rgba(255, 255, 255, 0.07);
        }
        .faq-experience--dark :global(.faq-bullet-icon) {
          background: rgba(204, 160, 83, 0.15);
          color: #CCA053;
        }
        .faq-experience--dark :global(.faq-strong-highlight) {
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-view-all-btn {
          background: #CCA053;
          border-color: #CCA053;
          color: #0B0C0E;
          font-weight: 700;
        }
        .faq-experience--dark .faq-view-all-btn:hover {
          background: #d8ad5e;
          box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
        }
      `}</style>
    </div>
  )
}
