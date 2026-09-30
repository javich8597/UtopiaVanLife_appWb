'use client'

import { useState } from 'react'
import {
  Zap,
  Droplets,
  SunMedium,
  UtensilsCrossed,
  ShieldCheck,
  ChevronDown
} from 'lucide-react'

export interface AccordionSpecItem {
  label: string
  val: string
  desc: string
}

export interface CamperAccordionGroup {
  id: string
  title: string
  subtitle: string
  badge: string
  iconName: 'zap' | 'droplets' | 'sun' | 'utensils' | 'shield'
  items: AccordionSpecItem[]
}

interface Props {
  groups: CamperAccordionGroup[]
}

export default function CamperSpecsAccordion({ groups }: Props) {
  const [openIds, setOpenIds] = useState<string[]>(['acc-1'])

  const toggleAccordion = (id: string) => {
    setOpenIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const allOpen = openIds.length === groups.length
  const toggleAll = () => {
    if (allOpen) {
      setOpenIds([])
    } else {
      setOpenIds(groups.map(g => g.id))
    }
  }

  const renderIcon = (name: string) => {
    switch (name) {
      case 'zap': return <Zap size={20} className="icon-gold" />
      case 'droplets': return <Droplets size={20} className="icon-cyan" />
      case 'sun': return <SunMedium size={20} className="icon-emerald" />
      case 'utensils': return <UtensilsCrossed size={20} className="icon-purple" />
      case 'shield': return <ShieldCheck size={20} className="icon-emerald" />
      default: return <Zap size={20} />
    }
  }

  return (
    <section className="specs-accordion-section" aria-label="Especificaciones y confort nómada">
      <div className="section-header">
        <div>
          <div className="title-left">
            <span className="gold-accent-dot" />
            <h2 className="section-title">Especificaciones & Confort Nómada</h2>
          </div>
          <p className="section-subtitle">
            Toda la información técnica sin saturar la pantalla. Despliega lo que quieras conocer.
          </p>
        </div>

        <button onClick={toggleAll} className="toggle-all-btn">
          {allOpen ? 'Colapsar todo' : 'Expandir todo'}
        </button>
      </div>

      <div className="accordion-list">
        {groups.map(group => {
          const isOpen = openIds.includes(group.id)
          return (
            <div key={group.id} className={`accordion-card ${isOpen ? 'accordion-card--open' : ''}`}>
              <button
                onClick={() => toggleAccordion(group.id)}
                className="accordion-header-btn"
                aria-expanded={isOpen}
                aria-controls={`panel-${group.id}`}
              >
                <div className="header-info">
                  <div className={`icon-container icon-container--${group.iconName}`}>
                    {renderIcon(group.iconName)}
                  </div>
                  <div>
                    <h3 className="group-title">{group.title}</h3>
                    <p className="group-subtitle">{group.subtitle}</p>
                  </div>
                </div>

                <div className="header-meta">
                  <span className="group-badge">{group.badge}</span>
                  <div className={`chevron-wrap ${isOpen ? 'chevron-wrap--open' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div id={`panel-${group.id}`} className="accordion-body">
                  <div className="specs-items-grid">
                    {group.items.map((item, idx) => (
                      <div key={idx} className="spec-subcard">
                        <span className="subcard-label">{item.label}</span>
                        <h4 className="subcard-val">{item.val}</h4>
                        <p className="subcard-desc">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .specs-accordion-section {
          width: 100%;
          margin-bottom: 56px;
        }
        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 18px;
          margin-bottom: 20px;
        }
        .title-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gold-accent-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #e6ca65;
          display: inline-block;
        }
        .section-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }
        .section-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin: 4px 0 0 0;
        }
        .toggle-all-btn {
          font-size: 12px;
          font-weight: 600;
          color: #e6ca65;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 4px 8px;
        }
        .toggle-all-btn:hover {
          color: #f7df8b;
          text-decoration: underline;
        }
        .accordion-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .accordion-card {
          background: #131518;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: border-color 0.25s ease, background-color 0.25s ease;
        }
        .accordion-card:hover {
          border-color: rgba(255, 255, 255, 0.16);
        }
        .accordion-card--open {
          border-color: rgba(230, 202, 101, 0.25);
        }
        .accordion-header-btn {
          width: 100%;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
        }
        .header-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .icon-container {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .icon-container--zap {
          background: rgba(230, 202, 101, 0.12);
          border: 1px solid rgba(230, 202, 101, 0.25);
          color: #e6ca65;
        }
        .icon-container--droplets {
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.25);
          color: #22d3ee;
        }
        .icon-container--sun {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
        }
        .icon-container--utensils {
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.25);
          color: #c084fc;
        }
        .icon-container--shield {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
        }
        .group-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .group-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 3px 0 0 0;
        }
        .header-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .group-badge {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 500;
        }
        .chevron-wrap {
          color: rgba(255, 255, 255, 0.6);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chevron-wrap--open {
          transform: rotate(180deg);
          color: #e6ca65;
        }
        .accordion-body {
          padding: 8px 24px 24px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .specs-items-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .spec-subcard {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 16px;
        }
        .subcard-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 4px;
        }
        .subcard-val {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
        }
        .subcard-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.5;
          margin: 0;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .specs-items-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .group-badge {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .specs-accordion-section {
            margin-bottom: 36px;
          }
          .accordion-header-btn {
            padding: 14px 16px;
          }
          .icon-container {
            width: 36px;
            height: 36px;
          }
          .group-title {
            font-size: 13px;
          }
          .group-subtitle {
            font-size: 11px;
          }
          .accordion-body {
            padding: 8px 16px 18px 16px;
          }
          .specs-items-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .spec-subcard {
            padding: 12px;
          }
        }
      `}</style>
    </section>
  )
}
