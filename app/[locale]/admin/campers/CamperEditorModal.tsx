'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  GripVertical,
  CreditCard,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Wrench,
  ShieldCheck,
  ExternalLink,
  Eye,
  Pencil,
  Globe,
  Languages,
  BusFront,
  Moon,
  Utensils,
  ShowerHead,
  Ruler,
  BedDouble,
  BatteryCharging,
  Zap,
  Snowflake,
  Sun,
  Wind,
  Shield,
  Users,
  Droplets,
  Gauge,
  Thermometer,
  Wifi,
  Tv,
  Plug,
} from 'lucide-react'
import CamperEditorPreview from './CamperEditorPreview'
import {
  CAMPER_SUPPORTED_LOCALES,
  CamperLocaleCode,
  CamperCardPill,
  CamperCardSummarySpec,
  CamperFeatureItem,
  CamperGalleryItem,
  formatDepositEuros,
  resolveCamperContent,
  splitDescriptionParagraphs,
} from '@/lib/campers/camperCatalog'
import {
  translateCamperContent,
  TranslatableLocale,
} from '@/lib/campers/autoTranslate'

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

const LOCALE_META: Array<{ code: CamperLocaleCode; short: string; label: string }> = [
  { code: 'es', short: 'ES', label: 'Español' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'de', short: 'DE', label: 'Deutsch' },
]

const PRESET_THUMBNAILS = [
  { label: 'Exterior NEO', url: '/images/campers/neo/neo-ext.png' },
  { label: 'Exterior SPACE', url: '/images/campers/space/space-ext.png' },
  { label: 'Interior NEO', url: '/images/campers/neo/neo-interior.png' },
  { label: 'Interior SPACE', url: '/images/campers/space/space-interior.png' },
]

const ICON_COMPONENTS: Record<string, any> = {
  bus: BusFront,
  users: Users,
  moon: Moon,
  utensils: Utensils,
  shower: ShowerHead,
  droplets: Droplets,
  ruler: Ruler,
  bed: BedDouble,
  battery: BatteryCharging,
  zap: Zap,
  snowflake: Snowflake,
  sun: Sun,
  wind: Wind,
  shield: Shield,
  gauge: Gauge,
  thermometer: Thermometer,
  wifi: Wifi,
  tv: Tv,
  plug: Plug,
}

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

export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const nextIdx = index + delta
  if (nextIdx < 0 || nextIdx >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(nextIdx, 0, item)
  return copy
}

export function reorderItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list
  }
  const copy = [...list]
  const [item] = copy.splice(fromIndex, 1)
  copy.splice(toIndex, 0, item)
  return copy
}

interface CompactIconPickerProps {
  value: string
  options: Array<{ value: string; label: string }>
  ariaLabel: string
  onChange: (nextIcon: string) => void
}

function CompactIconPicker({ value, options, ariaLabel, onChange }: CompactIconPickerProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const CurrentIcon = ICON_COMPONENTS[value] || Zap
  const currentLabel = options.find(o => o.value === value)?.label || value

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div className="cip-root" ref={wrapRef}>
      <button
        type="button"
        className={`cip-trigger ${open ? 'cip-trigger--open' : ''}`}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        title={`Icono: ${currentLabel}`}
        onClick={() => setOpen(o => !o)}
      >
        <CurrentIcon size={15} />
      </button>

      {open && (
        <div className="cip-popover" role="listbox" aria-label={ariaLabel}>
          {options.map(opt => {
            const OptIcon = ICON_COMPONENTS[opt.value] || Zap
            const selected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                title={opt.label}
                className={`cip-option ${selected ? 'cip-option--selected' : ''}`}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                <OptIcon size={15} />
              </button>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .cip-root {
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }
        .cip-trigger {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          color: var(--adm-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cip-trigger:hover,
        .cip-trigger--open {
          border-color: var(--adm-primary-bg);
          background: var(--adm-gold-soft);
          color: var(--adm-primary-bg);
        }
        .cip-popover {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 40;
          display: grid;
          grid-template-columns: repeat(4, 34px);
          gap: 4px;
          padding: 6px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border-strong);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        }
        .cip-option {
          width: 34px;
          height: 34px;
          border-radius: 7px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--adm-text-2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .cip-option:hover {
          background: var(--adm-surface-2);
          color: var(--adm-text);
        }
        .cip-option--selected {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
        }
      `}</style>
    </div>
  )
}

interface LocaleEditableState {
  tagline: string
  summarySpecs: CamperCardSummarySpec[]
  pills: CamperCardPill[]
  wizardHighlights: string[]
  galleryTags: string[]
  inlineDescImageAlt: string
  descriptionText: string
  features: CamperFeatureItem[]
  technicalFeatures: CamperFeatureItem[]
  includedItems: string[]
}

function buildInitialLocaleState(camper: any, locale: CamperLocaleCode): LocaleEditableState {
  const baseResolved = resolveCamperContent(camper, 'es')
  const locResolved = resolveCamperContent(camper, locale)
  const rawTranslations = camper?.specs?.translations?.[locale]

  if (locale === 'es') {
    return {
      tagline: baseResolved.card.tagline,
      summarySpecs: baseResolved.card.summarySpecs,
      pills: baseResolved.card.pills,
      wizardHighlights: baseResolved.card.wizardHighlights,
      galleryTags: baseResolved.galleryImages.map(g => g.tag),
      inlineDescImageAlt: baseResolved.descriptionInlineImage.alt,
      descriptionText: baseResolved.descriptionParagraphs.join('\n\n'),
      features: baseResolved.features,
      technicalFeatures: baseResolved.technicalFeatures,
      includedItems: baseResolved.included,
    }
  }

  const hasSavedLocale = rawTranslations && typeof rawTranslations === 'object'
  const fallbackDesc =
    locale === 'en' && typeof camper?.description_en === 'string' && camper.description_en.trim()
      ? camper.description_en.trim()
      : (hasSavedLocale ? locResolved.descriptionParagraphs.join('\n\n') : '')

  return {
    tagline: hasSavedLocale && rawTranslations.tagline ? locResolved.card.tagline : baseResolved.card.tagline,
    summarySpecs: locResolved.card.summarySpecs,
    pills: locResolved.card.pills,
    wizardHighlights: locResolved.card.wizardHighlights,
    galleryTags: locResolved.galleryImages.map(g => g.tag),
    inlineDescImageAlt: locResolved.descriptionInlineImage.alt,
    descriptionText: fallbackDesc || baseResolved.descriptionParagraphs.join('\n\n'),
    features: locResolved.features,
    technicalFeatures: locResolved.technicalFeatures,
    includedItems: locResolved.included,
  }
}

export default function CamperEditorModal({
  mode,
  camper,
  onClose,
  onSaved,
  onToast,
}: CamperEditorProps) {
  const fallbackCamper = camper || {
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

  const initialResolvedEs = resolveCamperContent(fallbackCamper, 'es')
  const initialSpecs = (camper?.specs && typeof camper.specs === 'object') ? camper.specs : {}

  const [activeTab, setActiveTab] = useState<EditorTabId>('summary')
  const [activeLocale, setActiveLocale] = useState<CamperLocaleCode>('es')
  const [isTranslating, setIsTranslating] = useState(false)
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const [dragState, setDragState] = useState<{
    listKey: string
    fromIndex: number
    overIndex: number | null
  } | null>(null)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null)
  const [fileDropTarget, setFileDropTarget] = useState<string | null>(null)
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadTargetRef = useRef<UploadTarget>('gallery')

  // Estado compartido (estructural / numérico)
  const [name, setName] = useState<string>(camper?.name || '')
  const [slug, setSlug] = useState<string>(camper?.slug || '')
  const [isActive, setIsActive] = useState<boolean>(camper?.is_active ?? true)
  const [isAvailable, setIsAvailable] = useState<boolean>(camper?.is_available ?? true)
  const [seats, setSeats] = useState<number>(Number(initialSpecs.seats) || (camper?.slug === 'space' ? 2 : 3))
  const [beds, setBeds] = useState<number>(Number(initialSpecs.beds) || (camper?.slug === 'space' ? 2 : 3))

  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialResolvedEs.thumbnailUrl)
  const [gallerySrcs, setGallerySrcs] = useState<string[]>(initialResolvedEs.galleryImages.map(g => g.src))
  const [floorplanDay, setFloorplanDay] = useState<string>(initialResolvedEs.floorplanDay)
  const [floorplanNight, setFloorplanNight] = useState<string>(initialResolvedEs.floorplanNight)
  const [inlineDescImageSrc, setInlineDescImageSrc] = useState<string>(initialResolvedEs.descriptionInlineImage.src)

  const [techSpecs, setTechSpecs] = useState({
    length_m: Number(initialSpecs.length_m) || 5.99,
    width_m: Number(initialSpecs.width_m) || 2.05,
    height_m: Number(initialSpecs.height_m) || 2.58,
    year: Number(initialSpecs.year) || 2025,
    base_vehicle: initialSpecs.base_vehicle || 'Fiat Ducato L3H2',
    engine: initialSpecs.engine || 'Diésel 2.2L Multijet 140 CV',
    transmission: initialSpecs.transmission || 'Manual 6 velocidades',
    ac: initialSpecs.ac || 'Dometic CoolAir 12V',
    fresh_water_l: Number(initialSpecs.fresh_water_l) || 113,
    grey_water_l: Number(initialSpecs.grey_water_l) || 90,
    solar_w: Number(initialSpecs.solar_w) || 400,
    battery_ah: Number(initialSpecs.battery_ah ?? initialSpecs.lithium_ah) || 540,
    storage_liters: Number(initialSpecs.storage_liters) || (camper?.slug === 'space' ? 850 : 1200),
  })

  const [pricePerNight, setPricePerNight] = useState<number>(initialResolvedEs.rental.basePricePerNight)
  const [standardDepositAmount, setStandardDepositAmount] = useState<number>(initialResolvedEs.rental.standardDepositAmount)
  const [flexDepositAmount, setFlexDepositAmount] = useState<number>(initialResolvedEs.rental.flexDepositAmount)
  const [flexDepositRatePerDay, setFlexDepositRatePerDay] = useState<number>(initialResolvedEs.rental.flexDepositRatePerDay)
  const [secondDriverRatePerDay, setSecondDriverRatePerDay] = useState<number>(initialResolvedEs.rental.secondDriverRatePerDay)

  const draftStorageKey = `camper_editor_draft_${mode}_${camper?.id || 'new'}`

  // Estado por idioma (ES, EN, FR, DE) con recuperación de borrador local
  const [localeData, setLocaleData] = useState<Record<CamperLocaleCode, LocaleEditableState>>(() => {
    const initial: Record<CamperLocaleCode, LocaleEditableState> = {
      es: buildInitialLocaleState(fallbackCamper, 'es'),
      en: buildInitialLocaleState(fallbackCamper, 'en'),
      fr: buildInitialLocaleState(fallbackCamper, 'fr'),
      de: buildInitialLocaleState(fallbackCamper, 'de'),
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(draftStorageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.es && parsed.en && parsed.fr && parsed.de) {
            return parsed
          }
        }
      } catch {
        // Ignorar borrador corrupto
      }
    }
    return initial
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(localeData))
    } catch {
      // Ignorar si localStorage está lleno
    }
  }, [draftStorageKey, localeData])

  const currentLoc = localeData[activeLocale]

  const updateCurrentLocale = (updater: (prev: LocaleEditableState) => LocaleEditableState) => {
    setLocaleData(prev => ({
      ...prev,
      [activeLocale]: updater(prev[activeLocale]),
    }))
  }

  const updateAllLocales = (updater: (prev: LocaleEditableState, code: CamperLocaleCode) => LocaleEditableState) => {
    setLocaleData(prev => ({
      es: updater(prev.es, 'es'),
      en: updater(prev.en, 'en'),
      fr: updater(prev.fr, 'fr'),
      de: updater(prev.de, 'de'),
    }))
  }

  // Helpers sincronizados para el idioma activo
  const tagline = currentLoc.tagline
  const setTagline = (val: string) => updateCurrentLocale(p => ({ ...p, tagline: val }))

  const summarySpecs = currentLoc.summarySpecs
  const setSummarySpecs = (updater: (prev: CamperCardSummarySpec[]) => CamperCardSummarySpec[]) =>
    updateCurrentLocale(p => ({ ...p, summarySpecs: updater(p.summarySpecs) }))

  const pills = currentLoc.pills
  const setPills = (updater: (prev: CamperCardPill[]) => CamperCardPill[]) =>
    updateCurrentLocale(p => ({ ...p, pills: updater(p.pills) }))

  const wizardHighlights = currentLoc.wizardHighlights
  const setWizardHighlights = (updater: (prev: string[]) => string[]) =>
    updateCurrentLocale(p => ({ ...p, wizardHighlights: updater(p.wizardHighlights) }))

  const galleryItems: CamperGalleryItem[] = gallerySrcs.map((src, idx) => ({
    src,
    tag: currentLoc.galleryTags[idx] ?? `${name || 'Camper'} — Foto ${idx + 1}`,
  }))

  const inlineDescImageAlt = currentLoc.inlineDescImageAlt
  const setInlineDescImageAlt = (val: string) => updateCurrentLocale(p => ({ ...p, inlineDescImageAlt: val }))

  const descriptionText = currentLoc.descriptionText
  const setDescriptionText = (val: string) => updateCurrentLocale(p => ({ ...p, descriptionText: val }))
  const descriptionParagraphs = splitDescriptionParagraphs(descriptionText)

  const features = currentLoc.features
  const setFeatures = (updater: (prev: CamperFeatureItem[]) => CamperFeatureItem[]) =>
    updateCurrentLocale(p => ({ ...p, features: updater(p.features) }))

  const technicalFeatures = currentLoc.technicalFeatures
  const setTechnicalFeatures = (updater: (prev: CamperFeatureItem[]) => CamperFeatureItem[]) =>
    updateCurrentLocale(p => ({ ...p, technicalFeatures: updater(p.technicalFeatures) }))

  const includedItems = currentLoc.includedItems
  const setIncludedItems = (updater: (prev: string[]) => string[]) =>
    updateCurrentLocale(p => ({ ...p, includedItems: updater(p.includedItems) }))

  const getDragItemProps = (
    listKey: string,
    index: number,
    onReorder: (fromIndex: number, toIndex: number) => void
  ) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', `${listKey}:${index}`)
      setDragState({ listKey, fromIndex: index, overIndex: index })
    },
    onDragOver: (e: React.DragEvent) => {
      if (!dragState || dragState.listKey !== listKey) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (dragState.overIndex !== index) {
        setDragState(prev => (prev ? { ...prev, overIndex: index } : null))
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (!dragState || dragState.listKey !== listKey) return
      e.preventDefault()
      onReorder(dragState.fromIndex, index)
      setDragState(null)
    },
    onDragEnd: () => setDragState(null),
  })

  const getDragItemClass = (listKey: string, index: number) => {
    if (!dragState || dragState.listKey !== listKey) return ''
    const classes: string[] = []
    if (dragState.fromIndex === index) classes.push('ced-dnd--dragging')
    if (dragState.overIndex === index && dragState.fromIndex !== index) classes.push('ced-dnd--over')
    return classes.join(' ')
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (mode === 'create') {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      setSlug(autoSlug)
    }
  }

  // Traducción automática local desde Español hacia EN / FR / DE (sin API externa)
  const buildEsTranslatableSource = () => {
    const esSource = localeData.es
    return {
      tagline: esSource.tagline,
      summarySpecs: esSource.summarySpecs,
      pills: esSource.pills,
      wizardHighlights: esSource.wizardHighlights,
      galleryTags: gallerySrcs.map((_, idx) => esSource.galleryTags[idx] || `${name || 'Camper'} — Foto ${idx + 1}`),
      inlineDescImageAlt: esSource.inlineDescImageAlt,
      descriptionText: esSource.descriptionText,
      features: esSource.features,
      technicalFeatures: esSource.technicalFeatures,
      includedItems: esSource.includedItems,
    }
  }

  const translateViaServer = async (
    source: ReturnType<typeof buildEsTranslatableSource>,
    targetLocale: TranslatableLocale
  ) => {
    try {
      const res = await fetch('/api/admin/campers/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLocale, content: source }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.translated) return data.translated
      }
    } catch {
      // Fallback local si falla la petición al endpoint
    }
    return translateCamperContent(source, targetLocale)
  }

  const handleAutoTranslate = async () => {
    if (activeLocale === 'es' || isTranslating) return
    setIsTranslating(true)
    setFormError('')

    try {
      const source = buildEsTranslatableSource()
      const translated = await translateViaServer(source, activeLocale as TranslatableLocale)

      setLocaleData(prev => ({
        ...prev,
        [activeLocale]: translated,
      }))

      const langLabel = LOCALE_META.find(l => l.code === activeLocale)?.label || activeLocale.toUpperCase()
      onToast('success', `Traducción a ${langLabel} completada.`)
    } catch (err: any) {
      onToast('error', err?.message || 'Error al traducir automáticamente')
    } finally {
      setIsTranslating(false)
    }
  }

  const handleTranslateAllFromEs = async () => {
    if (isTranslating) return
    setIsTranslating(true)
    setFormError('')

    try {
      const source = buildEsTranslatableSource()
      const targets: TranslatableLocale[] = ['en', 'fr', 'de']
      const results = await Promise.all(targets.map(loc => translateViaServer(source, loc)))

      setLocaleData(prev => ({
        ...prev,
        en: results[0],
        fr: results[1],
        de: results[2],
      }))

      onToast('success', 'Todos los idiomas (EN, FR, DE) traducidos desde Español.')
    } catch (err: any) {
      onToast('error', err?.message || 'Error al traducir idiomas')
    } finally {
      setIsTranslating(false)
    }
  }

  const triggerUpload = (target: UploadTarget) => {
    pendingUploadTargetRef.current = target
    fileInputRef.current?.click()
  }

  const uploadImageFile = async (file: File, target: UploadTarget, insertIndex?: number) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('La imagen no puede superar los 5 MB')
      return
    }

    setUploadingTarget(target)
    setFormError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slug', slug || 'camper')

      const res = await fetch('/api/admin/campers/upload-image', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir la imagen')
      }

      const uploadedUrl = data.url as string
      if (target === 'thumbnail') {
        setThumbnailUrl(uploadedUrl)
        if (!gallerySrcs.includes(uploadedUrl)) {
          setGallerySrcs(prev => [uploadedUrl, ...prev])
          updateAllLocales(loc => ({
            ...loc,
            galleryTags: [`${name || 'Camper'} — Portada`, ...loc.galleryTags],
          }))
        }
      } else if (target === 'gallery') {
        const idxToInsert =
          typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= gallerySrcs.length
            ? insertIndex
            : gallerySrcs.length

        setGallerySrcs(prev => {
          const next = [...prev]
          next.splice(idxToInsert, 0, uploadedUrl)
          return next
        })
        updateAllLocales(loc => {
          const nextTags = [...loc.galleryTags]
          nextTags.splice(idxToInsert, 0, `${name || 'Camper'} — Foto ${idxToInsert + 1}`)
          return { ...loc, galleryTags: nextTags }
        })
        if (!thumbnailUrl) setThumbnailUrl(uploadedUrl)
      } else if (target === 'floorplan_day') {
        setFloorplanDay(uploadedUrl)
      } else if (target === 'floorplan_night') {
        setFloorplanNight(uploadedUrl)
      } else if (target === 'inline_desc') {
        setInlineDescImageSrc(uploadedUrl)
      }

      onToast('success', 'Imagen subida correctamente.')
    } catch (err: any) {
      setFormError(err.message || 'Error al subir imagen')
      onToast('error', err.message || 'Error al subir imagen')
    } finally {
      setUploadingTarget(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadImageFile(file, pendingUploadTargetRef.current)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasDraggedFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types || []).includes('Files')

  const getFileDropProps = (target: UploadTarget, dropKey: string, insertIndex?: number) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!hasDraggedFiles(e)) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
      if (fileDropTarget !== dropKey) setFileDropTarget(dropKey)
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasDraggedFiles(e)) return
      e.stopPropagation()
      if (fileDropTarget === dropKey) setFileDropTarget(null)
    },
    onDrop: async (e: React.DragEvent) => {
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
      if (files.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      setFileDropTarget(null)

      if (target === 'gallery') {
        for (let i = 0; i < files.length; i++) {
          const idx = typeof insertIndex === 'number' ? insertIndex + i : undefined
          await uploadImageFile(files[i], 'gallery', idx)
        }
      } else {
        await uploadImageFile(files[0], target)
      }
    },
  })

  const handleAddGalleryUrl = () => {
    const clean = galleryUrlInput.trim()
    if (!clean) return
    setGallerySrcs(prev => [...prev, clean])
    updateAllLocales(loc => ({
      ...loc,
      galleryTags: [...loc.galleryTags, `${name || 'Camper'} — Foto ${gallerySrcs.length + 1}`],
    }))
    if (!thumbnailUrl) setThumbnailUrl(clean)
    setGalleryUrlInput('')
  }

  const reorderGallery = (fromIdx: number, toIdx: number) => {
    setGallerySrcs(prev => reorderItem(prev, fromIdx, toIdx))
    updateAllLocales(loc => ({
      ...loc,
      galleryTags: reorderItem(loc.galleryTags, fromIdx, toIdx),
    }))
  }

  const moveGallery = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta
    if (nextIdx < 0 || nextIdx >= gallerySrcs.length) return
    reorderGallery(idx, nextIdx)
  }

  const removeGalleryAt = (idx: number) => {
    setGallerySrcs(prev => prev.filter((_, i) => i !== idx))
    updateAllLocales(loc => ({
      ...loc,
      galleryTags: loc.galleryTags.filter((_, i) => i !== idx),
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('El nombre de la camper es obligatorio.')
      setActiveTab('summary')
      return
    }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug.trim())) {
      setFormError('El slug solo puede contener letras minúsculas, números y guiones.')
      setActiveTab('summary')
      return
    }
    if (pricePerNight < 0 || standardDepositAmount < 0 || flexDepositAmount < 0 || flexDepositRatePerDay < 0) {
      setFormError('Los importes de tarifa y fianza no pueden ser negativos.')
      setActiveTab('rental')
      return
    }

    setIsSaving(true)

    try {
      const url = mode === 'create' ? '/api/admin/campers' : `/api/admin/campers/${camper.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const esData = localeData.es
      const cleanedParagraphsEs = splitDescriptionParagraphs(esData.descriptionText)
      const cleanedSummarySpecsEs = esData.summarySpecs
        .map(s => ({ icon: s.icon || 'zap', text: s.text.trim(), wide: Boolean(s.wide) }))
        .filter(s => s.text.length > 0)
      const cleanedPillsEs = esData.pills
        .map(p => ({ icon: p.icon || 'zap', label: p.label.trim() }))
        .filter(p => p.label.length > 0)
      const cleanedHighlightsEs = esData.wizardHighlights.map(h => h.trim()).filter(Boolean)
      const cleanedFeaturesEs = esData.features
        .map(f => ({ icon: f.icon || 'zap', label: f.label.trim(), value: f.value.trim() }))
        .filter(f => f.label.length > 0)
      const cleanedTechFeaturesEs = esData.technicalFeatures
        .map(f => ({ icon: f.icon || 'gauge', label: f.label.trim(), value: f.value.trim() }))
        .filter(f => f.label.length > 0)
      const cleanedIncludedEs = esData.includedItems.map(i => i.trim()).filter(Boolean)

      const cleanedGalleryEs = gallerySrcs
        .map((src, idx) => ({
          src: src.trim(),
          tag: (esData.galleryTags[idx] || `${name.trim()} — Foto ${idx + 1}`).trim(),
        }))
        .filter(g => g.src.length > 0)

      const cleanImagesList = Array.from(
        new Set([thumbnailUrl.trim(), ...cleanedGalleryEs.map(g => g.src)].filter(Boolean))
      )

      const translationsPayload: Record<string, any> = {}
      for (const code of CAMPER_SUPPORTED_LOCALES) {
        const loc = localeData[code]
        translationsPayload[code] = {
          tagline: loc.tagline.trim(),
          summarySpecs: loc.summarySpecs
            .map(s => ({ icon: s.icon || 'zap', text: s.text.trim(), wide: Boolean(s.wide) }))
            .filter(s => s.text.length > 0),
          pills: loc.pills
            .map(p => ({ icon: p.icon || 'zap', label: p.label.trim() }))
            .filter(p => p.label.length > 0),
          wizardHighlights: loc.wizardHighlights.map(h => h.trim()).filter(Boolean),
          galleryTags: gallerySrcs.map((_, idx) => (loc.galleryTags[idx] || '').trim()),
          inlineDescImageAlt: loc.inlineDescImageAlt.trim(),
          description: loc.descriptionText.trim(),
          descriptionParagraphs: splitDescriptionParagraphs(loc.descriptionText),
          features: loc.features
            .map(f => ({ icon: f.icon || 'zap', label: f.label.trim(), value: f.value.trim() }))
            .filter(f => f.label.length > 0),
          technicalFeatures: loc.technicalFeatures
            .map(f => ({ icon: f.icon || 'gauge', label: f.label.trim(), value: f.value.trim() }))
            .filter(f => f.label.length > 0),
          included: loc.includedItems.map(i => i.trim()).filter(Boolean),
        }
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description_es: cleanedParagraphsEs.join('\n\n'),
        description_en: splitDescriptionParagraphs(localeData.en.descriptionText).join('\n\n'),
        base_price_per_night: Number(pricePerNight),
        deposit_amount: Number(standardDepositAmount),
        is_active: isActive,
        is_available: isAvailable,
        thumbnail_url: thumbnailUrl.trim() || cleanImagesList[0] || '/images/campers/neo/neo-ext.png',
        images: cleanImagesList,
        specs: {
          ...initialSpecs,
          ...techSpecs,
          seats: Number(seats),
          beds: Number(beds),
          card: {
            tagline: esData.tagline.trim(),
            summarySpecs: cleanedSummarySpecsEs,
            pills: cleanedPillsEs,
            wizardHighlights: cleanedHighlightsEs,
          },
          gallery_items: cleanedGalleryEs,
          floorplan_day: floorplanDay.trim(),
          floorplan_night: floorplanNight.trim(),
          description_inline_image: {
            src: inlineDescImageSrc.trim(),
            alt: esData.inlineDescImageAlt.trim() || `Interior ${name.trim()}`,
          },
          description_paragraphs: cleanedParagraphsEs,
          features: cleanedFeaturesEs,
          technical_features: cleanedTechFeaturesEs,
          rental: {
            standard_deposit_amount: Number(standardDepositAmount),
            flex_deposit_amount: Number(flexDepositAmount),
            flex_deposit_rate_per_day: Number(flexDepositRatePerDay),
            second_driver_rate_per_day: Number(secondDriverRatePerDay),
            included: cleanedIncludedEs,
          },
          translations: translationsPayload,
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

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(draftStorageKey)
        } catch {
          // Ignorar
        }
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

        {/* Cabecera con Selector de Idioma y Traducción Automática */}
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

          <div className="ced-header__right">
            {/* Selector de idiomas arriba + icono mundo para traducir todos desde ES */}
            <div className="ced-lang-bar" role="group" aria-label="Idioma de edición">
              <button
                type="button"
                onClick={handleTranslateAllFromEs}
                disabled={isTranslating}
                className="ced-lang-globe-btn"
                title="Traducir todos los idiomas (EN, FR, DE) desde Español"
                aria-label="Traducir todos los idiomas desde Español"
              >
                {isTranslating ? <Loader2 size={14} className="ced-spin" /> : <Globe size={14} />}
              </button>
              {LOCALE_META.map(loc => {
                const isSelected = activeLocale === loc.code
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => setActiveLocale(loc.code)}
                    className={`ced-lang-btn ${isSelected ? 'ced-lang-btn--active' : ''}`}
                    title={`Editar contenido en ${loc.label}`}
                  >
                    <span>{loc.short}</span>
                    <span className="ced-lang-btn__full">{loc.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Botón de traducción automática para idiomas != español */}
            {activeLocale !== 'es' && (
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating}
                className="ced-translate-btn"
                title="Traducir todas las pestañas desde el Español automáticamente"
              >
                {isTranslating ? <Loader2 size={14} className="ced-spin" /> : <Languages size={14} />}
                <span>Traducir desde ES</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => !isSaving && onClose()}
              className="ced-close-btn"
              disabled={isSaving}
              aria-label="Cerrar editor"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Barra de 6 pestañas + conmutador móvil Editar/Preview */}
        <div className="ced-tabs-bar">
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

          <div className="ced-pane-switch" role="group" aria-label="Cambiar vista en pantalla pequeña">
            <button
              type="button"
              className={`ced-pane-btn ${mobilePane === 'edit' ? 'ced-pane-btn--active' : ''}`}
              onClick={() => setMobilePane('edit')}
            >
              <Pencil size={13} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              className={`ced-pane-btn ${mobilePane === 'preview' ? 'ced-pane-btn--active' : ''}`}
              onClick={() => setMobilePane('preview')}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Formulario: mitad izquierda edición, mitad derecha preview */}
        <form onSubmit={handleSave} className="ced-form">
          <div className="ced-workspace">
            <div className={`ced-body ${mobilePane === 'preview' ? 'ced-pane-hidden-mobile' : ''}`}>
              {formError && (
                <div className="ced-alert-error" role="alert">
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {activeLocale !== 'es' && (
                <div className="ced-locale-banner">
                  <div>
                    <strong>Editando versión en {LOCALE_META.find(l => l.code === activeLocale)?.label} ({activeLocale.toUpperCase()})</strong>
                    <p>Las pestañas muestran los textos de este idioma. Puedes editarlos manualmente o traducir todo desde el español con un clic.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoTranslate}
                    disabled={isTranslating}
                    className="adm-btn adm-btn--sm adm-btn--primary"
                  >
                    {isTranslating ? <Loader2 size={13} className="ced-spin" /> : <Languages size={13} />}
                    <span>Traducir automáticamente</span>
                  </button>
                </div>
              )}

              {/* ── TAB 1: TARJETA RESUMEN ── */}
              {activeTab === 'summary' && (
                <div className="ced-tab-panel">
                  <div className="ced-grid-2">
                    <div className="ced-field">
                      <label htmlFor="ced-name" className="ced-label">Nombre del modelo *</label>
                      <input
                        id="ced-name"
                        type="text"
                        required
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder="Ej. NEO"
                        className="ced-input"
                      />
                    </div>
                    <div className="ced-field">
                      <label htmlFor="ced-slug" className="ced-label">Identificador URL (Slug) *</label>
                      <input
                        id="ced-slug"
                        type="text"
                        required
                        value={slug}
                        onChange={e => setSlug(e.target.value.toLowerCase())}
                        placeholder="Ej. neo"
                        className="ced-input ced-input--mono"
                      />
                    </div>
                  </div>

                  <div className="ced-field">
                    <label htmlFor="ced-tagline" className="ced-label">
                      Subtítulo / Eslogan de la Camper Card ({activeLocale.toUpperCase()})
                    </label>
                    <input
                      id="ced-tagline"
                      type="text"
                      value={tagline}
                      onChange={e => setTagline(e.target.value)}
                      placeholder="La camper perfecta para quienes buscan equilibrio entre confort, autonomía y libertad."
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
                        <h4 className="ced-box__title">Chips de la Tarjeta Resumen ({activeLocale.toUpperCase()})</h4>
                        <p className="ced-box__hint">Pulsa el icono para cambiarlo, arrastra o usa las flechas para ordenar.</p>
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
                        <div
                          key={idx}
                          className={`ced-row-item ${getDragItemClass('summarySpecs', idx)}`}
                          {...getDragItemProps('summarySpecs', idx, (from, to) =>
                            setSummarySpecs(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
                          <CompactIconPicker
                            ariaLabel={`Icono chip ${idx + 1}`}
                            value={spec.icon}
                            options={CARD_SPEC_ICON_OPTIONS}
                            onChange={nextIcon =>
                              setSummarySpecs(prev => prev.map((it, i) => (i === idx ? { ...it, icon: nextIcon } : it)))
                            }
                          />
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
                        <h4 className="ced-box__title">Píldoras de Cabecera ({activeLocale.toUpperCase()})</h4>
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
                        <div
                          key={idx}
                          className={`ced-row-item ${getDragItemClass('pills', idx)}`}
                          {...getDragItemProps('pills', idx, (from, to) =>
                            setPills(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
                          <CompactIconPicker
                            ariaLabel={`Icono píldora ${idx + 1}`}
                            value={pill.icon}
                            options={FEATURE_ICON_OPTIONS}
                            onChange={nextIcon =>
                              setPills(prev => prev.map((it, i) => (i === idx ? { ...it, icon: nextIcon } : it)))
                            }
                          />
                          <input
                            type="text"
                            value={pill.label}
                            onChange={e => setPills(prev => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))}
                            placeholder="Ej. Sistema eléctrico Pro 540Ah"
                            className="ced-input ced-flex-1"
                          />
                          <div className="ced-row-actions">
                            <button type="button" className="ced-icon-btn" onClick={() => setPills(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                              <ArrowUp size={13} />
                            </button>
                            <button type="button" className="ced-icon-btn" onClick={() => setPills(prev => moveItem(prev, idx, 1))} disabled={idx === pills.length - 1} aria-label="Bajar">
                              <ArrowDown size={13} />
                            </button>
                            <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setPills(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar píldora">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destacados del Paso 2 del asistente */}
                  <div className="ced-box">
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">Destacados en el Asistente de Reserva (Paso 2 · {activeLocale.toUpperCase()})</h4>
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
                        <div
                          key={idx}
                          className={`ced-row-item ${getDragItemClass('wizardHighlights', idx)}`}
                          {...getDragItemProps('wizardHighlights', idx, (from, to) =>
                            setWizardHighlights(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
                          <input
                            type="text"
                            value={hl}
                            onChange={e => setWizardHighlights(prev => prev.map((it, i) => (i === idx ? e.target.value : it)))}
                            placeholder="Ej. Sistema eléctrico Pro 540Ah + A/C 12V Dometic"
                            className="ced-input ced-flex-1"
                          />
                          <div className="ced-row-actions">
                            <button type="button" className="ced-icon-btn" onClick={() => setWizardHighlights(prev => moveItem(prev, idx, -1))} disabled={idx === 0} aria-label="Subir">
                              <ArrowUp size={13} />
                            </button>
                            <button type="button" className="ced-icon-btn" onClick={() => setWizardHighlights(prev => moveItem(prev, idx, 1))} disabled={idx === wizardHighlights.length - 1} aria-label="Bajar">
                              <ArrowDown size={13} />
                            </button>
                            <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => setWizardHighlights(prev => prev.filter((_, i) => i !== idx))} aria-label="Eliminar destacado">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: FOTOS ── */}
              {activeTab === 'photos' && (
                <div className="ced-tab-panel">
                  <div
                    className={`ced-box ${fileDropTarget === 'thumbnail' ? 'ced-dropzone--active' : ''}`}
                    {...getFileDropProps('thumbnail', 'thumbnail')}
                  >
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">Foto Principal / Portada de la Tarjeta</h4>
                        <p className="ced-box__hint">Imagen principal en la Camper Card. Arrastra una imagen aquí o pulsa «Subir portada».</p>
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
                  <div
                    className={`ced-box ${fileDropTarget === 'gallery' ? 'ced-dropzone--active' : ''}`}
                    {...getFileDropProps('gallery', 'gallery')}
                  >
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">Galería de Fotos ({galleryItems.length}) · Etiquetas en {activeLocale.toUpperCase()}</h4>
                        <p className="ced-box__hint">Arrastra fotos desde tu PC sobre cualquier posición para añadirlas ahí, o reordena con el icono o las flechas.</p>
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
                        const itemDropKey = `gallery-${idx}`
                        const itemDropProps = getFileDropProps('gallery', itemDropKey, idx)
                        const reorderProps = getDragItemProps('galleryItems', idx, (from, to) => reorderGallery(from, to))
                        return (
                          <div
                            key={`${item.src}-${idx}`}
                            className={`ced-gallery-item ${isCover ? 'ced-gallery-item--cover' : ''} ${getDragItemClass('galleryItems', idx)} ${fileDropTarget === itemDropKey ? 'ced-dropzone--active' : ''}`}
                            draggable={reorderProps.draggable}
                            onDragStart={reorderProps.onDragStart}
                            onDragEnd={reorderProps.onDragEnd}
                            onDragOver={e => {
                              if (hasDraggedFiles(e)) {
                                itemDropProps.onDragOver(e)
                              } else {
                                reorderProps.onDragOver(e)
                              }
                            }}
                            onDragLeave={itemDropProps.onDragLeave}
                            onDrop={e => {
                              if (e.dataTransfer?.files?.length) {
                                itemDropProps.onDrop(e)
                              } else {
                                reorderProps.onDrop(e)
                              }
                            }}
                          >
                            <div className="ced-gallery-item__thumb">
                              <span className="ced-drag-handle ced-drag-handle--badge" aria-hidden="true" title="Arrastrar para reordenar">
                                <GripVertical size={13} />
                              </span>
                              <Image src={item.src} alt={item.tag || `Foto ${idx + 1}`} fill sizes="100px" className="ced-img-cover" />
                            </div>
                            <div className="ced-gallery-item__fields">
                              <input
                                type="text"
                                value={item.tag}
                                onChange={e => {
                                  const val = e.target.value
                                  updateCurrentLocale(loc => {
                                    const nextTags = [...loc.galleryTags]
                                    while (nextTags.length <= idx) nextTags.push('')
                                    nextTags[idx] = val
                                    return { ...loc, galleryTags: nextTags }
                                  })
                                }}
                                placeholder={`Título o etiqueta de la foto (${activeLocale.toUpperCase()})`}
                                className="ced-input"
                              />
                              <input
                                type="text"
                                value={item.src}
                                onChange={e => {
                                  const val = e.target.value
                                  setGallerySrcs(prev => prev.map((s, i) => (i === idx ? val : s)))
                                }}
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
                                <button type="button" className="ced-icon-btn" onClick={() => moveGallery(idx, -1)} disabled={idx === 0} aria-label="Mover antes">
                                  <ArrowUp size={13} />
                                </button>
                                <button type="button" className="ced-icon-btn" onClick={() => moveGallery(idx, 1)} disabled={idx === galleryItems.length - 1} aria-label="Mover después">
                                  <ArrowDown size={13} />
                                </button>
                                <button type="button" className="ced-icon-btn ced-icon-btn--danger" onClick={() => removeGalleryAt(idx)} aria-label="Eliminar foto">
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
                      <button type="button" onClick={handleAddGalleryUrl} className="adm-btn adm-btn--sm">
                        <Plus size={14} /> Añadir URL
                      </button>
                    </div>
                  </div>

                  {/* Planos y foto de descripción */}
                  <div className="ced-box">
                    <h4 className="ced-box__title">Planos de Distribución e Imagen Editorial</h4>
                    <div className="ced-grid-2">
                      <div
                        className={`ced-field ${fileDropTarget === 'floorplan_day' ? 'ced-dropzone--active' : ''}`}
                        {...getFileDropProps('floorplan_day', 'floorplan_day')}
                      >
                        <label className="ced-label">Plano cenital / Día</label>
                        <div className="ced-row-item">
                          <input
                            type="text"
                            value={floorplanDay}
                            onChange={e => setFloorplanDay(e.target.value)}
                            className="ced-input ced-flex-1"
                          />
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('floorplan_day')}>
                            <Upload size={13} />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`ced-field ${fileDropTarget === 'floorplan_night' ? 'ced-dropzone--active' : ''}`}
                        {...getFileDropProps('floorplan_night', 'floorplan_night')}
                      >
                        <label className="ced-label">Plano lateral / Noche</label>
                        <div className="ced-row-item">
                          <input
                            type="text"
                            value={floorplanNight}
                            onChange={e => setFloorplanNight(e.target.value)}
                            className="ced-input ced-flex-1"
                          />
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('floorplan_night')}>
                            <Upload size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="ced-grid-2">
                      <div
                        className={`ced-field ${fileDropTarget === 'inline_desc' ? 'ced-dropzone--active' : ''}`}
                        {...getFileDropProps('inline_desc', 'inline_desc')}
                      >
                        <label className="ced-label">Imagen dentro de Descripción</label>
                        <div className="ced-row-item">
                          <input
                            type="text"
                            value={inlineDescImageSrc}
                            onChange={e => setInlineDescImageSrc(e.target.value)}
                            className="ced-input ced-flex-1"
                          />
                          <button type="button" className="adm-btn adm-btn--sm" onClick={() => triggerUpload('inline_desc')}>
                            <Upload size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Texto alternativo imagen editorial ({activeLocale.toUpperCase()})</label>
                        <input
                          type="text"
                          value={inlineDescImageAlt}
                          onChange={e => setInlineDescImageAlt(e.target.value)}
                          placeholder="Ej. Salón panorámico con luz natural"
                          className="ced-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: DESCRIPCIÓN (UN SOLO RECUADRO GRANDE) ── */}
              {activeTab === 'description' && (
                <div className="ced-tab-panel">
                  <div className="ced-box">
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">Descripción de la Camper ({activeLocale.toUpperCase()})</h4>
                        <p className="ced-box__hint">
                          Escribe el texto completo en este recuadro. Separa cada párrafo con un salto de línea (Enter) y la vista previa lo formateará igual que en la web pública.
                        </p>
                      </div>
                    </div>

                    <textarea
                      id="ced-description-single"
                      rows={13}
                      value={descriptionText}
                      onChange={e => setDescriptionText(e.target.value)}
                      placeholder="Escribe aquí la descripción completa de la camper..."
                      className="ced-input ced-textarea-large"
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
                        <h4 className="ced-box__title">Características y Equipamiento ({features.length}) · {activeLocale.toUpperCase()}</h4>
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
                        <div
                          key={idx}
                          className={`ced-feature-row ${getDragItemClass('features', idx)}`}
                          {...getDragItemProps('features', idx, (from, to) =>
                            setFeatures(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
                          <CompactIconPicker
                            ariaLabel={`Icono equipamiento ${idx + 1}`}
                            value={feat.icon}
                            options={FEATURE_ICON_OPTIONS}
                            onChange={nextIcon =>
                              setFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, icon: nextIcon } : it)))
                            }
                          />
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
                    </div>

                    <div className="ced-grid-3">
                      <div className="ced-field">
                        <label className="ced-label">Motor</label>
                        <input type="text" value={techSpecs.engine} onChange={e => setTechSpecs(p => ({ ...p, engine: e.target.value }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Transmisión</label>
                        <input type="text" value={techSpecs.transmission} onChange={e => setTechSpecs(p => ({ ...p, transmission: e.target.value }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Climatización</label>
                        <input type="text" value={techSpecs.ac} onChange={e => setTechSpecs(p => ({ ...p, ac: e.target.value }))} className="ced-input" />
                      </div>
                    </div>

                    <div className="ced-grid-4">
                      <div className="ced-field">
                        <label className="ced-label">Largo (m)</label>
                        <input type="number" step="0.01" value={techSpecs.length_m} onChange={e => setTechSpecs(p => ({ ...p, length_m: parseFloat(e.target.value) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Ancho (m)</label>
                        <input type="number" step="0.01" value={techSpecs.width_m} onChange={e => setTechSpecs(p => ({ ...p, width_m: parseFloat(e.target.value) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Alto (m)</label>
                        <input type="number" step="0.01" value={techSpecs.height_m} onChange={e => setTechSpecs(p => ({ ...p, height_m: parseFloat(e.target.value) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Maletero (L)</label>
                        <input type="number" value={techSpecs.storage_liters} onChange={e => setTechSpecs(p => ({ ...p, storage_liters: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                      </div>
                    </div>

                    <div className="ced-grid-4">
                      <div className="ced-field">
                        <label className="ced-label">Batería Litio (Ah)</label>
                        <input type="number" value={techSpecs.battery_ah} onChange={e => setTechSpecs(p => ({ ...p, battery_ah: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Placas Solares (W)</label>
                        <input type="number" value={techSpecs.solar_w} onChange={e => setTechSpecs(p => ({ ...p, solar_w: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Aguas Limpias (L)</label>
                        <input type="number" value={techSpecs.fresh_water_l} onChange={e => setTechSpecs(p => ({ ...p, fresh_water_l: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                      </div>
                      <div className="ced-field">
                        <label className="ced-label">Aguas Grises (L)</label>
                        <input type="number" value={techSpecs.grey_water_l} onChange={e => setTechSpecs(p => ({ ...p, grey_water_l: parseInt(e.target.value, 10) || 0 }))} className="ced-input" />
                      </div>
                    </div>
                  </div>

                  <div className="ced-box">
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">Tarjetas de Características Técnicas ({technicalFeatures.length}) · {activeLocale.toUpperCase()}</h4>
                        <p className="ced-box__hint">Sección «CARACTERÍSTICAS TÉCNICAS» en la ficha pública de la camper.</p>
                      </div>
                      <button
                        type="button"
                        className="adm-btn adm-btn--sm"
                        onClick={() => setTechnicalFeatures(prev => [...prev, { icon: 'gauge', label: '', value: '' }])}
                      >
                        <Plus size={14} /> Añadir tarjeta técnica
                      </button>
                    </div>

                    <div className="ced-list">
                      {technicalFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          className={`ced-feature-row ${getDragItemClass('technicalFeatures', idx)}`}
                          {...getDragItemProps('technicalFeatures', idx, (from, to) =>
                            setTechnicalFeatures(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
                          <CompactIconPicker
                            ariaLabel={`Icono técnico ${idx + 1}`}
                            value={feat.icon}
                            options={FEATURE_ICON_OPTIONS}
                            onChange={nextIcon =>
                              setTechnicalFeatures(prev => prev.map((it, i) => (i === idx ? { ...it, icon: nextIcon } : it)))
                            }
                          />
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
                      <span>
                        <strong>Flex:</strong> Fianza {formatDepositEuros(flexDepositAmount)} (+{flexDepositRatePerDay} €/día · 2º conductor incluido)
                      </span>
                    </div>
                  </div>

                  {/* Qué incluye el alquiler */}
                  <div className="ced-box">
                    <div className="ced-box__head">
                      <div>
                        <h4 className="ced-box__title">¿Qué incluye el alquiler? ({includedItems.length}) · {activeLocale.toUpperCase()}</h4>
                        <p className="ced-box__hint">Lista de elementos mostrados en la sección «¿QUÉ INCLUYE EL ALQUILER?» de la ficha pública.</p>
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
                        <div
                          key={idx}
                          className={`ced-row-item ${getDragItemClass('includedItems', idx)}`}
                          {...getDragItemProps('includedItems', idx, (from, to) =>
                            setIncludedItems(prev => reorderItem(prev, from, to))
                          )}
                        >
                          <span className="ced-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">
                            <GripVertical size={14} />
                          </span>
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

            <div className={`ced-preview-pane ${mobilePane === 'edit' ? 'ced-pane-hidden-mobile' : ''}`}>
              <CamperEditorPreview
                activeTab={activeTab}
                activeLocale={activeLocale}
                camperId={camper?.id || 'preview'}
                name={name}
                slug={slug}
                isAvailable={isAvailable}
                tagline={tagline}
                seats={seats}
                beds={beds}
                summarySpecs={summarySpecs}
                pills={pills}
                wizardHighlights={wizardHighlights}
                thumbnailUrl={thumbnailUrl}
                galleryItems={galleryItems}
                floorplanDay={floorplanDay}
                floorplanNight={floorplanNight}
                inlineDescImageSrc={inlineDescImageSrc}
                inlineDescImageAlt={inlineDescImageAlt}
                descriptionParagraphs={descriptionParagraphs}
                features={features}
                techSpecs={{
                  length: `${techSpecs.length_m} m`,
                  width: `${techSpecs.width_m} m`,
                  height: `${techSpecs.height_m} m`,
                  engine: techSpecs.engine,
                  consumption: '8.5 L/100km',
                  license: 'B (Coche)',
                  waterTank: `${techSpecs.fresh_water_l} L`,
                  greyWater: `${techSpecs.grey_water_l} L`,
                  battery: `${techSpecs.battery_ah} Ah`,
                  heating: 'Webasto Diésel',
                  fridge: '86 L',
                  gas: 'GLP',
                }}
                technicalFeatures={technicalFeatures}
                pricePerNight={pricePerNight}
                standardDepositAmount={standardDepositAmount}
                flexDepositAmount={flexDepositAmount}
                flexDepositRatePerDay={flexDepositRatePerDay}
                secondDriverRatePerDay={secondDriverRatePerDay}
                includedItems={includedItems}
              />
            </div>
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
          max-width: 1380px;
          height: 92vh;
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
          padding: 14px 22px;
          border-bottom: 1px solid var(--adm-border);
          background: var(--adm-surface-2);
          flex-shrink: 0;
          flex-wrap: wrap;
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
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--adm-text);
        }
        .ced-header__sub {
          margin: 2px 0 0;
          font-size: 0.76rem;
          color: var(--adm-text-2);
        }
        .ced-header__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Selector de Idiomas en Cabecera */
        .ced-lang-bar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border-strong);
        }
        .ced-lang-globe-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: none;
          background: var(--adm-gold-soft);
          color: var(--adm-gold);
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .ced-lang-globe-btn:hover:not(:disabled) {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
        }
        .ced-lang-globe-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ced-lang-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: var(--adm-text-2);
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.14s ease;
        }
        .ced-lang-btn:hover {
          color: var(--adm-text);
          background: var(--adm-surface-2);
        }
        .ced-lang-btn--active {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
        }
        .ced-lang-btn__full {
          font-weight: 500;
          opacity: 0.85;
        }

        .ced-translate-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 9px;
          border: 1px solid rgba(217, 119, 6, 0.45);
          background: var(--adm-gold-soft);
          color: var(--adm-gold);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ced-translate-btn:hover:not(:disabled) {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
          border-color: var(--adm-primary-bg);
        }
        .ced-translate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        /* Barra de 6 pestañas + switch móvil */
        .ced-tabs-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 22px;
          background: var(--adm-surface-2);
          border-bottom: 1px solid var(--adm-border);
          flex-shrink: 0;
        }
        .ced-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: thin;
          flex: 1;
          min-width: 0;
        }
        .ced-pane-switch {
          display: none;
          align-items: center;
          gap: 4px;
          padding: 3px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          flex-shrink: 0;
        }
        .ced-pane-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: var(--adm-text-2);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .ced-pane-btn--active {
          background: var(--adm-primary-bg);
          color: var(--adm-primary-text);
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
        .ced-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .ced-body {
          min-height: 0;
          overflow-y: auto;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ced-preview-pane {
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
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
        .ced-locale-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 11px;
          background: var(--adm-gold-soft);
          border: 1px solid rgba(217, 119, 6, 0.35);
          flex-wrap: wrap;
        }
        .ced-locale-banner strong {
          display: block;
          font-size: 0.82rem;
          color: var(--adm-text);
        }
        .ced-locale-banner p {
          margin: 2px 0 0;
          font-size: 0.75rem;
          color: var(--adm-text-2);
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
        .ced-textarea-large {
          min-height: 280px;
          line-height: 1.65;
          resize: vertical;
          padding: 12px 14px;
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
          grid-template-columns: auto auto minmax(120px, 0.9fr) minmax(150px, 1.3fr) auto;
          gap: 8px;
          align-items: center;
        }
        .ced-drag-handle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--adm-text-3);
          cursor: grab;
          padding: 4px 2px;
          border-radius: 6px;
          flex-shrink: 0;
          user-select: none;
        }
        .ced-drag-handle:hover {
          color: var(--adm-text);
          background: var(--adm-surface);
        }
        .ced-drag-handle:active {
          cursor: grabbing;
        }
        .ced-drag-handle--badge {
          position: absolute;
          top: 4px;
          left: 4px;
          z-index: 2;
          background: rgba(15, 23, 42, 0.78);
          color: #ffffff;
          padding: 3px;
          border-radius: 6px;
        }
        .ced-dnd--dragging {
          opacity: 0.55;
        }
        .ced-dnd--over,
        .ced-dropzone--active {
          outline: 2px dashed var(--adm-primary-bg);
          outline-offset: 2px;
          border-radius: 10px;
          background: var(--adm-gold-soft);
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
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ced-icon-btn:hover:not(:disabled) {
          border-color: var(--adm-border-strong);
          color: var(--adm-text);
        }
        .ced-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .ced-icon-btn--danger:hover:not(:disabled) {
          border-color: var(--adm-rose);
          color: var(--adm-rose);
          background: var(--adm-rose-soft);
        }
        .ced-check-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.76rem;
          color: var(--adm-text-2);
          white-space: nowrap;
          cursor: pointer;
        }

        /* Galería */
        .ced-thumb-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ced-thumb-preview {
          position: relative;
          width: 88px;
          height: 58px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--adm-border);
          flex-shrink: 0;
        }
        .ced-img-cover {
          object-fit: cover;
        }
        .ced-presets-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ced-preset-btn {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          border: 1px solid var(--adm-border-strong);
          background: var(--adm-surface);
          color: var(--adm-text-2);
          cursor: pointer;
        }
        .ced-preset-btn--on {
          background: var(--adm-gold-soft);
          border-color: var(--adm-gold);
          color: var(--adm-text);
          font-weight: 600;
        }
        .ced-gallery-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .ced-gallery-item {
          display: grid;
          grid-template-columns: 96px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 8px;
          border-radius: 10px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
        }
        .ced-gallery-item--cover {
          border-color: var(--adm-gold);
          background: var(--adm-gold-soft);
        }
        .ced-gallery-item__thumb {
          position: relative;
          width: 96px;
          height: 64px;
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
          align-items: center;
          gap: 8px;
        }
        .ced-empty-hint {
          margin: 0;
          font-size: 0.8rem;
          color: var(--adm-text-3);
        }

        /* Alquiler y Toggles */
        .ced-rental-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--adm-surface);
          border: 1px solid var(--adm-border);
          font-size: 0.8rem;
          color: var(--adm-text-2);
        }
        .ced-toggle-card {
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-border);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ced-toggle-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .ced-toggle-opt {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--adm-border);
          background: var(--adm-surface);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .ced-toggle-opt--on {
          border-color: var(--adm-sage);
          background: var(--adm-sage-soft);
          color: var(--adm-sage);
        }
        .ced-toggle-opt--amber {
          border-color: var(--adm-amber);
          background: var(--adm-amber-soft);
          color: var(--adm-amber);
        }
        .ced-settings-shortcut {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--adm-gold-soft);
          border: 1px solid var(--adm-border-strong);
          flex-wrap: wrap;
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

        @media (max-width: 960px) {
          .ced-pane-switch {
            display: inline-flex;
          }
          .ced-workspace {
            grid-template-columns: 1fr;
          }
          .ced-pane-hidden-mobile {
            display: none !important;
          }
          .ced-lang-btn__full {
            display: none;
          }
        }
        @media (max-width: 720px) {
          .ced-grid-2,
          .ced-grid-3,
          .ced-grid-4,
          .ced-feature-row,
          .ced-gallery-item {
            grid-template-columns: 1fr;
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
          .ced-tabs-bar,
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
