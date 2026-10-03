'use client'

import type { CamperLiveStatus } from '@/lib/admin/dashboardMetrics'
import AdminPageHeader from '../AdminPageHeader'
import AdminStatTiles from '../AdminStatTiles'
import { Eye as EyeIcon, Wrench as WrenchIcon, Navigation as NavIcon, Gauge } from 'lucide-react'

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
  Star,
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
  /** Estado de hoy por camper (en viaje / libre y próximas fechas) */
  liveStatus?: Record<string, CamperLiveStatus>
}

const PRESET_THUMBNAILS = [
  { label: 'Exterior NEO', url: '/images/campers/neo/neo-ext.png' },
  { label: 'Exterior SPACE', url: '/images/campers/space/space-ext.png' },
  { label: 'Interior NEO', url: '/images/campers/neo/neo-interior.png' },
  { label: 'Interior SPACE', url: '/images/campers/space/space-interior.png' },
]

export default function CampersClient({ initialCampers, liveStatus = {} }: Props) {
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
        showToast('success', 'Foto de portada actualizada correctamente.')
      } else {
        setFormData(prev => {
          const isDefaultThumb = !prev.thumbnail_url || prev.thumbnail_url.includes('/neo-ext') || prev.thumbnail_url.includes('/space-ext')
          return {
            ...prev,
            thumbnail_url: isDefaultThumb ? json.url : prev.thumbnail_url,
            images: [...prev.images, json.url],
          }
        })
        showToast('success', 'Foto añadida a la galería.')
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la imagen')
    } finally {
      if (target === 'thumbnail') setIsUploadingThumb(false)
      else setIsUploadingGallery(false)
      if (e.target) e.target.value = ''
    }
  }

  // Set gallery image as main thumbnail
  const handleSetAsThumbnail = (url: string) => {
    setFormData(prev => ({
      ...prev,
      thumbnail_url: url,
      images: prev.images.includes(url) ? prev.images : [url, ...prev.images],
    }))
    showToast('success', 'Foto fijada como portada principal de la tarjeta.')
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
        thumbnail_url: formData.thumbnail_url || (formData.images.length > 0 ? formData.images[0] : '/images/campers/neo/neo-ext.png'),
        images: formData.images.length > 0
          ? (formData.thumbnail_url && !formData.images.includes(formData.thumbnail_url)
              ? [formData.thumbnail_url, ...formData.images]
              : formData.images)
          : [formData.thumbnail_url || '/images/campers/neo/neo-ext.png'],
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
            backgroundColor: toastNotification.type === 'success' ? 'var(--adm-sage)' : 'var(--adm-rose)',
            color: 'var(--adm-surface)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}
        >
          {toastNotification.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: 'var(--adm-sage)', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={18} style={{ color: 'var(--adm-rose)', flexShrink: 0 }} />
          )}
          <span>{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--adm-surface)',
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
      <label htmlFor="camper-file-upload-thumb" className="sr-only">Subir foto de miniatura del vehículo</label>
      <input
        ref={thumbFileRef}
        id="camper-file-upload-thumb"
        name="camper_file_upload_thumb"
        type="file"
        accept="image/*"
        aria-label="Subir foto de miniatura del vehículo"
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e, 'thumbnail')}
      />
      <label htmlFor="camper-file-upload-gallery" className="sr-only">Añadir foto a la galería del vehículo</label>
      <input
        ref={galleryFileRef}
        id="camper-file-upload-gallery"
        name="camper_file_upload_gallery"
        type="file"
        accept="image/*"
        aria-label="Añadir foto a la galería del vehículo"
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e, 'gallery')}
      />

      <AdminPageHeader
        title="Flota"
        description="Fotos, plazas, precio y estado de cada camper."
        actions={
          <button type="button" className="adm-btn adm-btn--primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Añadir camper
          </button>
        }
      />

      <AdminStatTiles
        label="Resumen de la flota"
        tiles={[
          { key: 'pub', label: 'Publicadas', value: `${activeCount}/${totalCount}`, tone: 'sage', icon: EyeIcon, hint: 'Visibles en la web' },
          { key: 'ok', label: 'Operativas', value: availableCount, tone: maintenanceCount ? 'amber' : 'sage', icon: WrenchIcon, hint: maintenanceCount ? `${maintenanceCount} en taller` : 'Ninguna en taller' },
          { key: 'trip', label: 'En viaje hoy', value: Object.values(liveStatus).filter(l => l.state === 'on_trip').length, tone: 'gold', icon: NavIcon, hint: 'Ahora mismo' },
          {
            key: 'occ',
            label: 'Ocupación del mes',
            value: `${Object.values(liveStatus).length ? Math.round(Object.values(liveStatus).reduce((s, l) => s + l.occupancyPercent, 0) / Object.values(liveStatus).length) : 0}%`,
            tone: 'sky',
            icon: Gauge,
            hint: 'Media de la flota',
          },
        ]}
      />

      {/* Con pocos vehículos, fichas; con más de 6, buscador, filtros y tabla */}
      {campers.length > 6 && (
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={16} className="adm-search__icon" aria-hidden="true" />
            <input
              id="camper-admin-search"
              name="camper_admin_search"
              type="search"
              placeholder="Nombre o slug"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="adm-search__input"
              aria-label="Buscar camper por nombre o identificador"
            />
          </div>
          <div className="adm-tabs" role="tablist" aria-label="Filtrar flota">
            {([
              ['all', 'Todas', campers.length],
              ['active', 'Publicadas', activeCount],
              ['available', 'Operativas', availableCount],
              ['maintenance', 'En taller', maintenanceCount],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={statusFilter === id}
                className={`adm-tab ${statusFilter === id ? 'adm-tab--on' : ''}`}
                onClick={() => setStatusFilter(id)}
              >
                {label}
                <span className="adm-tab__count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fleet-grid">
        {filteredCampers.map(camper => {
          const isTogglingActive = togglingId === `${camper.id}-is_active`
          const isTogglingAvailable = togglingId === `${camper.id}-is_available`
          const live = liveStatus[camper.id]

          return (
            <article key={camper.id} className="adm-card fleet-card">
              <div className="fleet-card__media">
                {camper.thumbnail_url ? (
                  <Image src={camper.thumbnail_url} alt={camper.name} fill className="fleet-card__img" sizes="(max-width: 640px) 100vw, 420px" />
                ) : (
                  <div className="fleet-card__placeholder"><Car size={28} /></div>
                )}
                <span className={`adm-chip fleet-card__today ${live?.state === 'on_trip' ? 'adm-chip--gold' : 'adm-chip--sage'}`}>
                  {live?.state === 'on_trip' ? 'Hoy: en viaje' : 'Hoy: libre'}
                </span>
              </div>

              <div className="fleet-card__body">
                <div className="fleet-card__title-row">
                  <div>
                    <h2 className="fleet-card__name">{camper.name}</h2>
                    <span className="fleet-card__slug">/{camper.slug}</span>
                  </div>
                  <div className="fleet-card__price">
                    <strong>{formatPrice(camper.price_per_night || 120)}</strong>
                    <span>/ noche</span>
                  </div>
                </div>

                <dl className="fleet-card__facts">
                  <div><dt>Plazas</dt><dd>{camper.specs?.seats || 2}</dd></div>
                  <div><dt>Camas</dt><dd>{camper.specs?.beds || 2}</dd></div>
                  <div><dt>Fianza</dt><dd>{formatPrice(camper.deposit_amount ?? 1000)}</dd></div>
                  <div>
                    <dt>{live?.state === 'on_trip' ? 'Vuelve' : 'Próxima salida'}</dt>
                    <dd>
                      {live?.state === 'on_trip'
                        ? (live.returnsOn ? new Date(live.returnsOn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—')
                        : (live?.nextDepartureOn ? new Date(live.nextDepartureOn).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—')}
                    </dd>
                  </div>
                </dl>

                <div className="fleet-card__toggles">
                  <div className="fleet-toggle">
                    <span>
                      <strong>{camper.is_active ? 'Publicada' : 'Oculta'}</strong>
                      <small>Visible en la web</small>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={camper.is_active}
                      aria-label={camper.is_active ? 'Ocultar en la web' : 'Publicar en la web'}
                      className="adm-switch"
                      disabled={isTogglingActive}
                      onClick={() => handleToggleField(camper.id, 'is_active', camper.is_active)}
                    />
                  </div>
                  <div className="fleet-toggle">
                    <span>
                      <strong>{camper.is_available ? 'Operativa' : 'En taller'}</strong>
                      <small>Se puede reservar</small>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={camper.is_available}
                      aria-label={camper.is_available ? 'Marcar en taller' : 'Marcar operativa'}
                      className="adm-switch"
                      disabled={isTogglingAvailable}
                      onClick={() => handleToggleField(camper.id, 'is_available', camper.is_available)}
                    />
                  </div>
                </div>

                <div className="fleet-card__actions">
                  <button type="button" className="adm-btn adm-btn--sm" onClick={() => handleOpenEdit(camper)}>
                    <Edit3 size={14} /> Editar ficha
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--sm adm-btn--ghost adm-btn--danger"
                    onClick={() => setCamperToDelete(camper)}
                    aria-label={`Eliminar o archivar ${camper.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          )
        })}

        {filteredCampers.length === 0 && (
          <div className="adm-card adm-empty">
            {searchQuery ? 'Ningún camper coincide con la búsqueda.' : 'Añade tu primer camper para empezar a recibir reservas.'}
          </div>
        )}
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
                    {modalMode === 'create' ? 'Añadir camper' : `Editar: ${editingCamper?.name}`}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--adm-text-2)', margin: 0 }}>
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
                  <label htmlFor="camper-form-name" className="form-label">
                    Nombre del Vehículo <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-name"
                    name="camper_name"
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
                  <label htmlFor="camper-form-slug" className="form-label">
                    Slug / Identificador URL <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-slug"
                    name="camper_slug"
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
                  <label htmlFor="camper-form-seats" className="form-label">
                    Plazas Homologadas (Asientos) <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-seats"
                    name="camper_seats"
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
                  <label htmlFor="camper-form-beds" className="form-label">
                    Plazas para Dormir (Camas) <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-beds"
                    name="camper_beds"
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
                  <label htmlFor="camper-form-deposit" className="form-label">
                    Fianza Reembolsable (€) <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-deposit"
                    name="camper_deposit"
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
                  <label htmlFor="camper-form-price" className="form-label">
                    Tarifa Base por Noche (€) <span className="text-error">*</span>
                  </label>
                  <input
                    id="camper-form-price"
                    name="camper_price"
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
                    <label htmlFor="camper-is-active-true" className={`toggle-option ${formData.is_active ? 'selected' : ''}`}>
                      <input
                        id="camper-is-active-true"
                        type="radio"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                      />
                      <span>Publicada</span>
                    </label>
                    <label htmlFor="camper-is-active-false" className={`toggle-option ${!formData.is_active ? 'selected' : ''}`}>
                      <input
                        id="camper-is-active-false"
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
                    <label htmlFor="camper-is-available-true" className={`toggle-option ${formData.is_available ? 'selected' : ''}`}>
                      <input
                        id="camper-is-available-true"
                        type="radio"
                        name="is_available"
                        checked={formData.is_available}
                        onChange={() => setFormData(prev => ({ ...prev, is_available: true }))}
                      />
                      <span>Operativa</span>
                    </label>
                    <label htmlFor="camper-is-available-false" className={`toggle-option ${!formData.is_available ? 'selected-amber' : ''}`}>
                      <input
                        id="camper-is-available-false"
                        type="radio"
                        name="is_available"
                        checked={!formData.is_available}
                        onChange={() => setFormData(prev => ({ ...prev, is_available: false }))}
                      />
                      <span>En taller</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Fila 5: Imagen Miniatura y Subida */}
              <div className="card-sub-box">
                <div className="card-sub-box-header">
                  <label htmlFor="camper-form-thumbnail" className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Foto Principal / Miniatura
                  </label>
                  <button
                    type="button"
                    onClick={() => thumbFileRef.current?.click()}
                    disabled={isUploadingThumb}
                    className="btn btn-outline btn-sm btn-sub-upload"
                  >
                    {isUploadingThumb ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Subir desde este equipo</span>
                  </button>
                </div>

                <div className="thumb-input-row">
                  {formData.thumbnail_url && (
                    <div className="thumb-preview-square">
                      <Image
                        src={formData.thumbnail_url}
                        alt="Vista previa miniatura"
                        fill
                        sizes="70px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <input
                    id="camper-form-thumbnail"
                    name="camper_thumbnail"
                    type="text"
                    value={formData.thumbnail_url}
                    onChange={e => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    className="form-input flex-1"
                    placeholder="/images/campers/... o URL externa"
                  />
                </div>

                <div className="preset-images-row">
                  <span className="text-xs text-muted-inline">Preajustes oficiales:</span>
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

                {/* Selección rápida de portada desde las fotos de la galería */}
                {formData.images.length > 0 && (
                  <div className="gallery-quick-picker">
                    <span className="text-xs gallery-picker-title">
                      O elige como portada una de las fotos de la galería:
                    </span>
                    <div className="gallery-chips-row">
                      {formData.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSetAsThumbnail(img)}
                          className={`gallery-chip-btn ${formData.thumbnail_url === img ? 'is-active' : ''}`}
                          title={formData.thumbnail_url === img ? 'Portada actual' : 'Fijar como portada'}
                        >
                          <Image src={img} alt={`Opción ${i + 1}`} fill sizes="64px" style={{ objectFit: 'cover' }} />
                          {formData.thumbnail_url === img && (
                            <span className="gallery-chip-check">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fila 6: Galería de Fotos del Vehículo */}
              <div className="card-sub-box">
                <div className="card-sub-box-header card-sub-box-header--mb10">
                  <div>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Galería de Fotos ({formData.images.length})
                    </label>
                    <p className="text-xs text-muted-sub">
                      Fotos para el carrusel de detalle en la web. Puedes marcar cualquiera como portada.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => galleryFileRef.current?.click()}
                    disabled={isUploadingGallery}
                    className="btn btn-outline btn-sm btn-sub-upload"
                  >
                    {isUploadingGallery ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>Añadir foto desde PC</span>
                  </button>
                </div>

                {/* Grid de fotos añadidas */}
                <div className="gallery-cards-grid">
                  {formData.images.map((imgUrl, idx) => {
                    const isCover = formData.thumbnail_url === imgUrl
                    return (
                      <div
                        key={idx}
                        className={`gallery-card-thumb ${isCover ? 'is-cover' : ''}`}
                      >
                        <Image
                          src={imgUrl}
                          alt={`Foto ${idx + 1}`}
                          fill
                          sizes="100px"
                          style={{ objectFit: 'cover' }}
                        />

                        {/* Badge o botón de portada */}
                        {isCover ? (
                          <span className="gallery-cover-badge">
                            <Star size={10} fill="var(--adm-amber-soft)" color="var(--adm-amber-soft)" /> Portada
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetAsThumbnail(imgUrl)}
                            className="gallery-set-cover-btn"
                            title="Establecer como foto de portada"
                          >
                            <Star size={10} /> Portada
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(idx)}
                          className="gallery-delete-btn"
                          title="Eliminar foto de la galería"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                  {formData.images.length === 0 && (
                    <div className="gallery-empty-state">
                      No hay fotos en la galería aún.
                    </div>
                  )}
                </div>

                {/* Input para añadir URL manual */}
                <div className="gallery-url-input-row">
                  <label htmlFor="camper-gallery-url-input" className="sr-only">URL externa de imagen para añadir a la galería</label>
                  <input
                    id="camper-gallery-url-input"
                    name="camper_gallery_url"
                    type="text"
                    value={galleryUrlInput}
                    onChange={e => setGalleryUrlInput(e.target.value)}
                    placeholder="O pega una URL de imagen..."
                    className="form-input flex-1 font-small"
                    aria-label="URL externa de imagen para añadir a la galería"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="btn btn-ghost btn-sm btn-add-url"
                  >
                    + Añadir URL
                  </button>
                </div>
              </div>

              {/* Fila 7: Especificaciones Técnicas Completas */}
              <div className="card-sub-box">
                <label className="form-label font-bold mb-2">
                  Ficha Técnica y Medidas del Vehículo
                </label>

                <div className="specs-grid">
                  <div>
                    <label htmlFor="camper-spec-engine" className="text-xs spec-label">
                      Motorización
                    </label>
                    <input
                      id="camper-spec-engine"
                      name="spec_engine"
                      type="text"
                      placeholder="Ej. Diésel 2.2L Multijet 140 CV"
                      value={formData.specs.engine}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, engine: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="camper-spec-transmission" className="text-xs spec-label">
                      Transmisión
                    </label>
                    <input
                      id="camper-spec-transmission"
                      name="spec_transmission"
                      type="text"
                      placeholder="Ej. Manual 6 vel. / Automático"
                      value={formData.specs.transmission}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, transmission: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="camper-spec-length" className="text-xs spec-label">
                      Longitud (m)
                    </label>
                    <input
                      id="camper-spec-length"
                      name="spec_length_m"
                      type="number"
                      step="0.01"
                      placeholder="5.99"
                      value={formData.specs.length_m}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, length_m: parseFloat(e.target.value) || 5.99 } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="camper-spec-year" className="text-xs spec-label">
                      Año del Modelo
                    </label>
                    <input
                      id="camper-spec-year"
                      name="spec_year"
                      type="number"
                      placeholder="2025"
                      value={formData.specs.year}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, year: parseInt(e.target.value, 10) || 2025 } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="camper-spec-ac" className="text-xs spec-label">
                      Aire Acondicionado
                    </label>
                    <input
                      id="camper-spec-ac"
                      name="spec_ac"
                      type="text"
                      placeholder="Ej. Dometic CoolAir 12V"
                      value={formData.specs.ac}
                      onChange={e => setFormData(prev => ({ ...prev, specs: { ...prev.specs, ac: e.target.value } }))}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="camper-spec-water" className="text-xs spec-label">
                      Agua Limpia (Litros)
                    </label>
                    <input
                      id="camper-spec-water"
                      name="spec_fresh_water_l"
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
                <label htmlFor="camper-form-desc" className="form-label">Descripción Detallada & Equipamiento</label>
                <textarea
                  id="camper-form-desc"
                  name="camper_description"
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
                <div className="modal-header-icon" style={{ background: 'var(--adm-rose-soft)', color: 'var(--adm-rose)' }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-h4" style={{ margin: 0, color: 'var(--adm-rose)' }}>
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
                <div style={{ padding: '16px', background: 'var(--adm-sage-soft)', color: 'var(--adm-sage)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  {deleteMessage}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.95rem', color: 'var(--adm-text)', lineHeight: 1.5 }}>
                    ¿Estás seguro de que deseas eliminar a <strong>{camperToDelete.name}</strong> (/<code>{camperToDelete.slug}</code>) de la flota?
                  </p>
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--adm-amber-soft)', border: '1px solid var(--adm-amber-soft)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--adm-amber)' }}>
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
                  style={{ background: 'var(--adm-rose)', color: 'var(--adm-surface)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
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
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          color: var(--adm-text);
        }

        /* Fichas de vehículo */
        .fleet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .fleet-card {
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .fleet-card__media {
          position: relative;
          aspect-ratio: 16 / 9;
          max-width: 100%;
          background: var(--adm-surface-2);
        }
        .fleet-card__media :global(.fleet-card__img) {
          object-fit: cover;
        }
        .fleet-card__placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--adm-text-3);
        }
        .fleet-card__media :global(.fleet-card__today) {
          position: absolute;
          top: 12px;
          left: 12px;
          /* Fondo opaco: legible sobre cualquier foto */
          background: var(--adm-surface);
          box-shadow: 0 1px 4px var(--adm-shadow);
        }
        .fleet-card__body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px 20px 20px;
        }
        .fleet-card__title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .fleet-card__name {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: var(--adm-text);
        }
        .fleet-card__slug {
          font-size: 0.75rem;
          color: var(--adm-text-3);
        }
        .fleet-card__price {
          text-align: right;
          display: flex;
          flex-direction: column;
        }
        .fleet-card__price strong {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          color: var(--adm-gold-text);
          font-variant-numeric: tabular-nums;
        }
        .fleet-card__price span {
          font-size: 0.72rem;
          color: var(--adm-text-3);
        }
        .fleet-card__facts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
          padding: 12px 0;
          border-top: 1px solid var(--adm-border);
          border-bottom: 1px solid var(--adm-border);
        }
        .fleet-card__facts dt {
          font-size: 0.68rem;
          color: var(--adm-text-3);
        }
        .fleet-card__facts dd {
          margin: 2px 0 0;
          font-weight: 600;
          font-size: 0.88rem;
          color: var(--adm-text);
          font-variant-numeric: tabular-nums;
        }
        .fleet-card__toggles {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fleet-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .fleet-toggle span {
          display: flex;
          flex-direction: column;
        }
        .fleet-toggle strong {
          font-size: 0.86rem;
          color: var(--adm-text);
        }
        .fleet-toggle small {
          font-size: 0.72rem;
          color: var(--adm-text-3);
        }
        .fleet-card__actions {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        @media (max-width: 640px) {
          .fleet-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .fleet-card__facts {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
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
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          border-radius: 10px;
          font-size: 0.85rem;
          color: var(--adm-text);
        }

        .kpi-chip-label {
          color: var(--adm-text-2);
        }

        .text-forest { color: var(--adm-primary-bg); }
        .text-success { color: var(--adm-sage); }
        .text-amber { color: var(--adm-amber); }

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
          color: var(--adm-text-3);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 32px 8px 36px;
          border: 1px solid var(--adm-border-strong);
          border-radius: 8px;
          font-size: 0.88rem;
          background: var(--adm-surface);
        }

        .clear-search-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--adm-text-3);
          cursor: pointer;
        }

        .filter-pills {
          display: flex;
          gap: 8px;
        }

        .filter-pill {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--adm-text-2);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-pill.active {
          background: var(--adm-primary-bg);
          color: var(--adm-surface);
          border-color: var(--adm-primary-bg);
        }

        .camper-thumb-box {
          width: 68px;
          height: 52px;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          flex-shrink: 0;
        }

        .thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--adm-text-3);
        }

        .camper-slug-tag {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--adm-text-2);
          background: var(--adm-surface-2);
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
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
          border-color: var(--adm-sage-soft);
        }

        .badge-inactive {
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          border-color: var(--adm-border);
        }

        .badge-available {
          background: var(--adm-surface-2);
          color: var(--adm-text-2);
          border-color: var(--adm-border);
        }

        .badge-maintenance {
          background: var(--adm-amber-soft);
          color: var(--adm-amber);
          border-color: var(--adm-amber-soft);
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-edit:hover {
          background: var(--adm-surface-2);
          border-color: var(--adm-text-3);
          color: var(--adm-primary-bg);
        }

        .btn-action-delete {
          color: var(--adm-rose);
          border-color: var(--adm-rose-soft);
        }

        .btn-action-delete:hover {
          background: var(--adm-rose-soft);
          border-color: var(--adm-rose);
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
          background: var(--adm-surface);
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
          border-bottom: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .modal-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--adm-sage-soft);
          color: var(--adm-primary-bg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--adm-text-3);
          cursor: pointer;
          border-radius: 6px;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: var(--adm-text);
          background: var(--adm-surface-2);
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
          background: var(--adm-rose-soft);
          border: 1px solid var(--adm-rose-soft);
          color: var(--adm-rose);
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
          color: var(--adm-text);
        }

        .text-error {
          color: var(--adm-rose);
        }

        .form-input {
          padding: 8px 12px;
          border: 1px solid var(--adm-border-strong);
          border-radius: 8px;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.15s;
          background: var(--adm-surface);
        }

        .form-input:focus {
          border-color: var(--adm-primary-bg);
          box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
        }

        .toggle-group-card {
          border: 1px solid var(--adm-border);
          border-radius: 10px;
          padding: 12px;
          background: var(--adm-surface-2);
        }

        .toggle-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--adm-text);
          display: block;
        }

        .toggle-desc {
          font-size: 0.72rem;
          color: var(--adm-text-2);
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
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toggle-option input {
          display: none;
        }

        .toggle-option.selected {
          background: var(--adm-primary-bg);
          color: var(--adm-surface);
          border-color: var(--adm-primary-bg);
        }

        .toggle-option.selected-amber {
          background: var(--adm-amber);
          color: var(--adm-surface);
          border-color: var(--adm-amber);
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
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          cursor: pointer;
        }

        .preset-btn.active {
          border-color: var(--adm-primary-bg);
          color: var(--adm-primary-bg);
          font-weight: 600;
          background: var(--adm-sage-soft);
        }

        .card-sub-box {
          background: var(--adm-surface-2);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--adm-border);
          margin-bottom: 16px;
        }

        .card-sub-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .card-sub-box-header--mb10 {
          margin-bottom: 10px;
        }

        .btn-sub-upload {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          background: var(--adm-surface);
        }

        .thumb-input-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .thumb-preview-square {
          position: relative;
          width: 70px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--adm-border-strong);
          flex-shrink: 0;
        }

        .text-muted-inline {
          color: var(--adm-text-2);
          margin-right: 4px;
        }

        .text-muted-sub {
          margin: 2px 0 0;
          color: var(--adm-text-2);
        }

        .gallery-quick-picker {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed var(--adm-border-strong);
        }

        .gallery-picker-title {
          color: var(--adm-text);
          font-weight: 600;
          display: block;
          margin-bottom: 6px;
        }

        .gallery-chips-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .gallery-chip-btn {
          position: relative;
          width: 64px;
          height: 44px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--adm-border-strong);
          padding: 0;
          cursor: pointer;
        }

        .gallery-chip-btn.is-active {
          border: 2px solid var(--adm-primary-bg);
        }

        .gallery-chip-check {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: var(--adm-primary-bg);
          color: var(--adm-surface);
          border-radius: 50%;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: bold;
        }

        .gallery-cards-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .gallery-card-thumb {
          position: relative;
          width: 100px;
          height: 75px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-border);
        }

        .gallery-card-thumb.is-cover {
          border: 2px solid var(--adm-primary-bg);
        }

        .gallery-cover-badge {
          position: absolute;
          top: 4px;
          left: 4px;
          background: var(--adm-primary-bg);
          color: var(--adm-surface);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }

        .gallery-set-cover-btn {
          position: absolute;
          top: 4px;
          left: 4px;
          background: rgba(255, 255, 255, 0.92);
          color: var(--adm-text);
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 5px;
          border-radius: 4px;
          border: 1px solid var(--adm-border-strong);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .gallery-delete-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(220, 38, 38, 0.9);
          color: var(--adm-surface);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .gallery-empty-state {
          padding: 10px;
          font-size: 0.8rem;
          color: var(--adm-text-2);
        }

        .gallery-url-input-row {
          display: flex;
          gap: 8px;
        }

        .btn-add-url {
          border: 1px solid var(--adm-border-strong);
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .specs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .spec-label {
          color: var(--adm-text-2);
          display: block;
          margin-bottom: 3px;
        }

        .font-small {
          font-size: 0.82rem;
        }

        .font-bold {
          font-weight: 700;
        }

        .mb-2 {
          margin-bottom: 8px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 14px;
          border-top: 1px solid var(--adm-border);
          position: sticky;
          bottom: 0;
          background: var(--adm-surface);
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
