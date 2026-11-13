'use client'

import { useState, useMemo, useRef } from 'react'
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
  MessageCircle,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { FAQ_CATEGORIES, FAQ_ITEMS } from '@/lib/data/faqs'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
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

export default function FAQAccordionList({
  showSearch = true,
  showCategories = true,
  initialCategory = 'all',
  title,
  subtitle,
  variant = 'light',
  headingLevel = 'h2',
}: {
  showSearch?: boolean
  showCategories?: boolean
  initialCategory?: string
  title?: string
  subtitle?: string
  variant?: 'light' | 'dark'
  /** En /faq es el título principal de la página (h1); en la home, una sección (h2) */
  headingLevel?: 'h1' | 'h2'
}) {
  const Heading = headingLevel
  const locale = useLocale()
  const isEs = locale === 'es'

  const containerRef = useRef<HTMLDivElement>(null)
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

  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={`faq-experience ${variant === 'dark' ? 'faq-experience--dark' : ''}`}>
      {/* Header */}
      <div className="faq-header">
        <Heading className="faq-title">
          {title || (isEs ? 'Preguntas frecuentes' : 'Frequently Asked Questions')}
        </Heading>
        <p className="faq-subtitle">
          {subtitle || (isEs ? 'Todo lo que necesitas saber' : 'Everything you need to know')}
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
        </div>
      )}

      {/* Controls: count (when searching/expanded) & expand/collapse all */}
      {(isSearching || showAll || activeCategory !== 'all' || displayItems.length > 1) && (
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
            ) : (showAll || activeCategory !== 'all') ? (
              isEs ? `${displayItems.length} preguntas disponibles` : `${displayItems.length} questions available`
            ) : null}
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
      )}

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
            onClick={() => {
              if (showAll) {
                setShowAll(false)
                setTimeout(() => {
                  const target = document.getElementById('faqs') || containerRef.current
                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 60)
              } else {
                setShowAll(true)
              }
            }}
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
          gap: 14px;
          max-width: 680px;
          margin-inline: auto;
          margin-bottom: 12px;
        }

        .faq-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #F7EEDC;
          border: 1px solid #E8D6B2;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #1A1714;
          text-transform: uppercase;
        }

        :global(.faq-title) {
          font-family: var(--font-display, inherit);
          font-size: clamp(2.6rem, 4.8vw, 3.65rem);
          font-weight: 500;
          color: #1F1B17;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0;
        }

        .faq-subtitle {
          color: #5A5248;
          font-size: 1.05rem;
          line-height: 1.68;
          margin: 0;
          text-wrap: balance;
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

        /* FAQ List - Minimalist Hairline Accordion */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .faq-card {
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--gray-200);
          border-radius: 0;
          overflow: hidden;
          transition: border-color 200ms ease;
        }

        .faq-card:first-child {
          border-top: 1px solid var(--gray-200);
        }

        .faq-card__header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 4px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }

        .faq-card__header-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .faq-card__category-chip {
          display: inline-block;
          font-family: var(--font-sans);
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--gray-400);
          background: transparent;
          padding: 0;
        }

        .faq-card__question {
          font-family: var(--font-sans);
          font-size: 1.1rem;
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--black-matte);
          margin: 0;
          line-height: 1.4;
          transition: color 180ms ease;
        }

        .faq-card__chevron-wrap {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-500);
          transition: color 180ms ease;
        }

        :global(.faq-card__chevron) {
          transition: transform 220ms ease;
        }

        :global(.faq-card__chevron--rotated) {
          transform: rotate(180deg);
        }

        .faq-card__body {
          padding: 0 4px 22px;
          color: var(--gray-700);
          font-size: 0.95rem;
          line-height: 1.68;
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

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .faq-card__header {
            padding: 18px 2px;
          }
          .faq-card__question {
            font-size: 1rem;
          }
          .faq-card__body {
            padding: 0 2px 18px;
          }
        }

        /* ── Dark Luxury Editorial Variant (matching Home & Venta) ── */
        .faq-experience--dark .faq-eyebrow-pill {
          background: rgba(204, 160, 83, 0.12);
          border-color: rgba(204, 160, 83, 0.35);
          color: #E8CA7C;
        }
        .faq-experience--dark :global(.faq-title) {
          color: #FFFFFF;
          font-family: var(--font-display, inherit);
          font-weight: 500;
        }
        .faq-experience--dark .faq-subtitle {
          color: #94A3B8;
        }
        .faq-experience--dark .faq-search-bar {
          background: rgba(19, 21, 24, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 20px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }
        .faq-experience--dark .faq-search-bar:focus-within {
          border-color: rgba(204, 160, 83, 0.65);
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.15), 0 14px 36px rgba(0, 0, 0, 0.55);
        }
        .faq-experience--dark .faq-search-input {
          color: #FFFFFF;
          font-size: 0.96rem;
        }
        .faq-experience--dark .faq-search-input::placeholder {
          color: #64748B;
        }
        .faq-experience--dark :global(.faq-search-icon) {
          color: #CCA053;
        }
        .faq-experience--dark .faq-search-clear {
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .faq-experience--dark .faq-search-clear:hover {
          background: rgba(204, 160, 83, 0.2);
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-cat-btn {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .faq-experience--dark .faq-cat-btn:hover {
          border-color: rgba(204, 160, 83, 0.4);
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-cat-btn--active {
          background: rgba(204, 160, 83, 0.15);
          border-color: rgba(204, 160, 83, 0.5);
          color: #E8CA7C;
          font-weight: 700;
        }
        .faq-experience--dark .faq-cat-badge {
          background: rgba(255, 255, 255, 0.08);
          color: #94A3B8;
        }
        .faq-experience--dark .faq-cat-badge--active {
          background: rgba(204, 160, 83, 0.25);
          color: #E8CA7C;
        }
        .faq-experience--dark .faq-results-count {
          color: #64748B;
        }
        .faq-experience--dark .faq-results-count strong {
          color: #E8CA7C;
        }
        .faq-experience--dark .faq-action-link {
          color: #94A3B8;
          text-decoration: none;
          transition: color 160ms ease;
        }
        .faq-experience--dark .faq-action-link:hover {
          color: #E8CA7C;
        }
        .faq-experience--dark .faq-action-sep {
          color: rgba(255, 255, 255, 0.18);
        }
        .faq-experience--dark .faq-card {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0;
          box-shadow: none;
          transition: border-color 220ms ease;
        }
        .faq-experience--dark .faq-card:first-child {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .faq-experience--dark .faq-card:hover {
          background: transparent;
          border-bottom-color: rgba(204, 160, 83, 0.35);
        }
        .faq-experience--dark .faq-card--open {
          background: transparent;
          border-bottom-color: rgba(204, 160, 83, 0.45);
          box-shadow: none;
        }
        .faq-experience--dark .faq-card__category-chip {
          color: rgba(204, 160, 83, 0.72);
          background: transparent;
        }
        .faq-experience--dark .faq-card__question {
          color: #F8FAFC;
          font-family: var(--font-sans);
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .faq-experience--dark .faq-card:hover .faq-card__question,
        .faq-experience--dark .faq-card--open .faq-card__question {
          color: #E8CA7C;
        }
        .faq-experience--dark .faq-card__chevron-wrap {
          background: transparent;
          border: none;
          color: #94A3B8;
          transition: color 200ms ease;
        }
        .faq-experience--dark .faq-card:hover .faq-card__chevron-wrap,
        .faq-experience--dark .faq-card--open .faq-card__chevron-wrap {
          background: transparent;
          border: none;
          color: #E8CA7C;
        }
        .faq-experience--dark .faq-card__body {
          color: #94A3B8;
          border: none;
        }
        .faq-experience--dark :global(.faq-bullet-icon) {
          background: rgba(204, 160, 83, 0.14);
          color: #CCA053;
        }
        .faq-experience--dark :global(.faq-strong-highlight) {
          color: #F8FAFC;
        }
        .faq-experience--dark .faq-view-all-btn {
          background: rgba(204, 160, 83, 0.08);
          border: 1px solid rgba(204, 160, 83, 0.4);
          color: #E8CA7C;
          font-weight: 700;
          padding: 13px 28px;
          box-shadow: none;
        }
        .faq-experience--dark .faq-view-all-btn:hover {
          background: rgba(204, 160, 83, 0.18);
          border-color: #CCA053;
          color: #FFFFFF;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .faq-experience--dark .faq-empty-state {
          background: #131518;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .faq-experience--dark .faq-empty-title {
          color: #FFFFFF;
        }
        .faq-experience--dark .faq-empty-text {
          color: #94A3B8;
        }
      `}</style>
    </div>
  )
}
