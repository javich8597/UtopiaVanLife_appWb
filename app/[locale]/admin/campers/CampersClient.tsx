'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  Users,
  Search,
  Car,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Settings,
  Fuel,
  Ruler,
  Calendar,
  Droplets,
  Wind,
} from 'lucide-react'
import { formatPrice } from '@/lib/pricing/engine'
import { useRouter } from 'next/navigation'

export interface CamperItem {
  id: string
  name: string
  slug: string
  thumbnail_url?: string
  images?: string[]
  description_es?: string
  specs?: {
    seats?: number
    beds?: number
    length_m?: number
    width_m?: number
    height_m?: number
    year?: number
    engine?: string
    transmission?: string
    ac?: string
    fresh_water_l?: number
    [key: string]: any
  }
  deposit_amount?: number
  price_per_night?: number
  is_active: boolean
  is_available: boolean
  [key: string]: any
}

interface Props {
  initialCampers: CamperItem[]
}

const PRESET_THUMBNAILS = [
  { label: 'Exterior NEO', url: '/images/campers/neo/neo-ext.png' },
  { label: 'Exterior SPACE', url: '/images/campers/space/space-ext.png' },
  { label: 'Interior NEO', url: '/images/campers/neo/neo-interior.png' },
  { label: 'Interior SPACE', url: '/images/campers/space/space-interior.png' },
]

export default function CampersClient({ initialCampers }: Props) {
  const router = useRouter()
  const [campers, setCampers] = useState<CamperItem[]>(initialCampers || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'available' | 'maintenance'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingCamper, setEditingCamper] = useState<CamperItem | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    seats: 3,
    beds: 2,
    deposit_amount: 1000,
    price_per_night: 120,
    is_active: true,
    is_available: true,
    thumbnail_url: '/images/campers/neo/neo-ext.png',
    images: ['/images/campers/neo/neo-ext.png'] as string[],
    description_es: '',
    specs: {
      length_m: 5.99,
      width_m: 2.05,
      height_m: 2.58,
      year: 2025,
      engine: 'Diésel 2.2L Multijet 140 CV',
      transmission: 'Manual 6 velocidades',
      ac: 'Dometic CoolAir 12V',
      fresh_water_l: 113,
    },
  })
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingThumb, setIsUploadingThumb] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)

  // File Inputs
  const thumbFileRef = useRef<HTMLInputElement>(null)
  const galleryFileRef = useRef<HTMLInputElement>(null)

  // Delete Modal State
  const [camperToDelete, setCamperToDelete] = useState<CamperItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)

  // Quick toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Floating feedback notification state
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastNotification({ type, message })
    setTimeout(() => {
      setToastNotification(null)
    }, 4000)
  }

  // Filtered campers
  const filteredCampers = campers.filter(camper => {
    const matchesSearch =
      camper.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camper.slug.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'active') return camper.is_active
    if (statusFilter === 'available') return camper.is_available
    if (statusFilter === 'maintenance') return !camper.is_available

    return true
  })

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create')
    setEditingCamper(null)
    setFormData({
      name: '',
      slug: '',
      seats: 3,
      beds: 2,
      deposit_amount: 1000,
      price_per_night: 120,
      is_active: true,
      is_available: true,
      thumbnail_url: '/images/campers/neo/neo-ext.png',
      images: ['/images/campers/neo/neo-ext.png'],
      description_es: '',
      specs: {
        length_m: 5.99,
        width_m: 2.05,
        height_m: 2.58,
        year: 2025,
        engine: 'Diésel 2.2L Multijet 140 CV',
        transmission: 'Manual 6 velocidades',
        ac: 'Dometic CoolAir 12V',
        fresh_water_l: 113,
      },
    })
    setGalleryUrlInput('')
    setFormError('')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (camper: CamperItem) => {
    setModalMode('edit')
    setEditingCamper(camper)
    const currentImgs = Array.isArray(camper.images) && camper.images.length > 0
      ? camper.images
      : (camper.thumbnail_url ? [camper.thumbnail_url] : ['/images/campers/neo/neo-ext.png'])

    setFormData({
      name: camper.name || '',
      slug: camper.slug || '',
      seats: camper.specs?.seats || 2,
      beds: camper.specs?.beds || 2,
      deposit_amount: camper.deposit_amount ?? 1000,
      price_per_night: camper.price_per_night ?? 120,
      is_active: camper.is_active ?? true,
      is_available: camper.is_available ?? true,
      thumbnail_url: camper.thumbnail_url || '/images/campers/neo/neo-ext.png',
      images: currentImgs,
      description_es: camper.description_es || '',
      specs: {
        length_m: camper.specs?.length_m ?? 5.99,
        width_m: camper.specs?.width_m ?? 2.05,
        height_m: camper.specs?.height_m ?? 2.58,
        year: camper.specs?.year ?? 2025,
        engine: camper.specs?.engine ?? 'Diésel 2.2L Multijet 140 CV',
        transmission: camper.specs?.transmission ?? 'Manual 6 velocidades',
        ac: camper.specs?.ac ?? 'Dometic CoolAir 12V',
        fresh_water_l: camper.specs?.fresh_water_l ?? 113,
      },
    })
    setGalleryUrlInput('')
    setFormError('')
    setIsModalOpen(true)
  }

  // Upload image to API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'gallery') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (target === 'thumbnail') setIsUploadingThumb(true)
    else setIsUploadingGallery(true)

    setFormError('')

    try {
      const data = new FormData()
      data.append('file', file)

      const res = await fetch('/api/admin/campers/upload-image', {
        method: 'POST',
        body: data,
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al subir la imagen')
      }

      if (target === 'thumbnail') {
        setFormData(prev => ({
          ...prev,
          thumbnail_url: json.url,
          images: prev.images.includes(json.url) ? prev.images : [json.url, ...prev.images],
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, json.url],
        }))
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la imagen')
    } finally {
      if (target === 'thumbnail') setIsUploadingThumb(false)
      else setIsUploadingGallery(false)
      if (e.target) e.target.value = ''
    }
  }

  // Add URL to gallery
  const handleAddGalleryUrl = () => {
    const url = galleryUrlInput.trim()
    if (!url) return

    if (!formData.images.includes(url)) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url],
      }))
    }
    setGalleryUrlInput('')
  }

  // Remove URL from gallery
  const handleRemoveGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  // Quick status toggle
  const handleToggleField = async (camperId: string, field: 'is_active' | 'is_available', currentValue: boolean) => {
    setTogglingId(`${camperId}-${field}`)
    const newValue = !currentValue

    // Optimistic
    setCampers(prev =>
      prev.map(c => (c.id === camperId ? { ...c, [field]: newValue } : c))
    )

    try {
      const res = await fetch(`/api/admin/campers/${camperId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al actualizar estado')
      }

      const actionLabel = field === 'is_active'
        ? (newValue ? 'publicada en la web' : 'ocultada de la web')
        : (newValue ? 'habilitada como disponible' : 'marcada en mantenimiento')
      showToast('success', `Estado actualizado: Camper ${actionLabel}.`)
      router.refresh()
    } catch (err: any) {
      console.error('Failed to toggle status:', err)
      // Rollback
      setCampers(prev =>
        prev.map(c => (c.id === camperId ? { ...c, [field]: currentValue } : c))
      )
      showToast('error', err.message || 'Error al actualizar el estado de la camper')
    } finally {
      setTogglingId(null)
    }
  }

  // Save Modal Form (Create or Edit)
  const handleSaveCamper = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('El nombre de la camper es obligatorio.')
      return
    }

    const finalSlug = formData.slug.trim()
      ? formData.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : formData.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    setIsSaving(true)

    try {
      const url = modalMode === 'create' ? '/api/admin/campers' : `/api/admin/campers/${editingCamper?.id}`
      const method = modalMode === 'create' ? 'POST' : 'PATCH'

      const payload = {
        name: formData.name.trim(),
        slug: finalSlug,
        seats: Number(formData.seats),
        beds: Number(formData.beds),
        deposit_amount: Number(formData.deposit_amount),
        price_per_night: Number(formData.price_per_night),
        is_active: formData.is_active,
        is_available: formData.is_available,
        thumbnail_url: formData.thumbnail_url,
        images: formData.images.length > 0 ? formData.images : [formData.thumbnail_url],
        description_es: formData.description_es,
        specs: {
          ...formData.specs,
          seats: Number(formData.seats),
          beds: Number(formData.beds),
        },
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Error al guardar la camper')
      }

      if (modalMode === 'create') {
        setCampers(prev => [result.camper, ...prev])
        showToast('success', `Camper "${result.camper.name}" creada y publicada en la flota correctamente.`)
      } else {
        setCampers(prev =>
          prev.map(c => (c.id === editingCamper?.id ? { ...c, ...result.camper } : c))
        )
        showToast('success', `Camper "${result.camper.name}" actualizada correctamente.`)
      }

      setIsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      setFormError(err.message || 'Ocurrió un error inesperado al guardar la camper')
      showToast('error', err.message || 'Error al guardar la camper')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete or Archive Camper
  const handleConfirmDelete = async () => {
    if (!camperToDelete) return

    setIsDeleting(true)
    setDeleteMessage(null)

    try {
      const res = await fetch(`/api/admin/campers/${camperToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar la camper')
      }

      if (data.archived) {
        // Was archived instead of deleted
        setCampers(prev =>
          prev.map(c =>
            c.id === camperToDelete.id
              ? { ...c, is_active: false, is_available: false }
              : c
          )
        )
        showToast('success', `Camper "${camperToDelete.name}" archivada (desactivada).`)
      } else {
        // Hard deleted
        setCampers(prev => prev.filter(c => c.id !== camperToDelete.id))
        showToast('success', `Camper "${camperToDelete.name}" eliminada de la flota.`)
      }

      setDeleteMessage(data.message)
      setTimeout(() => {
        setCamperToDelete(null)
        setDeleteMessage(null)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      showToast('error', err.message || 'Error al eliminar')
      setIsDeleting(false)
    }
  }

  // Quick stats
  const totalCount = campers.length
  const activeCount = campers.filter(c => c.is_active).length
  const availableCount = campers.filter(c => c.is_available).length
  const maintenanceCount = campers.filter(c => !c.is_available).length

  return (
    <div className="campers-admin-container">
      {/* Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 22px',
            borderRadius: 12,
            backgroundColor: toastNotification.type === 'success' ? '#064e3b' : '#7f1d1d',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}
        >
          {toastNotification.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
          )}
          <span>{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '2px 4px',
              marginLeft: 8,
              opacity: 0.8,
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {/* Hidden File Inputs */}
      <input
        ref={thumbFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e, 'thumbnail')}
      />
      <input
        ref={galleryFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e, 'gallery')}
      />

      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="text-h2" style={{ marginBottom: 'var(--space-1)' }}>Flota (Campers)</h1>
          <p className="text-body" style={{ color: 'var(--gray-600)' }}>
            Gestiona los vehículos disponibles, especificaciones técnicas, precios base, fotos y operatividad.
          </p>
        </div>

        <button
          className="btn btn-forest"
          onClick={handleOpenCreate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}
        >
          <Plus size={18} /> Nueva Camper
        </button>
      </div>

      {/* KPI Chips Bar */}
      <div className="kpi-chips-grid">
        <div className="kpi-chip">
          <Car size={16} className="kpi-chip-icon text-forest" />
          <span className="kpi-chip-label">Total Flota:</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="kpi-chip">
          <Eye size={16} className="kpi-chip-icon text-success" />
          <span className="kpi-chip-label">Publicadas:</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="kpi-chip">
          <CheckCircle2 size={16} className="kpi-chip-icon text-forest" />
          <span className="kpi-chip-label">Disponibles:</span>
          <strong>{availableCount}</strong>
        </div>
        <div className="kpi-chip">
          <Wrench size={16} className="kpi-chip-icon text-amber" />
          <span className="kpi-chip-label">En Mantenimiento:</span>
          <strong style={{ color: maintenanceCount > 0 ? '#b45309' : 'inherit' }}>{maintenanceCount}</strong>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search-btn">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-pills">
          <button
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todas ({campers.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Publicadas ({activeCount})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            Disponibles ({availableCount})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'maintenance' ? 'active' : ''}`}
            onClick={() => setStatusFilter('maintenance')}
          >
            Mantenimiento ({maintenanceCount})
          </button>
        </div>
      </div>

      {/* Campers Table */}
      <div className="table-container card">
        <table className="admin-table" style={{ minWidth: 740 }}>
          <thead>
            <tr>
              <th>Vehículo</th>
              <th>Plazas / Camas</th>
              <th>Tarifa Base & Fianza</th>
              <th>Publicación & Operatividad</th>
              <th style={{ textAlign: 'right', paddingRight: '20px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampers.map(camper => {
              const isTogglingActive = togglingId === `${camper.id}-is_active`
              const isTogglingAvailable = togglingId === `${camper.id}-is_available`

              return (
                <tr key={camper.id}>
                  {/* Vehículo: Miniatura, Nombre y Slug */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className="camper-thumb-box">
                        {camper.thumbnail_url ? (
                          <Image
                            src={camper.thumbnail_url}
                            alt={camper.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="80px"
                          />
                        ) : (
                          <div className="thumb-placeholder">
                            <Car size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--black-matte)' }}>
                          {camper.name}
                        </div>
                        <span className="camper-slug-tag">/{camper.slug}</span>
                      </div>
                    </div>
                  </td>

                  {/* Plazas y Camas */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                        <Users size={15} style={{ color: 'var(--forest-green)' }} />
                        <span><strong>{camper.specs?.seats || 2}</strong> plazas</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                        <span><strong>{camper.specs?.beds || 2}</strong> camas</span>
                      </div>
                    </div>
                  </td>

                  {/* Tarifa Base y Fianza */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--forest-green)', fontSize: '0.95rem' }}>
                        {formatPrice(camper.price_per_night || 120)}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--gray-500)' }}> / noche</span>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
                        Fianza: {formatPrice(camper.deposit_amount ?? 1000)}
                      </span>
                    </div>
                  </td>

                  {/* Estado (Publicada / Oculta) & (Disponible / Mantenimiento) */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleField(camper.id, 'is_active', camper.is_active)}
                        disabled={isTogglingActive}
                        className={`status-badge-btn ${camper.is_active ? 'badge-active' : 'badge-inactive'}`}
                        title={camper.is_active ? 'Haz clic para ocultar en la web' : 'Haz clic para publicar en la web'}
                      >
                        {isTogglingActive ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : camper.is_active ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        <span>{camper.is_active ? 'Publicada' : 'Oculta'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleField(camper.id, 'is_available', camper.is_available)}
                        disabled={isTogglingAvailable}
                        className={`status-badge-btn ${camper.is_available ? 'badge-available' : 'badge-maintenance'}`}
                        title={camper.is_available ? 'Haz clic para marcar en mantenimiento' : 'Haz clic para habilitar disponibilidad'}
                      >
                        {isTogglingAvailable ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : camper.is_available ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <Wrench size={13} />
                        )}
                        <span>{camper.is_available ? 'Disponible' : 'Mantenimiento'}</span>
                      </button>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-action btn-action-edit"
                        onClick={() => handleOpenEdit(camper)}
                        title="Editar especificaciones y fotos"
                      >
                        <Edit3 size={15} />
                        <span>Editar</span>
                      </button>
                      <button
                        className="btn-action btn-action-delete"
                        onClick={() => setCamperToDelete(camper)}
                        title="Eliminar o archivar camper"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredCampers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--gray-500)' }}>
                  <Car size={36} style={{ color: 'var(--gray-400)', margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>No se encontraron campers</p>
                  <p className="text-xs" style={{ color: 'var(--gray-500)' }}>
                    {searchQuery ? 'Prueba con otro término de búsqueda' : 'Haz clic en "Nueva Camper" para añadir un vehículo.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Nueva / Editar Camper */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-header-icon">
                  <Car size={20} />
                </div>
                <div>
                  <h3 className="text-h4" style={{ margin: 0 }}>
                    {modalMode === 'create' ? 'Nueva Camper' : `Editar: ${editingCamper?.name}`}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--gray-500)', margin: 0 }}>
                    Configuración técnica, fotos, tarifas y disponibilidad del vehículo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="modal-close-btn"
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCamper} className="modal-body">
              {formError && (
                <div className="modal-alert-error">
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fila 1: Nombre y Slug */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Nombre del Vehículo <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. NEO, SPACE, HORIZON"
                    value={formData.name}
                    onChange={e => {
                      const newName = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        slug: modalMode === 'create' && !prev.slug.trim()
                          ? newName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                          : prev.slug,
                      }))
                    }}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Slug / Identificador URL <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. horizon"
                    value={formData.slug}
                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Fila 2: Plazas y Camas */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Plazas Homologadas (Asientos) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9"
                    required
                    value={formData.seats}
                    onChange={e => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value, 10) || 1 }))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Plazas para Dormir (Camas) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={formData.beds}
                    onChange={e => setFormData(prev => ({ ...prev, beds: parseInt(e.target.value, 10) || 1 }))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Fila 3: Fianza y Precio Base */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Fianza Reembolsable (€) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formData.deposit_amount}
                    onChange={e => setFormData(prev => ({ ...prev, deposit_amount: parseFloat(e.target.value) || 0 }))}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Tarifa Base por Noche (€) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={formData.price_per_night}
                    onChange={e => setFormData(prev => ({ ...prev, price_per_night: parseFloat(e.target.value) || 0 }))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Fila 4: Estados de Publicación y Operatividad */}
              <div className="form-grid-2">
                <div className="toggle-group-card">
                  <span className="toggle-title">Publicación en Web</span>
                  <p className="toggle-desc">Determina si los usuarios pueden ver y reservar este modelo.</p>
                  <div className="toggle-options">
                    <label className={`toggle-option ${formData.is_active ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                      />
                      <span>Publicada</span>
                    </label>
                    <label className={`toggle-option ${!formData.is_active ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="is_active"
                        checked={!formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                      />
                      <span>Oculta</span>
                    </label>
                  </div>
                </div>

                <div className="toggle-group-card">
                  <span className="toggle-title">Estado Operativo</span>
                  <p className="toggle-desc">Define si la furgoneta está operativa o en taller / revisión.</p>
                  <div className="toggle-options">
                    <label className={`toggle-option ${formData.is_available ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="is_available"
                        checked={formData.is_available}
                        onChange={() => setFormData(prev => ({ ...prev, is_available: true }))}
                      />
                      <span>Disponible</span>
                    </label>
                    <label className={`toggle-option ${!formData.is_available ? 'selected-amber' : ''}`}>
                      <input
                        type="radio"
                        name="is_available"
                        checked={!formData.is_available}
                        onChange={() => setFormData(prev => ({ ...prev, is_available: false }))}
                      />
                      <span>Mantenimiento</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Fila 5: Imagen Miniatura y Subida */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Foto Principal / Miniatura
                  </label>
                  <button
                    type="button"
                    onClick={() => thumbFileRef.current?.click()}
                    disabled={isUploadingThumb}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', background: 'white' }}
                  >
                    {isUploadingThumb ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Subir desde este equipo</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {formData.thumbnail_url && (
                    <div style={{ position: 'relative', width: '70px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                      <Image
                        src={formData.thumbnail_url}
                        alt="Vista previa miniatura"
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={formData.thumbnail_url}
                    onChange={e => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="form-input"
                    placeholder="/images/campers/... o URL externa"
                    style={{ flex: 1 }}
                  />
                </div>

                <div className="preset-images-row" style={{ marginTop: '10px' }}>
                  <span className="text-xs" style={{ color: 'var(--gray-500)', marginRight: '4px' }}>Preajustes oficiales:</span>
                  {PRESET_THUMBNAILS.map(preset => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: preset.url }))}
                      className={`preset-btn ${formData.thumbnail_url === preset.url ? 'active' : ''}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 6: Galería de Fotos del Vehículo */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Galería de Fotos ({formData.images.length})
                    </label>
                    <p className="text-xs" style={{ margin: '2px 0 0', color: 'var(--gray-500)' }}>
                      Fotos para el carrusel de detalle en la web.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => galleryFileRef.current?.click()}
                    disabled={isUploadingGallery}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', background: 'white' }}
                  >
                    {isUploadingGallery ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Añadir foto desde PC</span>
                  </button>
                </div>

                {/* Grid de fotos añadidas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  {formData.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '80px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#e2e8f0',
                      }}
                    >
                      <Image
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(220, 38, 38, 0.9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                        title="Eliminar foto"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.images.length === 0 && (
                    <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      No hay fotos en la galería aún.
                    </div>
                  )}
                </div>

                {/* Input para añadir URL manual */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={galleryUrlInput}
                    onChange={e => setGalleryUrlInput(e.target.value)}
                    placeholder="O pega una URL de imagen..."
                    className="form-input"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid var(--gray-300)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    + Añadir URL
                  </button>
                </div>
              </div>

              {/* Fila 7: Especificaciones Técnicas Completas */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px' }}>
                  Ficha Técnica y Medidas del Vehículo
                </label>

                <div className="form-grid-2" style={{ gap: '12px' }}>
                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Motorización
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Diésel 2.2L Multijet 140 CV"
                      value={formData.specs.engine}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, engine: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Transmisión
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Manual 6 vel. / Automático"
                      value={formData.specs.transmission}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, transmission: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Longitud (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="5.99"
                      value={formData.specs.length_m}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, length_m: parseFloat(e.target.value) || 5.99 } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Año del Modelo
                    </label>
                    <input
                      type="number"
                      placeholder="2025"
                      value={formData.specs.year}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, year: parseInt(e.target.value, 10) || 2025 } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Aire Acondicionado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Dometic CoolAir 12V"
                      value={formData.specs.ac}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, ac: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs" style={{ color: 'var(--gray-600)', display: 'block', marginBottom: '3px' }}>
                      Agua Limpia (Litros)
                    </label>
                    <input
                      type="number"
                      placeholder="113"
                      value={formData.specs.fresh_water_l}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, fresh_water_l: parseInt(e.target.value, 10) || 100 } }))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Fila 8: Descripción */}
              <div className="form-group">
                <label className="form-label">Descripción Detallada & Equipamiento</label>
                <textarea
                  rows={3}
                  value={formData.description_es}
                  onChange={e => setFormData(prev => ({ ...prev, description_es: e.target.value }))}
                  className="form-input"
                  placeholder="Detalles del equipamiento, habitáculo, panel solar, cocina, etc."
                />
              </div>

              {/* Footer Modal */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-forest"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {modalMode === 'create' ? 'Crear Camper' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE / ARCHIVE */}
      {camperToDelete && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setCamperToDelete(null)}>
          <div className="modal-card modal-card-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="modal-header-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-h4" style={{ margin: 0, color: '#991b1b' }}>
                  Eliminar o Archivar Camper
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setCamperToDelete(null)}
                className="modal-close-btn"
                disabled={isDeleting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {deleteMessage ? (
                <div style={{ padding: '16px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '0.9rem' }}>
                  {deleteMessage}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
                    ¿Estás seguro de que deseas eliminar a <strong>{camperToDelete.name}</strong> (/<code>{camperToDelete.slug}</code>) de la flota?
                  </p>
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '0.85rem', color: '#92400e' }}>
                    <strong>Nota de seguridad:</strong> Si el vehículo tiene reservas registradas o historiales de alquiler, el sistema lo <em>archivará y desactivará</em> automáticamente en lugar de borrarlo, protegiendo los datos contables.
                  </div>
                </>
              )}

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCamperToDelete(null)}
                  disabled={isDeleting}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="btn"
                  style={{ background: '#dc2626', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Confirmar Eliminación / Archivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX Scoped Styles */}
      <style jsx>{`
        .campers-admin-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 16px;
        }

        .kpi-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .kpi-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: 10px;
          font-size: 0.85rem;
          color: var(--gray-700);
        }

        .kpi-chip-label {
          color: var(--gray-500);
        }

        .text-forest { color: var(--forest-green); }
        .text-success { color: #16a34a; }
        .text-amber { color: #d97706; }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .search-input-wrap {
          position: relative;
          width: 100%;
          max-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 32px 8px 36px;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          font-size: 0.88rem;
          background: white;
        }

        .clear-search-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
        }

        .filter-pills {
          display: flex;
          gap: 8px;
        }

        .filter-pill {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid var(--gray-300);
          background: white;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--gray-600);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-pill.active {
          background: var(--forest-green);
          color: white;
          border-color: var(--forest-green);
        }

        .camper-thumb-box {
          width: 68px;
          height: 52px;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: var(--gray-100);
          border: 1px solid var(--gray-200);
          flex-shrink: 0;
        }

        .thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
        }

        .camper-slug-tag {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--gray-500);
          background: var(--gray-100);
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 2px;
        }

        .status-badge-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          width: fit-content;
        }

        .badge-active {
          background: #dcfce7;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .badge-inactive {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        }

        .badge-available {
          background: #e0f2fe;
          color: #0369a1;
          border-color: #bae6fd;
        }

        .badge-maintenance {
          background: #fef3c7;
          color: #b45309;
          border-color: #fde68a;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          border: 1px solid var(--gray-300);
          background: white;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-edit:hover {
          background: var(--gray-50);
          border-color: var(--gray-400);
          color: var(--forest-green);
        }

        .btn-action-delete {
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-action-delete:hover {
          background: #fee2e2;
          border-color: #f87171;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-card-sm {
          max-width: 460px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--gray-200);
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .modal-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #e8f5e9;
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: 6px;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: var(--gray-700);
          background: var(--gray-100);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 540px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--gray-700);
        }

        .text-error {
          color: #dc2626;
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.15s;
          background: white;
        }

        .form-input:focus {
          border-color: var(--forest-green);
          box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
        }

        .toggle-group-card {
          border: 1px solid var(--gray-200);
          border-radius: 10px;
          padding: 12px;
          background: #fafafa;
        }

        .toggle-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--gray-800);
          display: block;
        }

        .toggle-desc {
          font-size: 0.72rem;
          color: var(--gray-500);
          margin: 2px 0 8px;
        }

        .toggle-options {
          display: flex;
          gap: 8px;
        }

        .toggle-option {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--gray-300);
          background: white;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toggle-option input {
          display: none;
        }

        .toggle-option.selected {
          background: var(--forest-green);
          color: white;
          border-color: var(--forest-green);
        }

        .toggle-option.selected-amber {
          background: #d97706;
          color: white;
          border-color: #d97706;
        }

        .preset-images-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .preset-btn {
          padding: 3px 8px;
          font-size: 0.72rem;
          border-radius: 4px;
          border: 1px solid var(--gray-200);
          background: white;
          color: var(--gray-600);
          cursor: pointer;
        }

        .preset-btn.active {
          border-color: var(--forest-green);
          color: var(--forest-green);
          font-weight: 600;
          background: #e8f5e9;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid var(--gray-200);
          position: sticky;
          bottom: 0;
          background: white;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .campers-header-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .campers-header-row button {
            width: 100%;
            justify-content: center;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .search-filters-bar {
            flex-direction: column;
            gap: 10px;
          }
          .filter-pills {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
            width: 100%;
          }
          .modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          .modal-card {
            border-radius: 20px 20px 0 0;
            max-height: 94vh;
            width: 100%;
            max-width: 100%;
          }
          .modal-body {
            padding: 16px;
          }
          .modal-footer {
            flex-direction: column-reverse;
            gap: 8px;
          }
          .modal-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
