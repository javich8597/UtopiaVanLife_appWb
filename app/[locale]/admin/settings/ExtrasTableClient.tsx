'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertTriangle,
  Waves,
  Armchair,
  Table as TableIcon,
  Wifi,
  Bike,
  Umbrella,
  Coffee,
  Shield,
  Flame,
  Check,
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import { useRouter } from 'next/navigation'

export interface ExtraItem {
  id: string
  name_es: string
  name_en?: string
  description_es?: string
  description_en?: string
  price: number
  price_type: 'per_rental' | 'per_day'
  icon?: string
  is_active: boolean
}

interface Props {
  initialExtras: ExtraItem[]
}

const AVAILABLE_ICONS = [
  { id: 'sparkles', label: 'Brillo / Limpieza', Icon: Sparkles },
  { id: 'waves', label: 'Snorkel / Olas', Icon: Waves },
  { id: 'armchair', label: 'Silla / Asiento', Icon: Armchair },
  { id: 'table', label: 'Mesa', Icon: TableIcon },
  { id: 'wifi', label: 'Wi-Fi / Internet', Icon: Wifi },
  { id: 'bike', label: 'Bicicleta', Icon: Bike },
  { id: 'umbrella', label: 'Toldo / Sombrilla', Icon: Umbrella },
  { id: 'coffee', label: 'Café / Desayuno', Icon: Coffee },
  { id: 'shield', label: 'Seguro / Protección', Icon: Shield },
  { id: 'flame', label: 'Gas / Calefacción', Icon: Flame },
]

import { AppleSwitch } from '@/components/ui/AppleSwitch'
export { AppleSwitch }

export default function ExtrasTableClient({ initialExtras }: Props) {
  const router = useRouter()
  const [extras, setExtras] = useState<ExtraItem[]>(initialExtras || [])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingExtra, setEditingExtra] = useState<ExtraItem | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name_es: '',
    name_en: '',
    description_es: '',
    price: 25,
    price_type: 'per_rental' as 'per_rental' | 'per_day',
    icon: 'sparkles',
    is_active: true,
  })
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Delete State
  const [extraToDelete, setExtraToDelete] = useState<ExtraItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Open Create
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingExtra(null)
    setFormData({
      name_es: '',
      name_en: '',
      description_es: '',
      price: 20,
      price_type: 'per_rental',
      icon: 'sparkles',
      is_active: true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  // Open Edit
  const handleOpenEdit = (extra: ExtraItem) => {
    setModalMode('edit')
    setEditingExtra(extra)
    setFormData({
      name_es: extra.name_es,
      name_en: extra.name_en || '',
      description_es: extra.description_es || '',
      price: Number(extra.price) || 0,
      price_type: extra.price_type === 'per_day' ? 'per_day' : 'per_rental',
      icon: extra.icon || 'sparkles',
      is_active: extra.is_active ?? true,
    })
    setFormError('')
    setIsModalOpen(true)
  }

  // Quick Toggle Active Status
  const handleToggleActive = async (extra: ExtraItem) => {
    setTogglingId(extra.id)
    const newStatus = !extra.is_active

    // Optimistic
    setExtras(prev =>
      prev.map(e => (e.id === extra.id ? { ...e, is_active: newStatus } : e))
    )

    try {
      const res = await fetch(`/api/admin/extras/${extra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al actualizar estado')
      }

      router.refresh()
    } catch (err: any) {
      console.error('Toggle extra status error:', err)
      // Rollback
      setExtras(prev =>
        prev.map(e => (e.id === extra.id ? { ...e, is_active: extra.is_active } : e))
      )
      alert(err.message || 'Error al actualizar el estado del extra')
    } finally {
      setTogglingId(null)
    }
  }

  // Save Extra
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name_es.trim()) {
      setFormError('El nombre en español es obligatorio.')
      return
    }

    if (formData.price < 0) {
      setFormError('El precio debe ser un número mayor o igual a 0.')
      return
    }

    setIsSaving(true)

    try {
      const url = modalMode === 'create' ? '/api/admin/extras' : `/api/admin/extras/${editingExtra?.id}`
      const method = modalMode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_es: formData.name_es.trim(),
          name_en: formData.name_en.trim() || formData.name_es.trim(),
          description_es: formData.description_es.trim(),
          price: Number(formData.price),
          price_type: formData.price_type,
          icon: formData.icon,
          is_active: formData.is_active,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el extra')
      }

      if (modalMode === 'create') {
        setExtras(prev => [...prev, data.extra])
      } else {
        setExtras(prev =>
          prev.map(item => (item.id === editingExtra?.id ? { ...item, ...data.extra } : item))
        )
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setFormError(err.message || 'Ocurrió un error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!extraToDelete) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/extras/${extraToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar')
      }

      if (data.archived) {
        // Was soft-deleted / deactivated
        setExtras(prev =>
          prev.map(e => (e.id === extraToDelete.id ? { ...e, is_active: false } : e))
        )
      } else {
        setExtras(prev => prev.filter(e => e.id !== extraToDelete.id))
      }

      setExtraToDelete(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const renderIcon = (iconName?: string) => {
    const found = AVAILABLE_ICONS.find(i => i.id === iconName)
    const IconComponent = found ? found.Icon : Sparkles
    return <IconComponent size={16} />
  }

  return (
    <div className="card" style={{ padding: 'var(--space-6)', background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid var(--gray-200)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-h4" style={{ margin: 0, fontWeight: 700 }}>Extras de Alquiler</h2>
            <p className="text-xs" style={{ color: 'var(--gray-500)', margin: '2px 0 0' }}>
              Catálogo de equipamiento adicional disponible para los viajeros en el checkout.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-forest"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: 700,
            boxShadow: '0 3px 10px rgba(46,74,56,0.25)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} strokeWidth={2.5} /> Añadir Nuevo Extra
        </button>
      </div>

      {/* Extras Table */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Extra</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Descripción</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Precio</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {extras.map(e => {
              const isToggling = togglingId === e.id

              return (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background 0.15s' }}>
                  {/* Icon & Name */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--sand-light)', color: 'var(--forest-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {renderIcon(e.icon)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--black-matte)', fontSize: '0.9rem' }}>{e.name_es}</div>
                        {e.name_en && e.name_en !== e.name_es && (
                          <div className="text-xs" style={{ color: 'var(--gray-400)' }}>{e.name_en}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Description */}
                  <td style={{ padding: '14px 16px', maxWidth: 260 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.4 }} className="line-clamp-2">
                      {e.description_es || '-'}
                    </p>
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--forest-green)', fontSize: '0.95rem' }}>
                    {formatPrice(e.price)}
                  </td>

                  {/* Price Type Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: e.price_type === 'per_day' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: e.price_type === 'per_day' ? '#2563eb' : '#059669',
                      }}
                    >
                      {e.price_type === 'per_day' ? 'Por día' : 'Por alquiler'}
                    </span>
                  </td>

                  {/* Active Status Switch — Apple iOS Style */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <AppleSwitch
                      checked={e.is_active}
                      onChange={() => handleToggleActive(e)}
                      disabled={isToggling}
                      label={e.is_active ? 'Activo' : 'Inactivo'}
                    />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--forest-green)',
                          background: 'rgba(46,74,56,0.06)',
                          color: 'var(--forest-green)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={el => {
                          el.currentTarget.style.background = 'var(--forest-green)'
                          el.currentTarget.style.color = '#FFFFFF'
                        }}
                        onMouseLeave={el => {
                          el.currentTarget.style.background = 'rgba(46,74,56,0.06)'
                          el.currentTarget.style.color = 'var(--forest-green)'
                        }}
                        title="Editar información y precio de este extra"
                      >
                        <Edit3 size={13} strokeWidth={2.2} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExtraToDelete(e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                          background: '#fff5f5',
                          color: '#dc2626',
                          cursor: 'pointer',
                        }}
                        title="Eliminar extra"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {extras.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
                  <Sparkles size={32} style={{ color: 'var(--gray-300)', margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, margin: '4px 0' }}>No hay extras configurados</p>
                  <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
                    Haz clic en "Nuevo Extra" para añadir equipamiento adicional al catálogo.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botón Callout Destacado para Añadir Extra */}
      <button
        type="button"
        onClick={handleOpenCreate}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '16px 20px',
          background: 'rgba(46,74,56,0.03)',
          border: '2px dashed rgba(46,74,56,0.3)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--forest-green)',
          fontSize: '0.92rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(46,74,56,0.08)'
          e.currentTarget.style.borderColor = 'var(--forest-green)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(46,74,56,0.03)'
          e.currentTarget.style.borderColor = 'rgba(46,74,56,0.3)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--forest-green)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(46,74,56,0.25)',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </div>
        <span>Añadir Nuevo Extra al Catálogo de Alquiler</span>
      </button>
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--gray-200)',
                background: 'var(--gray-50)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'var(--sand-light)',
                    color: 'var(--forest-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-h4" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    {modalMode === 'create' ? 'Nuevo Extra de Alquiler' : `Editar: ${editingExtra?.name_es}`}
                  </h3>
                  <p className="text-xs" style={{ margin: 0, color: 'var(--gray-500)' }}>
                    Parámetros de tarificación y visualización en la web.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              {formError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    marginBottom: '16px',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre ES y EN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Nombre (Español) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Kit Snorkel"
                    value={formData.name_es}
                    onChange={e => setFormData(prev => ({ ...prev, name_es: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Nombre (Inglés)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Snorkel Kit"
                    value={formData.name_en}
                    onChange={e => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Precio y Tipo de Precio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Precio (€) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="25"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                    Tipo de Tarificación <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.price_type}
                    onChange={e => setFormData(prev => ({ ...prev, price_type: e.target.value as any }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', background: 'white' }}
                  >
                    <option value="per_rental">Por alquiler completo (tarifa fija)</option>
                    <option value="per_day">Por día de viaje (diario)</option>
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                  Descripción para el Viajero
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalle o características del extra para el checkout..."
                  value={formData.description_es}
                  onChange={e => setFormData(prev => ({ ...prev, description_es: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--gray-300)', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              {/* Selector de Icono */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '6px' }}>
                  Icono Representativo
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {AVAILABLE_ICONS.map(({ id, label, Icon }) => {
                    const isSelected = formData.icon === id

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: id }))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--forest-green)' : '1px solid var(--gray-300)',
                          background: isSelected ? 'var(--sand-light)' : 'white',
                          color: isSelected ? 'var(--forest-green)' : 'var(--gray-600)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Estado Activo con Apple Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--gray-200)',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                    Visibilidad en la Web
                  </div>
                  <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                    Si está activo, los clientes podrán añadirlo al reservar.
                  </div>
                </div>
                <AppleSwitch
                  checked={formData.is_active}
                  onChange={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  label={formData.is_active ? 'Activo' : 'Inactivo'}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="btn btn-ghost"
                  style={{ padding: '8px 16px', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-forest"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px' }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{modalMode === 'create' ? 'Crear Extra' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Eliminar Extra */}
      {extraToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !isDeleting && setExtraToDelete(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 420,
              width: '100%',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 className="text-h4" style={{ marginBottom: '8px', color: 'var(--black-matte)' }}>
              ¿Eliminar extra?
            </h3>
            <p className="text-body text-small" style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
              Estás a punto de eliminar <strong>"{extraToDelete.name_es}"</strong>. Si existen reservas previas que lo contrataron, el sistema lo desactivará automáticamente para preservar los registros contables.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setExtraToDelete(null)}
                disabled={isDeleting}
                className="btn btn-ghost"
                style={{ padding: '8px 18px', borderRadius: '8px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
