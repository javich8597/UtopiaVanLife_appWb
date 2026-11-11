'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Car,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Upload,
  Plus,
  Trash2,
  Star,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Wrench,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import {
  CamperCardPill,
  CamperCardSummarySpec,
  CamperFeatureItem,
  CamperGalleryItem,
  formatDepositEuros,
  resolveCamperContent,
} from '@/lib/campers/camperCatalog'

export interface CamperEditorProps {
  mode: 'create' | 'edit'
  camper: any | null
  onClose: () => void
  onSaved: (savedCamper: any, mode: 'create' | 'edit') => void
  onToast: (type: 'success' | 'error', message: string) => void
}

type EditorTabId =
  | 'summary'
  | 'photos'
  | 'description'
  | 'equipment'
  | 'technical'
  | 'rental'

const EDITOR_TABS: Array<{ id: EditorTabId; label: string; icon: any }> = [
  { id: 'summary', label: 'Tarjeta resumen', icon: CreditCard },
  { id: 'photos', label: 'Fotos', icon: ImageIcon },
  { id: 'description', label: 'Descripción', icon: FileText },
  { id: 'equipment', label: 'Características/Equipamiento', icon: Sparkles },
  { id: 'technical', label: 'Características Técnicas', icon: Wrench },
  { id: 'rental', label: 'Alquiler', icon: ShieldCheck },
]

const PRESET_THUMBNAILS = [
  { label: 'Exterior NEO', url: '/images/campers/neo/neo-ext.png' },
  { label: 'Exterior SPACE', url: '/images/campers/space/space-ext.png' },
  { label: 'Interior NEO', url: '/images/campers/neo/neo-interior.png' },
  { label: 'Interior SPACE', url: '/images/campers/space/space-interior.png' },
]

const CARD_SPEC_ICON_OPTIONS = [
  { value: 'bus', label: 'Plazas viaje' },
  { value: 'moon', label: 'Plazas dormir' },
  { value: 'utensils', label: 'Cocina' },
  { value: 'shower', label: 'Baño / Ducha' },
  { value: 'ruler', label: 'Longitud' },
  { value: 'bed', label: 'Camas' },
  { value: 'battery', label: 'Batería / Autonomía' },
  { value: 'zap', label: 'Eléctrico' },
  { value: 'snowflake', label: 'Aire acondicionado' },
  { value: 'sun', label: 'Solar / Claraboya' },
  { value: 'wind', label: 'Calefacción' },
  { value: 'shield', label: 'Seguridad' },
]

const FEATURE_ICON_OPTIONS = [
  { value: 'users', label: 'Personas / Plazas' },
  { value: 'bed', label: 'Cama' },
  { value: 'utensils', label: 'Cocina' },
  { value: 'droplets', label: 'Agua / Baño' },
  { value: 'snowflake', label: 'Aire acondicionado' },
  { value: 'wind', label: 'Calefacción' },
  { value: 'sun', label: 'Luz / Solar' },
  { value: 'zap', label: 'Electricidad' },
  { value: 'battery', label: 'Baterías' },
  { value: 'gauge', label: 'Motor / Consumo' },
  { value: 'ruler', label: 'Dimensiones' },
  { value: 'thermometer', label: 'Gas / Temperatura' },
  { value: 'shield', label: 'Seguridad' },
  { value: 'wifi', label: 'Conectividad' },
  { value: 'tv', label: 'Entretenimiento' },
  { value: 'plug', label: 'Tomas / Inversor' },
]

type UploadTarget = 'thumbnail' | 'gallery' | 'floorplan_day' | 'floorplan_night' | 'inline_desc'

function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const nextIdx = index + delta
  if (nextIdx < 0 || nextIdx >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(nextIdx, 0, item)
  return copy
}

export default function CamperEditorModal({
  mode,
  camper,
  onClose,
  onSaved,
  onToast,
}: CamperEditorProps) {
  const initialResolved = resolveCamperContent(
    camper || {
      name: '',
      slug: '',
      specs: {
        seats: 2,
        beds: 2,
        length_m: 5.99,
        width_m: 2.05,
        height_m: 2.58,
        year: 2025,
        base_vehicle: 'Fiat Ducato L3H2',
        engine: 'Diésel 2.2L Multijet 140 CV',
        transmission: 'Manual 6 velocidades',
        ac: 'Dometic CoolAir 12V',
        fresh_water_l: 113,
        grey_water_l: 90,
        solar_w: 400,
        battery_ah: 540,
        storage_liters: 0,
      },
      base_price_per_night: 120,
      is_active: true,
      is_available: true,
    }
  )

  const initialSpecs = (camper?.specs && typeof camper.specs === 'object') ? camper.specs : {}

  const [activeTab, setActiveTab] = useState<EditorTabId>('summary')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null)
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadTargetRef = useRef<UploadTarget>('gallery')

  // Estado unificado de las 6 pestañas
  const [name, setName] = useState<string>(camper?.name || '')
  const [slug, setSlug] = useState<string>(camper?.slug || '')
  const [isActive, setIsActive] = useState<boolean>(camper?.is_active ?? true)
  const [isAvailable, setIsAvailable] = useState<boolean>(camper?.is_available ?? true)

  // Pestaña 1: Tarjeta resumen
  const [tagline, setTagline] = useState<string>(initialResolved.card.tagline)
  const [seats, setSeats] = useState<number>(Number(initialSpecs.seats) || (camper?.slug === 'space' ? 2 : 3))
  const [beds, setBeds] = useState<number>(Number(initialSpecs.beds) || (camper?.slug === 'space' ? 2 : 3))
  const [summarySpecs, setSummarySpecs] = useState<CamperCardSummarySpec[]>(initialResolved.card.summarySpecs)
  const [pills, setPills] = useState<CamperCardPill[]>(initialResolved.card.pills)
  const [wizardHighlights, setWizardHighlights] = useState<string[]>(initialResolved.card.wizardHighlights)

  // Pestaña 2: Fotos
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialResolved.thumbnailUrl)
  const [galleryItems, setGalleryItems] = useState<CamperGalleryItem[]>(initialResolved.galleryImages)
  const [floorplanDay, setFloorplanDay] = useState<string>(initialResolved.floorplanDay)
  const [floorplanNight, setFloorplanNight] = useState<string>(initialResolved.floorplanNight)
  const [inlineDescImageSrc, setInlineDescImageSrc] = useState<string>(initialResolved.descriptionInlineImage.src)
  const [inlineDescImageAlt, setInlineDescImageAlt] = useState<string>(initialResolved.descriptionInlineImage.alt)

  // Pestaña 3: Descripción
  const [descriptionParagraphs, setDescriptionParagraphs] = useState<string[]>(
    camper ? initialResolved.descriptionParagraphs : ['']
  )
  const [descriptionEn, setDescriptionEn] = useState<string>(camper?.description_en || '')

  // Pestaña 4: Características/Equipamiento
  const [features, setFeatures] = useState<CamperFeatureItem[]>(initialResolved.features)

  // Pestaña 5: Características Técnicas
  const [techSpecs, setTechSpecs] = useState({
    base_vehicle: initialSpecs.base_vehicle || 'Fiat Ducato L3H2',
    engine: initialSpecs.engine || 'Diésel 2.2L Multijet 140 CV',
    transmission: initialSpecs.transmission || 'Manual 6 velocidades',
    year: Number(initialSpecs.year) || 2025,
    length_m: Number(initialSpecs.length_m) || 5.99,
    width_m: Number(initialSpecs.width_m) || 2.05,
    height_m: Number(initialSpecs.height_m) || 2.58,
    ac: initialSpecs.ac || 'Dometic CoolAir 12V',
    fresh_water_l: Number(initialSpecs.fresh_water_l) || 113,
    grey_water_l: Number(initialSpecs.grey_water_l) || 90,
    solar_w: Number(initialSpecs.solar_w) || 400,
    battery_ah: Number(initialSpecs.battery_ah ?? initialSpecs.lithium_ah) || 540,
    storage_liters: Number(initialSpecs.storage_liters) || 0,
  })
  const [technicalFeatures, setTechnicalFeatures] = useState<CamperFeatureItem[]>(initialResolved.technicalFeatures)

  // Pestaña 6: Alquiler
  const [pricePerNight, setPricePerNight] = useState<number>(initialResolved.rental.basePricePerNight)
  const [standardDepositAmount, setStandardDepositAmount] = useState<number>(initialResolved.rental.standardDepositAmount)
  const [flexDepositAmount, setFlexDepositAmount] = useState<number>(initialResolved.rental.flexDepositAmount)
  const [flexDepositRatePerDay, setFlexDepositRatePerDay] = useState<number>(initialResolved.rental.flexDepositRatePerDay)
  const [secondDriverRatePerDay, setSecondDriverRatePerDay] = useState<number>(initialResolved.rental.secondDriverRatePerDay)
  const [includedItems, setIncludedItems] = useState<string[]>(initialResolved.rental.included)

  const triggerUpload = (target: UploadTarget) => {
    pendingUploadTargetRef.current = target
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const target = pendingUploadTargetRef.current
    if (!file) return

    setUploadingTarget(target)
    setFormError('')

    try {
      const data = new FormData()
      data.append('file', file)
      const res = await fetch('/api/admin/campers/upload-image', { method: 'POST', body: data })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al subir la imagen')

      const uploadedUrl = String(json.url)

      if (target === 'thumbnail') {
        setThumbnailUrl(uploadedUrl)
        setGalleryItems(prev => (prev.some(g => g.src === uploadedUrl) ? prev : [{ src: uploadedUrl, tag: `${name || 'Camper'} — Portada` }, ...prev]))
        onToast('success', 'Foto de portada subida.')
      } else if (target === 'gallery') {
        setGalleryItems(prev => [...prev, { src: uploadedUrl, tag: `${name || 'Camper'} — Foto ${prev.length + 1}` }])
        if (!thumbnailUrl) setThumbnailUrl(uploadedUrl)
        onToast('success', 'Foto añadida a la galería.')
      } else if (target === 'floorplan_day') {
        setFloorplanDay(uploadedUrl)
        onToast('success', 'Plano de día actualizado.')
      } else if (target === 'floorplan_night') {
        setFloorplanNight(uploadedUrl)
        onToast('success', 'Plano de noche actualizado.')
      } else if (target === 'inline_desc') {
        setInlineDescImageSrc(uploadedUrl)
        onToast('success', 'Imagen de descripción actualizada.')
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la imagen')
    } finally {
      setUploadingTarget(null)
      if (e.target) e.target.value = ''
    }
  }

  const handleAddGalleryUrl = () => {
    const url = galleryUrlInput.trim()
    if (!url) return
    if (!galleryItems.some(item => item.src === url)) {
      setGalleryItems(prev => [...prev, { src: url, tag: `${name || 'Camper'} — Foto ${prev.length + 1}` }])
    }
    setGalleryUrlInput('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('El nombre de la camper es obligatorio.')
      setActiveTab('summary')
      return
    }

    const finalSlug = slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    const cleanedParagraphs = descriptionParagraphs.map(p => p.trim()).filter(Boolean)
    const cleanedGallery = galleryItems.filter(g => g.src.trim())
    const effectiveThumbnail = thumbnailUrl.trim() || cleanedGallery[0]?.src || '/images/campers/neo/neo-ext.png'
    const imagesArray = cleanedGallery.length > 0
      ? (cleanedGallery.some(g => g.src === effectiveThumbnail)
        ? cleanedGallery.map(g => g.src)
        : [effectiveThumbnail, ...cleanedGallery.map(g => g.src)])
      : [effectiveThumbnail]

    const cleanedSummarySpecs = summarySpecs
      .filter(s => s.text.trim())
      .map(s => ({ icon: s.icon, text: s.text.trim(), wide: Boolean(s.wide) }))

    const cleanedPills = pills
      .filter(p => p.label.trim())
      .map(p => ({ icon: p.icon, label: p.label.trim() }))

    const cleanedHighlights = wizardHighlights.map(h => h.trim()).filter(Boolean)
    const cleanedFeatures = features
      .filter(f => f.label.trim())
      .map(f => ({ icon: f.icon, label: f.label.trim(), value: f.value.trim() }))
    const cleanedTechFeatures = technicalFeatures
      .filter(f => f.label.trim())
      .map(f => ({ icon: f.icon, label: f.label.trim(), value: f.value.trim() }))
    const cleanedIncluded = includedItems.map(i => i.trim()).filter(Boolean)

    setIsSaving(true)

    try {
      const url = mode === 'create' ? '/api/admin/campers' : `/api/admin/campers/${camper?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const payload = {
        name: name.trim(),
        slug: finalSlug,
        seats: Number(seats),
        beds: Number(beds),
        deposit_amount: Number(standardDepositAmount),
        price_per_night: Number(pricePerNight),
        is_active: isActive,
        is_available: isAvailable,
        thumbnail_url: effectiveThumbnail,
        images: imagesArray,
        description_es: cleanedParagraphs.join('\n\n'),
        description_en: descriptionEn.trim() || undefined,
        specs: {
          ...initialSpecs,
          ...techSpecs,
          seats: Number(seats),
          beds: Number(beds),
          card: {
            tagline: tagline.trim(),
            summarySpecs: cleanedSummarySpecs,
            pills: cleanedPills,
            wizardHighlights: cleanedHighlights,
          },
          gallery_items: cleanedGallery,
          floorplan_day: floorplanDay.trim(),
          floorplan_night: floorplanNight.trim(),
          description_inline_image: {
            src: inlineDescImageSrc.trim(),
            alt: inlineDescImageAlt.trim() || `Interior ${name.trim()}`,
          },
          description_paragraphs: cleanedParagraphs,
          features: cleanedFeatures,
          technical_features: cleanedTechFeatures,
          rental: {
            standard_deposit_amount: Number(standardDepositAmount),
            flex_deposit_amount: Number(flexDepositAmount),
            flex_deposit_rate_per_day: Number(flexDepositRatePerDay),
            second_driver_rate_per_day: Number(secondDriverRatePerDay),
            included: cleanedIncluded,
          },
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

      onSaved(result.camper, mode)
    } catch (err: any) {
      const msg = err.message || 'Ocurrió un error inesperado al guardar'
      setFormError(msg)
      onToast('error', msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="ced-backdrop" onClick={() => !isSaving && onClose()}>
      <div className="ced-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ced-title">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="ced-sr-only"
          aria-label="Subir imagen de camper"
          onChange={handleFileChange}
        />

        {/* Cabecera */}
        <header className="ced-header">
          <div className="ced-header__title-wrap">
            <div className="ced-header__icon">
              <Car size={20} />
            </div>
            <div>
              <h3 id="ced-title" className="ced-header__title">
                {mode === 'create' ? 'Añadir camper' : `Editar: ${camper?.name}`}
              </h3>
              <p className="ced-header__sub">
                Los cambios se reflejan en la tarjeta, ficha pública y asistente de reserva.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            className="ced-close-btn"
            disabled={isSaving}
            aria-label="Cerrar editor"
          >
            <X size={20} />
          </button>
        </header>

        {/* Barra de 6 pestañas */}
        <nav className="ced-tabs" role="tablist" aria-label="Secciones de edición de la camper">
          {EDITOR_TABS.map(tab => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`ced-tab ${isSelected ? 'ced-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Formulario */}
        <form onSubmit={handleSave} className="ced-form">
          <div className="ced-body">
            {formError && (
              <div className="ced-alert-error" role="alert">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* ── TAB 1: TARJETA RESUMEN ── */}
            {activeTab === 'summary' && (
              <div className="ced-tab-panel">
                <div className="ced-grid-2">
                  <div className="ced-field">
                    <label htmlFor="ced-name" className="ced-label">Nombre del Vehículo *</label>
                    <input
                      id="ced-name"
                      type="text"
                      required
                      value={name}
                      onChange={e => {
                        const val = e.target.value
                        setName(val)
                        if (mode === 'create' && !slug.trim()) {
                          setSlug(val.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))
                        }
                      }}
                      placeholder="Ej. NEO, SPACE"
                      className="ced-input"
                    />
                  </div>
                  <div className="ced-field">
                    <label htmlFor="ced-slug" className="ced-label">Slug / Identificador URL *</label>
                    <input
                      id="ced-slug"
                      type="text"
                      required
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="ej. neo"
                      className="ced-input"
                    />
                  </div>
                </div>

                <div className="ced-field">
                  <label htmlFor="ced-tagline" className="ced-label">Subtítulo / Tagline de la Tarjeta y Cabecera</label>
                  <textarea
                    id="ced-tagline"
                    rows={2}
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Frase resumen visible bajo el nombre en la tarjeta y ficha..."
                    className="ced-input"
                  />
                </div>

                <div className="ced-grid-3">
                  <div className="ced-field">
                    <label htmlFor="ced-seats" className="ced-label">Plazas de viaje *</label>
                    <input
                      id="ced-seats"
                      type="number"
                      min={1}
                      max={9}
                      required
                      value={seats}
                      onChange={e => setSeats(parseInt(e.target.value, 10) || 1)}
                      className="ced-input"
                    />
                  </div>
                  <div className="ced-field">
                    <label htmlFor="ced-beds" className="ced-label">Plazas para dormir *</label>
                    <input
                      id="ced-beds"
                      type="number"
                      min={1}
                      max={6}
                      required
                      value={beds}
                      onChange={e => setBeds(parseInt(e.target.value, 10) || 1)}
                      className="ced-input"
                    />
                  </div>
                  <div className="ced-field">
                    <label htmlFor="ced-summary-length" className="ced-label">Longitud (m)</label>
                    <input
                      id="ced-summary-length"
                      type="number"
                      step="0.01"
                      value={techSpecs.length_m}
                      onChange={e => setTechSpecs(prev => ({ ...prev, length_m: parseFloat(e.target.value) || 5.99 }))}
                      className="ced-input"
                    />
                  </div>
                </div>

                {/* Puntos de la CamperCard */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Chips de la Tarjeta Resumen (Camper Card)</h4>
                      <p className="ced-box__hint">Se muestran en el recuadro de características de la tarjeta en Inicio y Catálogo.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setSummarySpecs(prev => [...prev, { icon: 'zap', text: '', wide: false }])}
                    >
                      <Plus size={14} /> Añadir chip
                    </button>
                  </div>

                  <div className="ced-list">
                    {summarySpecs.map((spec, idx) => (
                      <div key={idx} className="ced-row-item">
                        <select
                          aria-label={`Icono chip ${idx + 1}`}
                          value={spec.icon}
                          onChange={e => setSummarySpecs(prev => prev.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)))}
                          className="ced-input ced-select-sm"
                        >
                          {CARD_SPEC_ICON_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={spec.text}
                          onChange={e => setSummarySpecs(prev => prev.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)))}
                          placeholder="Ej. Cocina + nevera 86L"
                          className="ced-input ced-flex-1"
                        />
                        <label className="ced-check-pill">
                          <input
                            type="checkbox"
                            checked={Boolean(spec.wide)}
                            onChange={e => setSummarySpecs(prev => prev.map((it, i) => (i === idx ? { ...it, wide: e.target.checked } : it)))}
                          />
                          <span>Ancho</span>
                        </label>
                        <div className="ced-row-actions">
                          <button type="button" className="ced-icon-btn" onClick={() => setSummarySpecs(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn" onClick={() => setSummarySpecs(prev => moveItem(prev, idx, 1))} disabled={idx === summarySpecs.length - 1} aria-label="Bajar">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setSummarySpecs(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar chip">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Píldoras de cabecera de la ficha */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Píldoras de Cabecera (Ficha de Camper)</h4>
                      <p className="ced-box__hint">4 píldoras destacadas bajo el título en /campers/[slug].</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setPills(prev => [...prev, { icon: 'zap', label: '' }])}
                    >
                      <Plus size={14} /> Añadir píldora
                    </button>
                  </div>
                  <div className="ced-list">
                    {pills.map((pill, idx) => (
                      <div key={idx} className="ced-row-item">
                        <select
                          aria-label={`Icono píldora ${idx + 1}`}
                          value={pill.icon}
                          onChange={e => setPills(prev => prev.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)))}
                          className="ced-input ced-select-sm"
                        >
                          {FEATURE_ICON_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={pill.label}
                          onChange={e => setPills(prev => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                          placeholder="Ej. Sistema eléctrico Pro 540Ah"
                          className="ced-input ced-flex-1"
                        />
                        <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setPills(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar píldora">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Destacados del Paso 2 del asistente */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Destacados en el Asistente de Reserva (Paso 2)</h4>
                      <p className="ced-box__hint">Lista de ventajas rápidas al elegir o cambiar de modelo durante la reserva.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setWizardHighlights(prev => [...prev, ''])}
                    >
                      <Plus size={14} /> Añadir línea
                    </button>
                  </div>
                  <div className="ced-list">
                    {wizardHighlights.map((hl, idx) => (
                      <div key={idx} className="ced-row-item">
                        <input
                          type="text"
                          value={hl}
                          onChange={e => setWizardHighlights(prev => prev.map((it, i) => (i === idx ? e.target.value : it)))}
                          placeholder="Ej. Sistema eléctrico Pro 540Ah + A/C 12V Dometic"
                          className="ced-input ced-flex-1"
                        />
                        <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setWizardHighlights(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar destacado">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: FOTOS ── */}
            {activeTab === 'photos' && (
              <div className="ced-tab-panel">
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Foto Principal / Portada de la Tarjeta</h4>
                      <p className="ced-box__hint">Imagen principal en la Camper Card y primer resultado en la galería.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => triggerUpload('thumbnail')}
                      disabled={uploadingTarget !== null}
                    >
                      {uploadingTarget === 'thumbnail' ? <Loader2 size={13} className="ced-spin" /> : <Upload size={13} />}
                      <span>Subir portada</span>
                    </button>
                  </div>

                  <div className="ced-thumb-row">
                    {thumbnailUrl && (
                      <div className="ced-thumb-preview">
                        <Image src={thumbnailUrl} alt="Portada" fill sizes="90px" className="ced-img-cover" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={thumbnailUrl}
                      onChange={e => setThumbnailUrl(e.target.value)}
                      placeholder="/images/campers/... o URL"
                      className="ced-input ced-flex-1"
                    />
                  </div>

                  <div className="ced-presets-row">
                    <span className="ced-box__hint">Preajustes:</span>
                    {PRESET_THUMBNAILS.map(p => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => setThumbnailUrl(p.url)}
                        className={`ced-preset-btn ${thumbnailUrl === p.url ? 'ced-preset-btn--on' : ''}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Galería completa */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Galería de Fotos ({galleryItems.length})</h4>
                      <p className="ced-box__hint">Ordena, cambia etiquetas y marca la portada. Se muestra en el carrusel de tarjetas y en la ficha.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => triggerUpload('gallery')}
                      disabled={uploadingTarget !== null}
                    >
                      {uploadingTarget === 'gallery' ? <Loader2 size={13} className="ced-spin" /> : <Upload size={13} />}
                      <span>Añadir foto desde PC</span>
                    </button>
                  </div>

                  <div className="ced-gallery-list">
                    {galleryItems.map((item, idx) => {
                      const isCover = thumbnailUrl === item.src
                      return (
                        <div key={`${item.src}-${idx}`} className={`ced-gallery-item ${isCover ? 'ced-gallery-item--cover' : ''}`}>
                          <div className="ced-gallery-item__thumb">
                            <Image src={item.src} alt={item.tag || `Foto ${idx + 1}`} fill sizes="100px" className="ced-img-cover" />
                          </div>
                          <div className="ced-gallery-item__fields">
                            <input
                              type="text"
                              value={item.tag}
                              onChange={e => setGalleryItems(prev => prev.map((g, i) => (i === idx ? { ...g, tag: e.target.value } : g)))}
                              placeholder="Título o etiqueta de la foto"
                              className="ced-input"
                            />
                            <input
                              type="text"
                              value={item.src}
                              onChange={e => setGalleryItems(prev => prev.map((g, i) => (i === idx ? { ...g, src: e.target.value } : g)))}
                              placeholder="Ruta o URL de la foto"
                              className="ced-input ced-input--mono"
                            />
                          </div>
                          <div className="ced-gallery-item__actions">
                            <button
                              type="button"
                              onClick={() => setThumbnailUrl(item.src)}
                              className={`adm-btn adm-btn--sm ${isCover ? 'adm-btn--primary' : ''}`}
                              title="Fijar como portada"
                            >
                              <Star size={12} />
                              <span>{isCover ? 'Portada' : 'Hacer portada'}</span>
                            </button>
                            <div className="ced-row-actions">
                              <button type="button" className="ced-icon-btn" onClick={() => setGalleryItems(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Mover antes">
                                <ArrowUp size={13} />
                              </button>
                              <button type="button" className="ced-icon-btn" onClick={() => setGalleryItems(prev => moveItem(prev, idx, 1))} disabled={idx === galleryItems.length - 1} aria-label="Mover después">
                                <ArrowDown size={13} />
                              </button>
                              <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setGalleryItems(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar foto">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {galleryItems.length === 0 && (
                      <p className="ced-empty-hint">No hay fotos en la galería aún.</p>
                    )}
                  </div>

                  <div className="ced-url-add-row">
                    <input
                      type="text"
                      value={galleryUrlInput}
                      onChange={e => setGalleryUrlInput(e.target.value)}
                      placeholder="O pega la ruta/URL de una imagen..."
                      className="ced-input ced-flex-1"
                    />
                    <button type="button" className="adm-btn adm-btn--sm" onClick={handleAddGalleryUrl}>
                      + Añadir URL
                    </button>
                  </div>
                </div>

                {/* Planos y foto de descripción */}
                <div className="ced-box">
                  <h4 className="ced-box__title">Planos de Configuración (Día / Noche) y Foto de Descripción</h4>
                  <div className="ced-grid-2">
                    <div className="ced-field">
                      <label className="ced-label">Plano / Vista Día</label>
                      <div className="ced-thumb-row">
                        <input
                          type="text"
                          value={floorplanDay}
                          onChange={e => setFloorplanDay(e.target.value)}
                          className="ced-input ced-flex-1"
                        />
                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('floorplan_day')} disabled={uploadingTarget !== null}>
                          <Upload size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Plano / Vista Noche</label>
                      <div className="ced-thumb-row">
                        <input
                          type="text"
                          value={floorplanNight}
                          onChange={e => setFloorplanNight(e.target.value)}
                          className="ced-input ced-flex-1"
                        />
                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('floorplan_night')} disabled={uploadingTarget !== null}>
                          <Upload size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="ced-grid-2">
                    <div className="ced-field">
                      <label className="ced-label">Imagen dentro de Descripción (al expandir)</label>
                      <div className="ced-thumb-row">
                        <input
                          type="text"
                          value={inlineDescImageSrc}
                          onChange={e => setInlineDescImageSrc(e.target.value)}
                          className="ced-input ced-flex-1"
                        />
                        <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('inline_desc')} disabled={uploadingTarget !== null}>
                          <Upload size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Texto alternativo (Alt)</label>
                      <input
                        type="text"
                        value={inlineDescImageAlt}
                        onChange={e => setInlineDescImageAlt(e.target.value)}
                        className="ced-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: DESCRIPCIÓN ── */}
            {activeTab === 'description' && (
              <div className="ced-tab-panel">
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Párrafos de Descripción (ES)</h4>
                      <p className="ced-box__hint">Se muestran en la sección DESCRIPCIÓN de la ficha pública. Los primeros 3 párrafos son visibles directamente y el resto al pulsar «Leer más».</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setDescriptionParagraphs(prev => [...prev, ''])}
                    >
                      <Plus size={14} /> Añadir párrafo
                    </button>
                  </div>

                  <div className="ced-list">
                    {descriptionParagraphs.map((paragraph, idx) => (
                      <div key={idx} className="ced-paragraph-card">
                        <div className="ced-paragraph-card__head">
                          <span className="ced-label">Párrafo {idx + 1}</span>
                          <div className="ced-row-actions">
                            <button type="button" className="ced-icon-btn" onClick={() => setDescriptionParagraphs(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir párrafo">
                              <ArrowUp size={13} />
                            </button>
                            <button type="button" className="ced-icon-btn" onClick={() => setDescriptionParagraphs(prev => moveItem(prev, idx, 1))} disabled={idx === descriptionParagraphs.length - 1} aria-label="Bajar párrafo">
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              className="ced-icon-btn ced-icon-btn--danger"
                              onClick={() => setDescriptionParagraphs(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [''])}
                              aria-label="Eliminar párrafo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={paragraph}
                          onChange={e => setDescriptionParagraphs(prev => prev.map((p, i) => (i === idx ? e.target.value : p)))}
                          placeholder="Escribe el texto de este párrafo..."
                          className="ced-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ced-field">
                  <label htmlFor="ced-desc-en" className="ced-label">Descripción resumida en Inglés (opcional)</label>
                  <textarea
                    id="ced-desc-en"
                    rows={3}
                    value={descriptionEn}
                    onChange={e => setDescriptionEn(e.target.value)}
                    placeholder="English description..."
                    className="ced-input"
                  />
                </div>
              </div>
            )}

            {/* ── TAB 4: CARACTERÍSTICAS/EQUIPAMIENTO ── */}
            {activeTab === 'equipment' && (
              <div className="ced-tab-panel">
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Características y Equipamiento ({features.length})</h4>
                      <p className="ced-box__hint">Tarjetas mostradas en la sección «CARACTERÍSTICAS Y EQUIPAMIENTO» de la ficha de la camper.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setFeatures(prev => [...prev, { icon: 'zap', label: '', value: '' }])}
                    >
                      <Plus size={14} /> Añadir característica
                    </button>
                  </div>

                  <div className="ced-list">
                    {features.map((feat, idx) => (
                      <div key={idx} className="ced-feature-row">
                        <select
                          aria-label={`Icono equipamiento ${idx + 1}`}
                          value={feat.icon}
                          onChange={e => setFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)))}
                          className="ced-input ced-select-sm"
                        >
                          {FEATURE_ICON_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={feat.label}
                          onChange={e => setFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                          placeholder="Título (ej. Cocina equipada)"
                          className="ced-input"
                        />
                        <input
                          type="text"
                          value={feat.value}
                          onChange={e => setFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, value: e.target.value } : it)))}
                          placeholder="Detalle (ej. Nevera 86L y dos fogones)"
                          className="ced-input ced-flex-1"
                        />
                        <div className="ced-row-actions">
                          <button type="button" className="ced-icon-btn" onClick={() => setFeatures(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn" onClick={() => setFeatures(prev => moveItem(prev, idx, 1))} disabled={idx === features.length - 1} aria-label="Bajar">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setFeatures(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: CARACTERÍSTICAS TÉCNICAS ── */}
            {activeTab === 'technical' && (
              <div className="ced-tab-panel">
                <div className="ced-box">
                  <h4 className="ced-box__title">Especificaciones Base del Vehículo</h4>
                  <div className="ced-grid-2">
                    <div className="ced-field">
                      <label className="ced-label">Vehículo base</label>
                      <input type="text" value={techSpecs.base_vehicle} onChange={e => setTechSpecs(p => ({ ...p, base_vehicle: e.target.value }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Año del modelo</label>
                      <input type="number" value={techSpecs.year} onChange={e => setTechSpecs(p => ({ ...p, year: parseInt(e.target.value, 10) || 2025 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Motorización</label>
                      <input type="text" value={techSpecs.engine} onChange={e => setTechSpecs(p => ({ ...p, engine: e.target.value }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Transmisión</label>
                      <input type="text" value={techSpecs.transmission} onChange={e => setTechSpecs(p => ({ ...p, transmission: e.target.value }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Aire acondicionado</label>
                      <input type="text" value={techSpecs.ac} onChange={e => setTechSpecs(p => ({ ...p, ac: e.target.value }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Maletero (L)</label>
                      <input type="number" min={0} value={techSpecs.storage_liters} onChange={e => setTechSpecs(p => ({ ...p, storage_liters: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                    </div>
                  </div>
                  <div className="ced-grid-3">
                    <div className="ced-field">
                      <label className="ced-label">Longitud (m)</label>
                      <input type="number" step="0.01" value={techSpecs.length_m} onChange={e => setTechSpecs(p => ({ ...p, length_m: parseFloat(e.target.value) || 5.99 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Anchura (m)</label>
                      <input type="number" step="0.01" value={techSpecs.width_m} onChange={e => setTechSpecs(p => ({ ...p, width_m: parseFloat(e.target.value) || 2.05 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Altura (m)</label>
                      <input type="number" step="0.01" value={techSpecs.height_m} onChange={e => setTechSpecs(p => ({ ...p, height_m: parseFloat(e.target.value) || 2.58 }))} className="ced-input" />
                    </div>
                  </div>
                  <div className="ced-grid-4">
                    <div className="ced-field">
                      <label className="ced-label">Agua limpia (L)</label>
                      <input type="number" value={techSpecs.fresh_water_l} onChange={e => setTechSpecs(p => ({ ...p, fresh_water_l: parseInt(e.target.value, 10) || 113 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Aguas grises (L)</label>
                      <input type="number" value={techSpecs.grey_water_l} onChange={e => setTechSpecs(p => ({ ...p, grey_water_l: parseInt(e.target.value, 10) || 90 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Placas solares (W)</label>
                      <input type="number" value={techSpecs.solar_w} onChange={e => setTechSpecs(p => ({ ...p, solar_w: parseInt(e.target.value, 10) || 400 }))} className="ced-input" />
                    </div>
                    <div className="ced-field">
                      <label className="ced-label">Batería litio (Ah)</label>
                      <input type="number" value={techSpecs.battery_ah} onChange={e => setTechSpecs(p => ({ ...p, battery_ah: parseInt(e.target.value, 10) || 540 }))} className="ced-input" />
                    </div>
                  </div>
                </div>

                {/* Lista de tarjetas de Características Técnicas */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Bloques de Ficha Técnica en la Web ({technicalFeatures.length})</h4>
                      <p className="ced-box__hint">Tarjetas mostradas en la sección «CARACTERÍSTICAS TÉCNICAS».</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setTechnicalFeatures(prev => [...prev, { icon: 'gauge', label: '', value: '' }])}
                    >
                      <Plus size={14} /> Añadir bloque técnico
                    </button>
                  </div>

                  <div className="ced-list">
                    {technicalFeatures.map((feat, idx) => (
                      <div key={idx} className="ced-feature-row">
                        <select
                          aria-label={`Icono técnico ${idx + 1}`}
                          value={feat.icon}
                          onChange={e => setTechnicalFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)))}
                          className="ced-input ced-select-sm"
                        >
                          {FEATURE_ICON_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={feat.label}
                          onChange={e => setTechnicalFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                          placeholder="Título (ej. Sistema eléctrico Pro)"
                          className="ced-input"
                        />
                        <input
                          type="text"
                          value={feat.value}
                          onChange={e => setTechnicalFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, value: e.target.value } : it)))}
                          placeholder="Valor técnico"
                          className="ced-input ced-flex-1"
                        />
                        <div className="ced-row-actions">
                          <button type="button" className="ced-icon-btn" onClick={() => setTechnicalFeatures(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn" onClick={() => setTechnicalFeatures(prev => moveItem(prev, idx, 1))} disabled={idx === technicalFeatures.length - 1} aria-label="Bajar">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setTechnicalFeatures(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: ALQUILER ── */}
            {activeTab === 'rental' && (
              <div className="ced-tab-panel">
                <div className="ced-box">
                  <h4 className="ced-box__title">Tarifa Base y Precios de Fianza de la Reserva</h4>
                  <p className="ced-box__hint">Estos importes se aplican directamente en la ficha, el asistente de reserva (Paso 4 y resumen) y el cobro verificado en el servidor.</p>

                  <div className="ced-grid-2">
                    <div className="ced-field">
                      <label htmlFor="ced-base-price" className="ced-label">Tarifa Base por Noche (€) *</label>
                      <input
                        id="ced-base-price"
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={pricePerNight}
                        onChange={e => setPricePerNight(parseFloat(e.target.value) || 0)}
                        className="ced-input"
                      />
                    </div>
                    <div className="ced-field">
                      <label htmlFor="ced-second-driver-rate" className="ced-label">2º Conductor (Seguro Estándar, €/día)</label>
                      <input
                        id="ced-second-driver-rate"
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={secondDriverRatePerDay}
                        onChange={e => setSecondDriverRatePerDay(parseFloat(e.target.value) || 0)}
                        className="ced-input"
                      />
                    </div>
                  </div>

                  <div className="ced-grid-3">
                    <div className="ced-field">
                      <label htmlFor="ced-std-deposit" className="ced-label">Fianza Estándar (€) *</label>
                      <input
                        id="ced-std-deposit"
                        type="number"
                        min={0}
                        step={50}
                        required
                        value={standardDepositAmount}
                        onChange={e => setStandardDepositAmount(parseFloat(e.target.value) || 0)}
                        className="ced-input"
                      />
                    </div>
                    <div className="ced-field">
                      <label htmlFor="ced-flex-deposit" className="ced-label">Fianza Flex (€) *</label>
                      <input
                        id="ced-flex-deposit"
                        type="number"
                        min={0}
                        step={50}
                        required
                        value={flexDepositAmount}
                        onChange={e => setFlexDepositAmount(parseFloat(e.target.value) || 0)}
                        className="ced-input"
                      />
                    </div>
                    <div className="ced-field">
                      <label htmlFor="ced-flex-rate" className="ced-label">Suplemento Fianza Flex (€/día) *</label>
                      <input
                        id="ced-flex-rate"
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={flexDepositRatePerDay}
                        onChange={e => setFlexDepositRatePerDay(parseFloat(e.target.value) || 0)}
                        className="ced-input"
                      />
                    </div>
                  </div>

                  <div className="ced-rental-preview">
                    <span>
                      <strong>Estándar:</strong> Fianza {formatDepositEuros(standardDepositAmount)} (2º conductor +{secondDriverRatePerDay} €/día)
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Flex:</strong> Fianza {formatDepositEuros(flexDepositAmount)} (+{flexDepositRatePerDay} €/día, 2º conductor incluido)
                    </span>
                  </div>
                </div>

                {/* Qué incluye el alquiler */}
                <div className="ced-box">
                  <div className="ced-box__head">
                    <div>
                      <h4 className="ced-box__title">Qué incluye el alquiler ({includedItems.length})</h4>
                      <p className="ced-box__hint">Se muestra en la ficha de la camper, en el Paso 6 (Extras) y en el resumen lateral.</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => setIncludedItems(prev => [...prev, ''])}
                    >
                      <Plus size={14} /> Añadir elemento
                    </button>
                  </div>

                  <div className="ced-list">
                    {includedItems.map((item, idx) => (
                      <div key={idx} className="ced-row-item">
                        <input
                          type="text"
                          value={item}
                          onChange={e => setIncludedItems(prev => prev.map((it, i) => (i === idx ? e.target.value : it)))}
                          placeholder="Ej. 150 km al día incluidos"
                          className="ced-input ced-flex-1"
                        />
                        <div className="ced-row-actions">
                          <button type="button" className="ced-icon-btn" onClick={() => setIncludedItems(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn" onClick={() => setIncludedItems(prev => moveItem(prev, idx, 1))} disabled={idx === includedItems.length - 1} aria-label="Bajar">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setIncludedItems(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Publicación y estado operativo */}
                <div className="ced-grid-2">
                  <div className="ced-toggle-card">
                    <span className="ced-label">Publicación en Web</span>
                    <p className="ced-box__hint">Determina si los usuarios pueden ver y reservar este modelo.</p>
                    <div className="ced-toggle-options">
                      <label className={`ced-toggle-opt ${isActive ? 'ced-toggle-opt--on' : ''}`}>
                        <input type="radio" name="ced_is_active" checked={isActive} onChange={() => setIsActive(true)} />
                        <span>Publicada</span>
                      </label>
                      <label className={`ced-toggle-opt ${!isActive ? 'ced-toggle-opt--on' : ''}`}>
                        <input type="radio" name="ced_is_active" checked={!isActive} onChange={() => setIsActive(false)} />
                        <span>Oculta</span>
                      </label>
                    </div>
                  </div>

                  <div className="ced-toggle-card">
                    <span className="ced-label">Estado Operativo</span>
                    <p className="ced-box__hint">Define si la furgoneta está operativa o en taller.</p>
                    <div className="ced-toggle-options">
                      <label className={`ced-toggle-opt ${isAvailable ? 'ced-toggle-opt--on' : ''}`}>
                        <input type="radio" name="ced_is_available" checked={isAvailable} onChange={() => setIsAvailable(true)} />
                        <span>Operativa</span>
                      </label>
                      <label className={`ced-toggle-opt ${!isAvailable ? 'ced-toggle-opt--amber' : ''}`}>
                        <input type="radio" name="ced_is_available" checked={!isAvailable} onChange={() => setIsAvailable(false)} />
                        <span>En taller</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Acceso rápido a Extras y Temporadas */}
                <div className="ced-settings-shortcut">
                  <div>
                    <strong>Precios de Extras, Temporadas y Descuentos</strong>
                    <p className="ced-box__hint">Los extras del Paso 6 y los suplementos por temporada se gestionan en Ajustes y se aplican a toda la flota.</p>
                  </div>
                  <Link href="/es/admin/settings#extras" className="adm-btn adm-btn--sm">
                    <span>Ir a Extras y Tarifas</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <footer className="ced-footer">
            <button type="button" onClick={onClose} disabled={isSaving} className="adm-btn">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="adm-btn adm-btn--primary">
              {isSaving ? <Loader2 size={16} className="ced-spin" /> : <CheckCircle2 size={16} />}
              <span>{mode === 'create' ? 'Crear Camper' : 'Guardar Cambios'}</span>
            </button>
          </footer>
        </form>
      </div>

      <style jsx>{`
        .ced-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        .ced-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .ced-card {
          background: var(--adm-surface);
          color: var(--adm-text);
          border: 1px solid var(--adm-border);
          border-radius: 18px;
          width: 100%;
          max-width: 860px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
        }
        .ced-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
          flex-shrink: 0;
        }
        .ced-header__title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .ced-header__icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--adm-sage-soft);
          color: var(--adm-primary-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ced-header__title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 700;
          color: var(--adm-text);
        }
        .ced-header__sub {
          margin: 2px 0 0;
          font-size: 0.78rem;
          color: var(--adm-text-2);
        }
        .ced-close-btn {
          background: transparent;
          border: none;
          color: var(--adm-text-3);
          cursor: pointer;
          border-radius: 8px;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ced-close-btn:hover {
          background: var(--adm-surface);
          color: var(--adm-text);
        }

        /* Barra de 6 pestañas */
        .ced-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 22px;
          background: var(--adm-surface-2);
          border-bottom: 1px solid var(--adm-border);
          overflow-x: auto;
          scrollbar-width: thin;
          flex-shrink: 0;
        }
        .ced-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ced-tab:hover {
          border-color: var(--adm-border-strong);
          color: var(--adm-text);
        }
        .ced-tab--active {
          background: var(--adm-primary-bg);
          border-color: var(--adm-primary-bg);
          color: var(--adm-primary-text);
        }

        .ced-form {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .ced-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ced-tab-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ced-alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--adm-rose-soft);
          color: var(--adm-rose);
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .ced-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .ced-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .ced-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .ced-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .ced-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--adm-text);
        }
        .ced-input {
          width: 100%;
          padding: 8px 11px;
          border: 1px solid var(--adm-border-strong);
          border-radius: 8px;
          font-size: 0.88rem;
          background: var(--adm-surface);
          color: var(--adm-text);
          outline: none;
          box-sizing: border-box;
        }
        .ced-input:focus {
          border-color: var(--adm-primary-bg);
          box-shadow: 0 0 0 2px var(--adm-gold-soft);
        }
        .ced-input--mono {
          font-family: monospace;
          font-size: 0.78rem;
        }
        .ced-select-sm {
          width: 165px;
          flex-shrink: 0;
        }
        .ced-flex-1 {
          flex: 1;
          min-width: 0;
        }

        .ced-box {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ced-box__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ced-box__title {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--adm-text);
        }
        .ced-box__hint {
          margin: 2px 0 0;
          font-size: 0.76rem;
          color: var(--adm-text-2);
        }

        .ced-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ced-row-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ced-feature-row {
          display: grid;
          grid-template-columns: 165px minmax(140px, 0.9fr) minmax(180px, 1.4fr) auto;
          gap: 8px;
          align-items: center;
        }
        .ced-row-actions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .ced-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ced-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .ced-icon-btn--danger {
          color: var(--adm-rose);
          border-color: var(--adm-rose-soft);
          background: var(--adm-rose-soft);
        }
        .ced-check-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--adm-text-2);
          white-space: nowrap;
          cursor: pointer;
        }

        /* Fotos */
        .ced-thumb-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ced-thumb-preview {
          position: relative;
          width: 82px;
          height: 56px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--adm-border-strong);
          flex-shrink: 0;
        }
        :global(.ced-img-cover) {
          object-fit: cover;
        }
        .ced-presets-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }
        .ced-preset-btn {
          padding: 4px 9px;
          font-size: 0.74rem;
          border-radius: 6px;
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          cursor: pointer;
        }
        .ced-preset-btn--on {
          border-color: var(--adm-primary-bg);
          color: var(--adm-primary-bg);
          font-weight: 700;
          background: var(--adm-sage-soft);
        }
        .ced-gallery-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ced-gallery-item {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
        }
        .ced-gallery-item--cover {
          border-color: var(--adm-primary-bg);
          box-shadow: 0 0 0 1px var(--adm-primary-bg);
        }
        .ced-gallery-item__thumb {
          position: relative;
          width: 96px;
          height: 68px;
          border-radius: 7px;
          overflow: hidden;
          background: var(--adm-surface-2);
        }
        .ced-gallery-item__fields {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .ced-gallery-item__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .ced-url-add-row {
          display: flex;
          gap: 8px;
        }
        .ced-empty-hint {
          margin: 0;
          font-size: 0.82rem;
          color: var(--adm-text-2);
        }

        /* Párrafos */
        .ced-paragraph-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
        }
        .ced-paragraph-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Alquiler */
        .ced-rental-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--adm-surface);
          border: 1px dashed var(--adm-border-strong);
          font-size: 0.8rem;
          color: var(--adm-text-2);
        }
        .ced-toggle-card {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ced-toggle-options {
          display: flex;
          gap: 8px;
        }
        .ced-toggle-opt {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .ced-toggle-opt input {
          display: none;
        }
        .ced-toggle-opt--on {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
          border-color: var(--adm-primary-bg);
        }
        .ced-toggle-opt--amber {
          background: var(--adm-amber);
          color: var(--adm-surface);
          border-color: var(--adm-amber);
        }
        .ced-settings-shortcut {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 12px 14px;
          border-radius: 12px;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          font-size: 0.84rem;
        }

        .ced-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 22px;
          border-top: 1px solid var(--adm-border);
          background: var(--adm-surface);
          flex-shrink: 0;
        }
        .ced-spin {
          animation: cedSpin 1s linear infinite;
        }
        @keyframes cedSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 720px) {
          .ced-grid-2,
          .ced-grid-3,
          .ced-grid-4,
          .ced-feature-row,
          .ced-gallery-item {
            grid-template-columns: 1fr;
          }
          .ced-select-sm {
            width: 100%;
          }
          .ced-gallery-item__actions {
            flex-direction: row;
            justify-content: space-between;
            width: 100%;
          }
          .ced-row-item {
            flex-wrap: wrap;
          }
        }
        @media (max-width: 640px) {
          .ced-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          .ced-card {
            border-radius: 20px 20px 0 0;
            max-height: 94vh;
            max-width: 100%;
          }
          .ced-header,
          .ced-tabs,
          .ced-body,
          .ced-footer {
            padding-left: 16px;
            padding-right: 16px;
          }
          .ced-footer {
            flex-direction: column-reverse;
          }
          .ced-footer :global(.adm-btn) {
            width: 100%;
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  )
}

