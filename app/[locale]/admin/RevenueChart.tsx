'use client'

import { useState, type CSSProperties } from 'react'
import { MonthlyData } from '@/lib/admin/dashboardMetrics'
import { formatPrice } from '@/lib/pricing/engine'

interface Props {
  /** Serie de 12 meses, del más antiguo al actual */
  monthlyData: MonthlyData[]
}

const compactEuro = (value: number) =>
  value >= 1000 ? `${(value / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k €` : `${Math.round(value)} €`

export default function RevenueChart({ monthlyData }: Props) {
  const [range, setRange] = useState<6 | 12>(6)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const data = monthlyData.slice(-range)
  const max = Math.max(...data.map(m => m.revenue), 1)
  // Escala "redonda" para que las guías del eje sean legibles
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const scaleMax = Math.ceil(max / magnitude) * magnitude

  const total = data.reduce((s, m) => s + m.revenue, 0)
  const totalBookings = data.reduce((s, m) => s + m.bookingsCount, 0)
  const active = data.find(m => m.key === activeKey) || data[data.length - 1]

  return (
    <section className="rev" aria-labelledby="rev-title">
      <div className="rev__head">
        <div>
          <h2 id="rev-title" className="rev__title">Ingresos por mes de salida</h2>
          <p className="rev__summary">
            <span className="rev__total">{formatPrice(total)}</span>
            <span>en {range} meses · {totalBookings} {totalBookings === 1 ? 'reserva' : 'reservas'}</span>
          </p>
        </div>
        <div className="rev__toggle" role="group" aria-label="Periodo del gráfico">
          {([6, 12] as const).map(r => (
            <button
              key={r}
              type="button"
              className={`rev__toggle-btn ${range === r ? 'rev__toggle-btn--on' : ''}`}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {r} meses
            </button>
          ))}
        </div>
      </div>

      <div className="rev__plot">
        <div className="rev__grid" aria-hidden="true">
          <span className="rev__gridline"><span>{compactEuro(scaleMax)}</span></span>
          <span className="rev__gridline"><span>{compactEuro(scaleMax / 2)}</span></span>
          <span className="rev__gridline rev__gridline--base"><span>0</span></span>
        </div>
        <div className="rev__bars">
          {data.map(m => {
            const isActive = m.key === active.key
            return (
              <button
                key={m.key}
                type="button"
                className={`rev__col ${isActive ? 'rev__col--active' : ''} ${m.isCurrentMonth ? 'rev__col--current' : ''}`}
                onMouseEnter={() => setActiveKey(m.key)}
                onFocus={() => setActiveKey(m.key)}
                onClick={() => setActiveKey(m.key)}
                aria-label={`${m.fullMonth} ${m.year}: ${formatPrice(m.revenue)}, ${m.bookingsCount} reservas`}
              >
                <span className="rev__bar-area">
                  <span
                    className={`rev__bar ${m.revenue === 0 ? 'rev__bar--empty' : ''}`}
                    style={{ '--h': `${(m.revenue / scaleMax) * 100}%` } as CSSProperties}
                  />
                </span>
                <span className="rev__month">{m.month}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rev__detail" aria-live="polite">
        <span className="rev__detail-month">{active.fullMonth} {active.year}</span>
        <span className="rev__detail-value">{formatPrice(active.revenue)}</span>
        <span className="rev__detail-meta">
          {active.bookingsCount} {active.bookingsCount === 1 ? 'reserva' : 'reservas'}
          {active.bookingsCount > 0 && ` · ticket medio ${formatPrice(Math.round(active.revenue / active.bookingsCount))}`}
        </span>
      </div>

      <style jsx>{`
        .rev {
          background: var(--adm-surface);
          border: 1px solid var(--adm-card-border);
          border-radius: 20px;
          box-shadow: var(--adm-card-shadow);
          padding: 28px 30px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }
        .rev__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .rev__title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          letter-spacing: -0.015em;
          font-weight: 600;
          color: var(--adm-text);
          margin: 0 0 6px;
        }
        .rev__summary {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0;
          font-size: 0.8rem;
          color: var(--adm-text-2);
        }
        .rev__total {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--adm-text);
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }
        .rev__toggle {
          display: inline-flex;
          padding: 3px;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 10px;
          flex-shrink: 0;
        }
        .rev__toggle-btn {
          border: 0;
          background: transparent;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--adm-text-2);
          padding: 5px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
        }
        .rev__toggle-btn:hover {
          color: var(--adm-text);
        }
        .rev__toggle-btn--on {
          background: var(--adm-surface);
          color: var(--adm-text);
          box-shadow: 0 1px 2px var(--adm-shadow);
        }

        .rev__plot {
          position: relative;
          height: 200px;
        }
        .rev__grid {
          position: absolute;
          inset: 0 0 26px 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;
        }
        .rev__gridline {
          border-top: 1px dashed var(--adm-border);
          position: relative;
        }
        .rev__gridline--base {
          border-top-style: solid;
          border-top-color: var(--adm-border-strong);
        }
        .rev__gridline span {
          position: absolute;
          top: -9px;
          left: 0;
          font-size: 0.68rem;
          color: var(--adm-text-3);
          background: var(--adm-surface);
          padding-right: 6px;
          font-variant-numeric: tabular-nums;
        }
        .rev__bars {
          position: absolute;
          inset: 0 0 0 44px;
          display: flex;
          gap: 6px;
        }
        .rev__col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font: inherit;
          border-radius: 8px;
        }
        .rev__col:focus-visible {
          outline: 2px solid var(--adm-gold);
          outline-offset: 2px;
        }
        .rev__bar-area {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .rev__bar {
          width: min(38px, 70%);
          height: max(var(--h), 3px);
          background: var(--adm-bar);
          border-radius: 6px 6px 2px 2px;
          transition: background-color 180ms var(--ease-out), height 380ms var(--ease-out);
        }
        .rev__bar--empty {
          height: 3px;
          background: var(--adm-border);
        }
        .rev__col--current .rev__bar:not(.rev__bar--empty) {
          background: var(--adm-gold-fill);
        }
        .rev__col--active .rev__bar:not(.rev__bar--empty) {
          background: var(--adm-gold);
        }
        .rev__month {
          height: 26px;
          display: flex;
          align-items: flex-end;
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--adm-text-3);
        }
        .rev__col--active .rev__month {
          color: var(--adm-text);
        }

        .rev__detail {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 4px 12px;
          padding-top: 14px;
          border-top: 1px solid var(--adm-border);
          font-size: 0.8rem;
          color: var(--adm-text-2);
        }
        .rev__detail-month {
          font-weight: 600;
          color: var(--adm-text);
        }
        .rev__detail-value {
          font-weight: 600;
          color: var(--adm-gold-text);
          font-variant-numeric: tabular-nums;
        }
        .rev__detail-meta {
          margin-left: auto;
        }

        @media (max-width: 640px) {
          .rev {
            padding: 18px 16px 16px;
          }
          .rev__head {
            flex-direction: column;
            align-items: stretch;
          }
          .rev__toggle {
            align-self: flex-start;
          }
          .rev__toggle-btn {
            min-height: 36px;
            padding: 6px 14px;
          }
          .rev__plot {
            height: 170px;
          }
          .rev__bars {
            gap: 3px;
          }
          .rev__detail-meta {
            margin-left: 0;
            width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rev__bar {
            transition: none;
          }
        }
      `}</style>
    </section>
  )
}
