'use client'

import React, { useState } from 'react'
import {
  Calendar,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  CalendarRange,
  ArrowRight,
  TrendingUp,
  X,
  Edit3,
} from 'lucide-react'
import { SeasonV2, SeasonPeriod, hasOverlappingPeriods, formatPrice } from '@/lib/pricing/engine'

interface CamperPricingInfo {
  id: string
  name: string
  slug: string
  base_price_per_night: number
  is_active: boolean
}

interface Props {
  initialSeasons: SeasonV2[]
  initialPeriods: SeasonPeriod[]
  campers: CamperPricingInfo[]
}

export default function SeasonsSupplementClient({
  initialSeasons,
  initialPeriods,
  campers
}: Props) {
  const [seasons, setSeasons] = useState<SeasonV2[]>(initialSeasons)
  const [periods, setPeriods] = useState<SeasonPeriod[]>(initialPeriods)

  // Feedback states for seasons update
  const [savingSeasonId, setSavingSeasonId] = useState<string | null>(null)
  const [savedSeasonId, setSavedSeasonId] = useState<string | null>(null)
  const [errorSeasonId, setErrorSeasonId] = useState<string | null>(null)

  // Add Period Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalSeasonId, setModalSeasonId] = useState<string>('')
  const [periodStartDate, setPeriodStartDate] = useState('')
  const [periodEndDate, setPeriodEndDate] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [isAddingPeriod, setIsAddingPeriod] = useState(false)
  const [addPeriodError, setAddPeriodError] = useState<string | null>(null)

  // Delete Period state
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null)

  // Handle Supplement / Min Nights Change
  const handleUpdateSeason = async (
    seasonId: string,
    updates: { supplement_per_night?: number; min_nights?: number }
  ) => {
    setSavingSeasonId(seasonId)
    setErrorSeasonId(null)
    setSavedSeasonId(null)

    // Optimistic update
    setSeasons(prev =>
      prev.map(s => (s.id === seasonId ? { ...s, ...updates } : s))
    )

    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: seasonId,
          ...updates,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al actualizar la temporada')
      }

      setSavedSeasonId(seasonId)
      setTimeout(() => {
        setSavedSeasonId(prev => (prev === seasonId ? null : prev))
      }, 2500)
    } catch (err: any) {
      console.error('Update season error:', err)
      setErrorSeasonId(seasonId)
    } finally {
      setSavingSeasonId(null)
    }
  }

  // Open modal for a specific season
  const handleOpenAddPeriod = (seasonId: string) => {
    setModalSeasonId(seasonId)
    setPeriodStartDate('')
    setPeriodEndDate('')
    setPeriodLabel('')
    setAddPeriodError(null)
    setIsAddModalOpen(true)
  }

  // Submit Add Period
  const handleAddPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddPeriodError(null)

    if (!modalSeasonId) {
      setAddPeriodError('Selecciona una temporada')
      return
    }

    if (!periodStartDate || !periodEndDate) {
      setAddPeriodError('Las fechas de inicio y fin son obligatorias')
      return
    }

    if (periodEndDate < periodStartDate) {
      setAddPeriodError('La fecha de fin no puede ser anterior a la fecha de inicio')
      return
    }

    // Client-side quick overlap validation
    const overlapDetected = hasOverlappingPeriods(
      { start_date: periodStartDate, end_date: periodEndDate },
      periods
    )

    if (overlapDetected) {
      setAddPeriodError('Este rango de fechas se solapa con otro periodo ya existente')
      return
    }

    setIsAddingPeriod(true)

    try {
      const res = await fetch('/api/admin/season-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: modalSeasonId,
          start_date: periodStartDate,
          end_date: periodEndDate,
          label: periodLabel.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el periodo')
      }

      setPeriods(prev => [...prev, data.period].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      setIsAddModalOpen(false)
    } catch (err: any) {
      setAddPeriodError(err.message || 'Error al guardar el periodo')
    } finally {
      setIsAddingPeriod(false)
    }
  }

  // Delete Period
  const handleDeletePeriod = async (periodId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este periodo de temporada?')) {
      return
    }

    setDeletingPeriodId(periodId)

    try {
      const res = await fetch(`/api/admin/season-periods/${periodId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar el periodo')
      }

      setPeriods(prev => prev.filter(p => p.id !== periodId))
    } catch (err: any) {
      console.error('Delete period error:', err)
      alert(err.message || 'No se pudo eliminar el periodo')
    } finally {
      setDeletingPeriodId(null)
    }
  }

  // Helper to format date display (e.g. 28 mar 2026)
  const formatPeriodDates = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr + 'T00:00:00')
      const end = new Date(endStr + 'T00:00:00')
      const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return {
        text: `${fmt.format(start)} → ${fmt.format(end)}`,
        days: `${diffDays} día${diffDays > 1 ? 's' : ''}`
      }
    } catch {
      return { text: `${startStr} → ${endStr}`, days: '' }
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-6)',
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid var(--gray-200)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* 1. Header con Resumen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CalendarRange size={22} style={{ color: 'var(--forest-green)' }} />
            <h2 className="text-h3" style={{ margin: 0, fontWeight: 700, fontSize: '1.35rem' }}>
              Temporadas & Suplementos por Noche
            </h2>
          </div>
          <p className="text-body text-small" style={{ color: 'var(--gray-600)', margin: '6px 0 0', maxWidth: 750 }}>
            Configura los suplementos por noche (+ €) según la temporada. El precio de alquiler será{' '}
            <strong style={{ color: 'var(--gray-900)' }}>Precio Base de la Camper + Suplemento de Temporada</strong>.
            Puedes asignar múltiples periodos de fechas no continuos a cada temporada.
          </p>
        </div>
      </div>

      {/* 2. Simulador en Vivo de Tarifas por Camper */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(46,74,56,0.04) 0%, rgba(200,169,126,0.08) 100%)',
          border: '1px solid rgba(46,74,56,0.15)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--forest-green)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>
              Simulador en Vivo de Precios Resultantes
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
            Los precios base se configuran en Flota / Campers
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {campers.map(camper => {
            const basePrice = Number(camper.base_price_per_night) || 120
            return (
              <div
                key={camper.id}
                style={{
                  background: 'white',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                  border: '1px solid var(--gray-200)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-100)', paddingBottom: '6px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{camper.name}</span>
                  <span style={{ fontSize: '0.8rem', background: 'var(--gray-100)', color: 'var(--gray-700)', padding: '2px 8px', borderRadius: '12px' }}>
                    Base: <strong>{formatPrice(basePrice)}/noche</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {seasons.map(s => {
                    const sup = Number(s.supplement_per_night) || 0
                    const finalNight = basePrice + sup
                    const isBaja = s.code === 'baja' || s.is_default
                    const badgeColor = s.color_badge || (s.code === 'alta' ? '#dc2626' : s.code === 'media' ? '#2563eb' : '#64748b')

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-700)' }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: badgeColor,
                              display: 'inline-block',
                            }}
                          />
                          {s.name}:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {isBaja ? '(sin suplemento)' : `(+${formatPrice(sup)})`}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                            {formatPrice(finalNight)}/noche
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Tarjetas de Temporadas (Alta, Media, Baja) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {seasons.map(season => {
          const isBaja = season.code === 'baja' || season.is_default
          const badgeColor = season.color_badge || (season.code === 'alta' ? '#dc2626' : season.code === 'media' ? '#2563eb' : '#64748b')
          const seasonPeriods = periods.filter(p => p.season_id === season.id)
          const isSaving = savingSeasonId === season.id
          const isSaved = savedSeasonId === season.id
          const hasError = errorSeasonId === season.id

          return (
            <div
              key={season.id}
              style={{
                border: `1px solid ${isBaja ? 'var(--gray-200)' : badgeColor + '40'}`,
                borderLeft: `4px solid ${badgeColor}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              }}
            >
              {/* Header de la Temporada */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: badgeColor,
                    }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                      {season.name}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {isBaja
                        ? 'Temporada base por defecto. Se aplica automáticamente a cualquier fecha fuera de temporada Alta o Media.'
                        : `Añade un suplemento por noche sobre la tarifa base de las campers.`}
                    </p>
                  </div>
                </div>

                {/* Formulario Inline de Parámetros Destacados (Suplemento y Noches Mínimas) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  {/* Suplemento por noche */}
                  {isBaja ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--gray-100)',
                        border: '1px solid var(--gray-200)',
                        color: 'var(--gray-600)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>Tarifa Base (0 € suplemento)</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        background: 'white',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${badgeColor}70`,
                        boxShadow: `0 2px 8px ${badgeColor}18`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Suplemento Editable
                        </span>
                        <Edit3 size={11} style={{ color: badgeColor }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: badgeColor }}>+</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={season.supplement_per_night}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0
                            handleUpdateSeason(season.id, { supplement_per_night: val })
                          }}
                          style={{
                            width: '68px',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            textAlign: 'right',
                            color: 'var(--gray-900)',
                            background: 'white',
                            outline: 'none',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = badgeColor)}
                          onBlur={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>
                          €/noche
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Noches mínimas */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      background: 'white',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #CBD5E1',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Estancia Mínima
                      </span>
                      <Clock size={11} style={{ color: 'var(--gray-400)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        value={season.min_nights}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 1
                          handleUpdateSeason(season.id, { min_nights: val })
                        }}
                        style={{
                          width: '52px',
                          padding: '3px 6px',
                          borderRadius: '6px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          color: 'var(--gray-900)',
                          background: 'white',
                          outline: 'none',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--forest-green)')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>
                        noches
                      </span>
                    </div>
                  </div>

                  {/* Feedback Status Indicator */}
                  <div style={{ minWidth: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSaving && <Loader2 size={18} className="animate-spin" style={{ color: 'var(--forest-green)' }} />}
                    {isSaved && <Check size={20} style={{ color: '#16a34a' }} />}
                    {hasError && (
                      <span title="Error al guardar">
                        <AlertCircle size={20} style={{ color: '#dc2626' }} />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Periodos de Fechas */}
              <div
                style={{
                  borderTop: '1px solid var(--gray-100)',
                  paddingTop: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                    Periodos de Fechas ({seasonPeriods.length})
                  </span>

                  {!isBaja && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeriod(season.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: badgeColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: `0 2px 6px ${badgeColor}35`,
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.opacity = '0.92'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.transform = 'none'
                      }}
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Añadir Periodo de Fechas</span>
                    </button>
                  )}
                </div>

                {isBaja ? (
                  <div
                    style={{
                      background: 'var(--gray-50)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      color: 'var(--gray-600)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid var(--gray-200)',
                    }}
                  >
                    <Info size={16} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                    <span>
                      La Temporada Baja cubre todas las fechas del año que no estén expresamente incluidas en periodos de Temporada Alta o Media.
                    </span>
                  </div>
                ) : seasonPeriods.length === 0 ? (
                  /* Tarjeta interactiva dashed grande cuando no hay periodos */
                  <button
                    type="button"
                    onClick={() => handleOpenAddPeriod(season.id)}
                    style={{
                      width: '100%',
                      padding: '20px',
                      background: `${badgeColor}08`,
                      border: `2px dashed ${badgeColor}80`,
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      color: badgeColor,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${badgeColor}15`
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = `${badgeColor}08`
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: badgeColor,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 2px 6px ${badgeColor}40`,
                      }}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                        Añadir Primer Periodo de Fechas para {season.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-600)' }}>
                        Haz clic aquí para programar rangos (ej. Verano, Semana Santa, Puentes o fines de semana clave)
                      </div>
                    </div>
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {seasonPeriods.map(period => {
                      const { text, days } = formatPeriodDates(period.start_date, period.end_date)
                      const isDeleting = deletingPeriodId === period.id

                      return (
                        <div
                          key={period.id}
                          style={{
                            background: 'white',
                            border: '1px solid var(--gray-200)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} style={{ color: badgeColor, flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-900)' }}>
                                {period.label || 'Periodo de Temporada'}
                              </span>
                              {days && (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: badgeColor,
                                    background: `${badgeColor}12`,
                                    padding: '1px 7px',
                                    borderRadius: '10px',
                                  }}
                                >
                                  {days}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '2px', fontWeight: 500 }}>
                              {text}
                            </div>
                          </div>

                          <button
                            type="button"
                            title="Eliminar periodo"
                            disabled={isDeleting}
                            onClick={() => period.id && handleDeletePeriod(period.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--gray-200)',
                              color: 'var(--gray-400)',
                              cursor: isDeleting ? 'not-allowed' : 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#fee2e2'
                              e.currentTarget.style.background = '#fef2f2'
                              e.currentTarget.style.color = '#dc2626'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'var(--gray-200)'
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = 'var(--gray-400)'
                            }}
                          >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      )
                    })}

                    {/* Tarjeta dashed para añadir otro periodo al final del grid */}
                    <button
                      type="button"
                      onClick={() => handleOpenAddPeriod(season.id)}
                      style={{
                        background: `${badgeColor}05`,
                        border: `2px dashed ${badgeColor}65`,
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: badgeColor,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        minHeight: '58px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${badgeColor}12`
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = `${badgeColor}05`
                        e.currentTarget.style.transform = 'none'
                      }}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      <span>+ Añadir Otro Periodo de Fechas</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. Modal para Añadir Nuevo Periodo */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 'var(--space-4)',
          }}
          onClick={() => !isAddingPeriod && setIsAddModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 480,
              width: '100%',
              padding: 'var(--space-6)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--gray-200)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarRange size={20} style={{ color: 'var(--forest-green)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  Añadir Periodo de Temporada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            {addPeriodError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{addPeriodError}</span>
              </div>
            )}

            <form onSubmit={handleAddPeriodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                  Temporada
                </label>
                <select
                  value={modalSeasonId}
                  onChange={e => setModalSeasonId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-300)',
                    fontSize: '0.9rem',
                    background: 'white',
                  }}
                >
                  {seasons.filter(s => s.code !== 'baja').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+{formatPrice(s.supplement_per_night)}/noche)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                  Etiqueta / Nombre Descriptivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Semana Santa, Verano Julio, Puente Octubre"
                  value={periodLabel}
                  onChange={e => setPeriodLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-300)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={periodStartDate}
                    onChange={e => setPeriodStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={periodEndDate}
                    onChange={e => setPeriodEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  disabled={isAddingPeriod}
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-300)',
                    background: 'white',
                    color: 'var(--gray-700)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAddingPeriod}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--forest-green)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isAddingPeriod ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isAddingPeriod ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Guardar Periodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
