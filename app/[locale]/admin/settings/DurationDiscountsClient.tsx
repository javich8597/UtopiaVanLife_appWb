'use client'

import React, { useState } from 'react'
import {
  Percent,
  Plus,
  Trash2,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X
} from 'lucide-react'
import { DurationDiscount } from '@/lib/pricing/engine'

interface Props {
  initialDiscounts: DurationDiscount[]
}

export default function DurationDiscountsClient({ initialDiscounts }: Props) {
  const [discounts, setDiscounts] = useState<DurationDiscount[]>(
    [...initialDiscounts].sort((a, b) => a.min_days - b.min_days)
  )

  // Feedback states
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modal Create/Edit states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<DurationDiscount | null>(null)
  const [formMinDays, setFormMinDays] = useState(7)
  const [formDiscountPct, setFormDiscountPct] = useState(10)
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingDiscount(null)
    setFormMinDays(7)
    setFormDiscountPct(10)
    setFormIsActive(true)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (discount: DurationDiscount) => {
    setEditingDiscount(discount)
    setFormMinDays(discount.min_days)
    setFormDiscountPct(discount.discount_pct)
    setFormIsActive(discount.is_active)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Quick Toggle Active
  const handleToggleActive = async (discount: DurationDiscount) => {
    if (!discount.id) return

    setTogglingId(discount.id)
    const newStatus = !discount.is_active

    // Optimistic
    setDiscounts(prev =>
      prev.map(d => (d.id === discount.id ? { ...d, is_active: newStatus } : d))
    )

    try {
      const res = await fetch(`/api/admin/duration-discounts/${discount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al cambiar estado')
      }
    } catch (err: any) {
      console.error('Toggle discount error:', err)
      // Rollback
      setDiscounts(prev =>
        prev.map(d => (d.id === discount.id ? { ...d, is_active: !newStatus } : d))
      )
      alert(err.message || 'No se pudo actualizar el estado')
    } finally {
      setTogglingId(null)
    }
  }

  // Delete Discount Tier
  const handleDeleteDiscount = async (discountId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este tramo de descuento?')) {
      return
    }

    setDeletingId(discountId)

    try {
      const res = await fetch(`/api/admin/duration-discounts/${discountId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar el descuento')
      }

      setDiscounts(prev => prev.filter(d => d.id !== discountId))
    } catch (err: any) {
      console.error('Delete discount error:', err)
      alert(err.message || 'No se pudo eliminar el descuento')
    } finally {
      setDeletingId(null)
    }
  }

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (formMinDays < 2) {
      setFormError('El número mínimo de días debe ser al menos 2')
      return
    }

    if (formDiscountPct < 0 || formDiscountPct > 100) {
      setFormError('El porcentaje debe estar entre 0 y 100%')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingDiscount?.id) {
        // Edit existing
        const res = await fetch(`/api/admin/duration-discounts/${editingDiscount.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_days: formMinDays,
            discount_pct: formDiscountPct,
            is_active: formIsActive,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al actualizar tramo')

        setDiscounts(prev =>
          prev
            .map(d => (d.id === editingDiscount.id ? data.discount : d))
            .sort((a, b) => a.min_days - b.min_days)
        )
      } else {
        // Create new
        const res = await fetch('/api/admin/duration-discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_days: formMinDays,
            discount_pct: formDiscountPct,
            is_active: formIsActive,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al crear tramo')

        setDiscounts(prev =>
          [...prev, data.discount].sort((a, b) => a.min_days - b.min_days)
        )
      }

      setIsModalOpen(false)
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el descuento')
    } finally {
      setIsSubmitting(false)
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
        gap: 'var(--space-5)',
      }}
    >
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Percent size={22} style={{ color: 'var(--forest-green)' }} />
            <h2 className="text-h3" style={{ margin: 0, fontWeight: 700, fontSize: '1.35rem' }}>
              Descuentos por Larga Estancia
            </h2>
          </div>
          <p className="text-body text-small" style={{ color: 'var(--gray-600)', margin: '6px 0 0', maxWidth: 750 }}>
            Configura los tramos de descuento según los días de duración de la reserva. El motor aplicará de forma automática
            el tramo más beneficioso sobre la tarifa de alquiler del vehículo (excluyendo extras y fianza).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--forest-green)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(46,74,56,0.2)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
        >
          <Plus size={16} />
          Nuevo Tramo
        </button>
      </div>

      {/* 2. Lista / Tabla Interactiva */}
      {discounts.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--gray-300)',
          }}
        >
          <Percent size={32} style={{ color: 'var(--gray-400)', margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600, color: 'var(--gray-700)', margin: '0 0 4px' }}>
            No hay tramos de descuento por larga estancia configurados
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: '0 0 16px' }}>
            Añade tramos como 7 días (10%), 14 días (15%) o 21 días (20%) para incentivar estancias prolongadas.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'white',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Crear primer tramo
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--gray-200)',
                  color: 'var(--gray-600)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '10px 14px' }}>Duración Mínima</th>
                <th style={{ padding: '10px 14px' }}>Descuento</th>
                <th style={{ padding: '10px 14px' }}>Estado</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(discount => {
                const isToggling = togglingId === discount.id
                const isDeleting = deletingId === discount.id

                return (
                  <tr
                    key={discount.id}
                    style={{
                      borderBottom: '1px solid var(--gray-100)',
                      transition: 'background 0.15s ease',
                      opacity: discount.is_active ? 1 : 0.6,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Duración Mínima */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} style={{ color: 'var(--forest-green)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          A partir de {discount.min_days} días
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--gray-500)',
                            background: 'var(--gray-100)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          &ge; {discount.min_days}d
                        </span>
                      </div>
                    </td>

                    {/* Descuento */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'var(--forest-green)',
                          background: 'rgba(46,74,56,0.08)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        -{discount.discount_pct}%
                      </span>
                    </td>

                    {/* Estado con Toggle interactivo */}
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleActive(discount)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: isToggling ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: discount.is_active ? '#16a34a' : 'var(--gray-400)',
                        }}
                      >
                        {isToggling ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : discount.is_active ? (
                          <ToggleRight size={26} style={{ color: '#16a34a' }} />
                        ) : (
                          <ToggleLeft size={26} style={{ color: 'var(--gray-400)' }} />
                        )}
                        <span>{discount.is_active ? 'Activo' : 'Desactivado'}</span>
                      </button>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          title="Editar tramo"
                          onClick={() => handleOpenEdit(discount)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--gray-300)',
                            borderRadius: 'var(--radius-md)',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            color: 'var(--gray-600)',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--forest-green)'
                            e.currentTarget.style.color = 'var(--forest-green)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--gray-300)'
                            e.currentTarget.style.color = 'var(--gray-600)'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          title="Eliminar tramo"
                          disabled={isDeleting}
                          onClick={() => discount.id && handleDeleteDiscount(discount.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--gray-300)',
                            borderRadius: 'var(--radius-md)',
                            padding: '6px 8px',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            color: 'var(--gray-400)',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#dc2626'
                            e.currentTarget.style.color = '#dc2626'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--gray-300)'
                            e.currentTarget.style.color = 'var(--gray-400)'
                          }}
                        >
                          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Modal Crear / Editar */}
      {isModalOpen && (
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
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 440,
              width: '100%',
              padding: 'var(--space-6)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--gray-200)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={20} style={{ color: 'var(--forest-green)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {editingDiscount ? 'Editar Tramo de Descuento' : 'Nuevo Tramo de Descuento'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
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
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                  Días Mínimos de Alquiler
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="2"
                    max="365"
                    step="1"
                    required
                    value={formMinDays}
                    onChange={e => setFormMinDays(parseInt(e.target.value, 10) || 2)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px', display: 'block' }}>
                  Número mínimo de días que el cliente debe reservar para desbloquear este porcentaje.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                  Porcentaje de Descuento (%)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={formDiscountPct}
                    onChange={e => setFormDiscountPct(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 30px 8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--gray-300)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ position: 'absolute', right: 10, fontSize: '0.9rem', color: 'var(--gray-500)', pointerEvents: 'none' }}>
                    %
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px', display: 'block' }}>
                  Porcentaje aplicado al precio base del alquiler del vehículo.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                <input
                  type="checkbox"
                  id="discount_active_checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--forest-green)', cursor: 'pointer' }}
                />
                <label htmlFor="discount_active_checkbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', cursor: 'pointer' }}>
                  Activar este tramo en la web inmediatamente
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
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
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--forest-green)',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingDiscount ? 'Guardar Cambios' : 'Crear Tramo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
