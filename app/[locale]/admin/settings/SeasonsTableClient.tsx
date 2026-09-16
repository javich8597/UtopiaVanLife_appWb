'use client'

import React, { useState } from 'react'
import { Calendar, Check, Loader2, AlertCircle } from 'lucide-react'

interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  discount_7days_pct?: number
  min_nights?: number
}

interface Props {
  initialSeasons: Season[]
}

export default function SeasonsTableClient({ initialSeasons }: Props) {
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons || [])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const handleMinNightsChange = async (seasonId: string, newMinNights: number) => {
    if (newMinNights < 1 || newMinNights > 30) return

    // Optimistic update
    setSeasons(prev =>
      prev.map(s => (s.id === seasonId ? { ...s, min_nights: newMinNights } : s))
    )

    setSavingId(seasonId)
    setErrorId(null)
    setSavedId(null)

    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_nights: newMinNights }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al actualizar')
      }

      setSavedId(seasonId)
      setTimeout(() => {
        setSavedId(prev => (prev === seasonId ? null : prev))
      }, 2500)
    } catch (error: any) {
      console.error('Failed to update season min_nights:', error)
      setErrorId(seasonId)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Calendar size={18} style={{ color: 'var(--forest-green)' }} />
          <h2 className="text-h4">Temporadas y Estancia Mínima</h2>
        </div>
        <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
          Configuración por temporada
        </span>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fechas</th>
              <th>Mín. Noches</th>
              <th>Desc. 7+ días</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map(s => {
              const currentMin = s.min_nights ?? (s.name.toLowerCase().includes('alta') || s.name.toLowerCase().includes('verano') ? 5 : 3)
              const isSaving = savingId === s.id
              const isSaved = savedId === s.id
              const isError = errorId === s.id

              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="text-small">
                    {new Date(s.start_date).toLocaleDateString('es-ES')} → {new Date(s.end_date).toLocaleDateString('es-ES')}
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        disabled={isSaving || currentMin <= 1}
                        onClick={() => handleMinNightsChange(s.id, currentMin - 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          border: '1px solid var(--gray-300)',
                          background: 'white',
                          cursor: currentMin <= 1 || isSaving ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--forest-green)',
                          opacity: currentMin <= 1 ? 0.4 : 1,
                        }}
                        aria-label="Disminuir noches mínimas"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={currentMin}
                        disabled={isSaving}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10)
                          if (!isNaN(val)) handleMinNightsChange(s.id, val)
                        }}
                        style={{
                          width: '46px',
                          height: '28px',
                          textAlign: 'center',
                          borderRadius: '6px',
                          border: '1px solid var(--gray-300)',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: 'var(--forest-green)',
                        }}
                      />

                      <button
                        type="button"
                        disabled={isSaving || currentMin >= 30}
                        onClick={() => handleMinNightsChange(s.id, currentMin + 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          border: '1px solid var(--gray-300)',
                          background: 'white',
                          cursor: currentMin >= 30 || isSaving ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '14px',
                          color: 'var(--forest-green)',
                          opacity: currentMin >= 30 ? 0.4 : 1,
                        }}
                        aria-label="Aumentar noches mínimas"
                      >
                        +
                      </button>
                      <span className="text-xs" style={{ color: 'var(--gray-500)', marginLeft: '2px' }}>
                        noches
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                    {s.discount_7days_pct || 0}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isSaving && (
                      <span title="Guardando..." style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--gray-500)' }}>
                        <Loader2 size={16} className="animate-spin" />
                      </span>
                    )}
                    {isSaved && (
                      <span title="Guardado" style={{ display: 'inline-flex', alignItems: 'center', color: '#16a34a' }}>
                        <Check size={16} />
                      </span>
                    )}
                    {isError && (
                      <span title="Error al guardar" style={{ display: 'inline-flex', alignItems: 'center', color: '#dc2626' }}>
                        <AlertCircle size={16} />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--gray-500)' }}>
                  No hay temporadas configuradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
