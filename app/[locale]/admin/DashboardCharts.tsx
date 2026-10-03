'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { MonthlyData, CamperOccupancy } from '@/lib/admin/dashboardMetrics'
import { formatPrice } from '@/lib/pricing/engine'
import { TrendingUp, Truck, Calendar, ArrowRight, ShieldCheck, Sparkles, Navigation } from 'lucide-react'

interface Props {
  monthlyData: MonthlyData[]
  fleetOccupancy: CamperOccupancy[]
  currentMonthName: string
  averageTicket?: number
  globalOccupancy?: number
  totalBookedDays?: number
  totalAvailableDays?: number
}

export default function DashboardCharts({
  monthlyData,
  fleetOccupancy,
  currentMonthName,
  averageTicket = 0,
  globalOccupancy = 0,
  totalBookedDays = 0,
  totalAvailableDays = 0,
}: Props) {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyData | null>(null)

  // Chart math
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1000)
  const totalPeriodRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)
  const totalPeriodBookings = monthlyData.reduce((sum, m) => sum + m.bookingsCount, 0)
  const averageMonthlyRevenue = Math.round(totalPeriodRevenue / (monthlyData.length || 1))

  // Dimensions for SVG
  const chartHeight = 160
  const chartWidth = 540
  const barWidth = 36
  const paddingX = 36
  const availableWidth = chartWidth - paddingX * 2
  const step = monthlyData.length > 1 ? availableWidth / (monthlyData.length - 1) : 0

  // Camper render map (Renders 3D exteriores fotorrealistas de alta fidelidad)
  const getCamperImage = (slugOrName: string) => {
    const s = slugOrName.toLowerCase()
    if (s.includes('space')) return '/images/campers/space/space-ext.png'
    return '/images/campers/neo/neo-ext.png'
  }

  const getCamperTagline = (slugOrName: string) => {
    const s = slugOrName.toLowerCase()
    if (s.includes('space')) return 'Gran Volumen · 4 Plazas Viajar/Dormir'
    return 'Compact Camper · Máxima Agilidad y Confort'
  }

  return (
    <div className="analytics-cockpit">
      {/* Grid de 2 Columnas Balanceadas (58% Financiero / 42% Flota) */}
      <div className="cockpit-grid">
        {/* Card 1: Barómetro Semestral de Ingresos */}
        <div className="cockpit-card cockpit-card--finance">
          <div className="cockpit-card__header">
            <div className="cockpit-card__header-left">
              <span className="cockpit-tag">
                <TrendingUp size={13} />
                <span>Rendimiento Semestral</span>
              </span>
              <h3 className="cockpit-card__title">Evolución de Ingresos</h3>
              <p className="cockpit-card__subtitle">Facturación confirmada por mes (Últimos 6 meses)</p>
            </div>

            <Link href="/admin/bookings?status=confirmed" className="cockpit-stat-badge" title="Ver reservas confirmadas">
              <div className="cockpit-stat-badge__val">{formatPrice(totalPeriodRevenue)}</div>
              <div className="cockpit-stat-badge__sub">
                <span>{totalPeriodBookings} reservas</span>
                <span className="cockpit-stat-badge__dot">·</span>
                <span>Media {formatPrice(averageMonthlyRevenue)}/mes</span>
              </div>
            </Link>
          </div>

          {/* SVG Bar Chart con Estética High-End */}
          <div className="chart-container">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="executive-svg"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Gráfico de facturación mensual semestral"
            >
              <defs>
                {/* Gradiente sutil para barras normales */}
                <linearGradient id="barGradNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2E5444" />
                  <stop offset="100%" stopColor="#1E3A2F" />
                </linearGradient>

                {/* Gradiente para barra del mes actual / hovered */}
                <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4A846B" />
                  <stop offset="100%" stopColor="#224235" />
                </linearGradient>

                {/* Gradiente para hover */}
                <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5EA385" />
                  <stop offset="100%" stopColor="#1E3A2F" />
                </linearGradient>
              </defs>

              {/* Líneas guía sutiles con micro-contrastes */}
              <line x1={paddingX} y1={25} x2={chartWidth - paddingX} y2={25} stroke="#F1F5F9" strokeDasharray="3 3" />
              <line x1={paddingX} y1={72} x2={chartWidth - paddingX} y2={72} stroke="#F1F5F9" strokeDasharray="3 3" />
              <line x1={paddingX} y1={120} x2={chartWidth - paddingX} y2={120} stroke="#E2E8F0" strokeWidth="1" />

              {/* Línea de Promedio Mensual */}
              {averageMonthlyRevenue > 0 && maxRevenue > 0 && (
                <g className="chart-average-line">
                  <line
                    x1={paddingX}
                    y1={120 - Math.min(95, (averageMonthlyRevenue / maxRevenue) * 95)}
                    x2={chartWidth - paddingX}
                    y2={120 - Math.min(95, (averageMonthlyRevenue / maxRevenue) * 95)}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                </g>
              )}

              {/* Barras Mensuales */}
              {monthlyData.map((d, idx) => {
                const cx = paddingX + idx * step
                const x = cx - barWidth / 2
                const heightFraction = maxRevenue > 0 ? d.revenue / maxRevenue : 0
                const maxBarH = 92
                const h = Math.max(heightFraction * maxBarH, d.revenue > 0 ? 8 : 4)
                const y = 120 - h
                const isHovered = hoveredMonth?.key === d.key
                const isCurrent = d.isCurrentMonth

                return (
                  <g
                    key={d.key}
                    className="chart-bar-interactive-group"
                    onMouseEnter={() => setHoveredMonth(d)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${d.fullMonth} ${d.year}: ${formatPrice(d.revenue)}`}
                  >
                    {/* Hitbox amplio y cómodo para tocar o pasar cursor */}
                    <rect
                      x={cx - step / 2}
                      y={0}
                      width={step}
                      height={140}
                      fill="transparent"
                      className="chart-interactive-hitbox"
                    />

                    {/* Barra vacía cuando no hay ingresos */}
                    {d.revenue === 0 && (
                      <rect
                        x={x}
                        y={116}
                        width={barWidth}
                        height={4}
                        rx={2}
                        fill="#E2E8F0"
                        opacity={0.8}
                      />
                    )}

                    {/* Barra con datos de ingresos */}
                    {d.revenue > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        rx={5}
                        fill={isHovered ? 'url(#barGradHover)' : isCurrent ? 'url(#barGradActive)' : 'url(#barGradNormal)'}
                        className="chart-bar-shape"
                      />
                    )}

                    {/* Etiqueta de mes debajo */}
                    <text
                      x={cx}
                      y={142}
                      textAnchor="middle"
                      className={`chart-month-text ${isCurrent ? 'chart-month-text--current' : ''}`}
                    >
                      {d.month}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Tooltip Dinámico Flotante de Alta Resolución */}
            <div className={`chart-dynamic-tooltip ${hoveredMonth ? 'chart-dynamic-tooltip--active' : ''}`}>
              {hoveredMonth ? (
                <div className="tooltip-inner">
                  <div className="tooltip-top">
                    <span className="tooltip-month-name">{hoveredMonth.fullMonth} {hoveredMonth.year}</span>
                    <span className="tooltip-amount">{formatPrice(hoveredMonth.revenue)}</span>
                  </div>
                  <div className="tooltip-bottom">
                    <span className="tooltip-bookings-count">
                      {hoveredMonth.bookingsCount} {hoveredMonth.bookingsCount === 1 ? 'reserva confirmada' : 'reservas confirmadas'}
                      {hoveredMonth.bookingsCount > 0 ? ` · Ticket medio ${formatPrice(Math.round(hoveredMonth.revenue / hoveredMonth.bookingsCount))}` : ''}
                    </span>
                    <Link href="/admin/bookings" className="tooltip-link">
                      <span>Ver reservas</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="tooltip-placeholder">
                  <span>Pasa el cursor o selecciona un mes para inspeccionar ingresos y reservas</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Monitor de Ocupación de Flota (NEO & SPACE) */}
        <div className="cockpit-card cockpit-card--fleet">
          <div className="cockpit-card__header">
            <div>
              <span className="cockpit-tag cockpit-tag--emerald">
                <Truck size={13} />
                <span>Flota Utopia</span>
              </span>
              <h3 className="cockpit-card__title">Ocupación de Campers</h3>
              <p className="cockpit-card__subtitle">{currentMonthName} · Tasa Global: {globalOccupancy}%</p>
            </div>

            <Link href="/admin/calendar" className="cockpit-card__link-btn">
              <Calendar size={14} />
              <span>Calendario</span>
            </Link>
          </div>

          {/* Lista de Fichas Ejecutivas de Campers */}
          <div className="camper-fleet-list">
            {fleetOccupancy.map(camper => {
              const isHigh = camper.occupancyPercent >= 70
              const isMedium = camper.occupancyPercent >= 30 && camper.occupancyPercent < 70
              const camperImg = getCamperImage(camper.slug || camper.name)
              const tagline = getCamperTagline(camper.slug || camper.name)

              return (
                <Link
                  key={camper.id}
                  href="/admin/calendar"
                  className="fleet-cockpit-item"
                  title={`Abrir calendario y reservas de ${camper.name}`}
                >
                  <div className="fleet-cockpit-item__inner">
                    {/* Render del vehículo */}
                    <div className="fleet-cockpit-item__render-box">
                      <Image
                        src={camperImg}
                        alt={`Camper ${camper.name}`}
                        width={96}
                        height={60}
                        style={{ width: 'auto', height: '100%', maxWidth: '100%' }}
                        className="fleet-cockpit-item__render-img"
                        priority
                      />
                    </div>

                    {/* Información y estadísticas */}
                    <div className="fleet-cockpit-item__content">
                      <div className="fleet-cockpit-item__header-row">
                        <div className="fleet-cockpit-item__title-wrap">
                          <h4 className="fleet-cockpit-item__name">{camper.name}</h4>
                          <span className={`fleet-cockpit-badge ${isHigh ? 'fleet-cockpit-badge--high' : isMedium ? 'fleet-cockpit-badge--med' : 'fleet-cockpit-badge--low'}`}>
                            {isHigh ? 'Alta demanda' : isMedium ? 'Ocupación media' : 'Disponibilidad alta'}
                          </span>
                        </div>
                        <div className="fleet-cockpit-item__pct-display">
                          <span className="fleet-cockpit-item__pct-num">{camper.occupancyPercent}%</span>
                          <ArrowRight size={14} className="fleet-cockpit-item__arrow" />
                        </div>
                      </div>

                      <div className="fleet-cockpit-item__meta-row">
                        <span className="fleet-cockpit-item__tagline">{tagline}</span>
                        <span className="fleet-cockpit-item__days">
                          <strong>{camper.bookedDays}</strong> de {camper.totalDaysInMonth} días reservados ({camper.availableDays} libres)
                        </span>
                      </div>

                      {/* Barra de progreso de hardware refinada */}
                      <div className="fleet-progress-track">
                        <div
                          className="fleet-progress-fill"
                          style={{
                            width: `${Math.max(camper.occupancyPercent, 4)}%`,
                            backgroundColor: isHigh ? '#1E3A2F' : isMedium ? '#2F5A47' : '#64748B'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="cockpit-card__footer">
            <Link href="/admin/calendar" className="cockpit-footer-link">
              <span>Gestionar bloqueos, salidas y disponibilidad en el Calendario</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-cockpit {
          width: 100%;
          margin-bottom: var(--space-6);
        }

        /* 1. Grid 2 Columnas Balanceadas */
        .cockpit-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .cockpit-grid {
            grid-template-columns: 1.18fr 0.82fr;
          }
        }

        .cockpit-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 6px 16px -4px rgba(0, 0, 0, 0.03);
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .cockpit-card:hover {
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }

        .cockpit-card__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }
        .cockpit-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.725rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--forest-green);
          background: #EBF4F0;
          padding: 3px 8px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .cockpit-tag--emerald {
          background: #DCFCE7;
          color: #166534;
        }
        .cockpit-card__title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .cockpit-card__subtitle {
          font-size: 0.8rem;
          color: var(--gray-500);
          margin: 3px 0 0 0;
        }

        /* Stat badge en cabecera de gráfico */
        .cockpit-stat-badge {
          text-align: right;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 8px 12px;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .cockpit-stat-badge:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          transform: translateY(-1px);
        }
        .cockpit-stat-badge:active {
          transform: scale(0.98);
        }
        .cockpit-stat-badge__val {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--forest-green);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .cockpit-stat-badge__sub {
          font-size: 0.725rem;
          color: var(--gray-500);
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cockpit-stat-badge__dot {
          color: #94A3B8;
        }

        /* Botón de enlace en cabecera */
        .cockpit-card__link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--forest-green);
          text-decoration: none;
          padding: 7px 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .cockpit-card__link-btn:hover {
          background: #EBF4F0;
          border-color: #D1E5DC;
          transform: translateY(-1px);
        }
        .cockpit-card__link-btn:active {
          transform: scale(0.98);
        }

        /* SVG Bar Chart */
        .chart-container {
          position: relative;
          width: 100%;
        }
        .executive-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .chart-bar-interactive-group {
          cursor: pointer;
          outline: none;
        }
        .chart-bar-shape {
          transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms ease;
          transform-origin: bottom;
        }
        .chart-bar-interactive-group:hover .chart-bar-shape {
          transform: scaleY(1.025);
          opacity: 0.95;
        }
        .chart-month-text {
          font-size: 11px;
          fill: #64748B;
          font-weight: 600;
        }
        .chart-month-text--current {
          fill: var(--forest-green);
          font-weight: 700;
        }

        /* Tooltip interactivo flotante */
        .chart-dynamic-tooltip {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 10px 16px;
          margin-top: 10px;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 140ms ease, border-color 140ms ease;
        }
        .chart-dynamic-tooltip--active {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }
        .tooltip-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tooltip-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tooltip-month-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--gray-800);
        }
        .tooltip-amount {
          font-size: 1rem;
          font-weight: 700;
          color: var(--forest-green);
          font-variant-numeric: tabular-nums;
        }
        .tooltip-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tooltip-bookings-count {
          font-size: 0.775rem;
          color: var(--gray-600);
        }
        .tooltip-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--forest-green);
          text-decoration: none;
          padding: 2px 7px;
          background: white;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          transition: background-color 120ms ease;
        }
        .tooltip-link:hover {
          background: #DCFCE7;
        }
        .tooltip-placeholder {
          font-size: 0.8rem;
          color: var(--gray-400);
          font-style: italic;
        }

        /* Fleet Camper Cards */
        .camper-fleet-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .fleet-cockpit-item {
          text-decoration: none;
          display: block;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 12px 14px;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
                      border-color 160ms ease,
                      background-color 160ms ease,
                      box-shadow 160ms ease;
        }
        .fleet-cockpit-item:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
        }
        .fleet-cockpit-item:active {
          transform: scale(0.98);
        }
        .fleet-cockpit-item__inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .fleet-cockpit-item__render-box {
          width: 96px;
          height: 60px;
          border-radius: 10px;
          background: linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%);
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          padding: 4px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .fleet-cockpit-item__render-img {
          width: auto;
          height: 100%;
          max-width: 100%;
          object-fit: contain;
          transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fleet-cockpit-item:hover .fleet-cockpit-item__render-img {
          transform: scale(1.06);
        }
        .fleet-cockpit-item__content {
          flex: 1;
          min-width: 0;
        }
        .fleet-cockpit-item__header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 3px;
        }
        .fleet-cockpit-item__title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fleet-cockpit-item__name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .fleet-cockpit-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 99px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .fleet-cockpit-badge--high {
          background: #DCFCE7;
          color: #166534;
        }
        .fleet-cockpit-badge--med {
          background: #E0E7FF;
          color: #3730A3;
        }
        .fleet-cockpit-badge--low {
          background: #F1F5F9;
          color: #475569;
        }
        .fleet-cockpit-item__pct-display {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .fleet-cockpit-item__pct-num {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--forest-green);
          font-variant-numeric: tabular-nums;
        }
        .fleet-cockpit-item__arrow {
          color: #94A3B8;
          transition: transform 140ms ease, color 140ms ease;
        }
        .fleet-cockpit-item:hover .fleet-cockpit-item__arrow {
          color: var(--forest-green);
          transform: translateX(3px);
        }
        .fleet-cockpit-item__meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-bottom: 6px;
        }
        .fleet-cockpit-item__tagline {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          color: #64748B;
        }
        .fleet-cockpit-item__days strong {
          color: var(--gray-900);
        }
        .fleet-progress-track {
          width: 100%;
          height: 7px;
          background: #E2E8F0;
          border-radius: 99px;
          overflow: hidden;
        }
        .fleet-progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 400ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        .cockpit-card__footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #F1F5F9;
        }
        .cockpit-footer-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--forest-green);
          text-decoration: none;
          transition: transform 140ms ease;
        }
        .cockpit-footer-link:hover {
          transform: translateX(3px);
        }

        @media (max-width: 640px) {
          .cockpit-card__header {
            flex-direction: column;
            align-items: flex-start;
          }
          .cockpit-stat-badge {
            align-items: flex-start;
            text-align: left;
            width: 100%;
          }
          .fleet-cockpit-item__meta-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .chart-dynamic-tooltip {
            padding: 8px 12px;
          }
          .tooltip-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  )
}
