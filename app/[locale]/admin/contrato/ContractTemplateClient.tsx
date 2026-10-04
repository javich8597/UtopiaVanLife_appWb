'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import {
  FileText,
  Save,
  RotateCcw,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Building,
  Scale,
  DollarSign,
  Loader2,
  Clock,
  ShieldAlert,
  Search,
  MoreHorizontal
} from 'lucide-react'
import AdminPageHeader from '../AdminPageHeader'
import { ContractTemplateData } from '@/lib/contracts/templateTypes'
import './contractEditor.css'

interface Props {
  initialTemplate: ContractTemplateData
}

export default function ContractTemplateClient({ initialTemplate }: Props) {
  const [template, setTemplate] = useState<ContractTemplateData>(initialTemplate)
  const [activeSection, setActiveSection] = useState<'terms' | 'lessor' | 'articles'>('terms')
  const [expandedArticles, setExpandedArticles] = useState<Set<number>>(new Set([1, 2, 3, 4]))
  const [articleSearch, setArticleSearch] = useState('')

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Generar vista previa del PDF
  const refreshPreview = async (currentTemplate: ContractTemplateData) => {
    try {
      setIsLoadingPreview(true)
      const res = await fetch('/api/admin/contract-template/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: currentTemplate })
      })

      if (!res.ok) {
        throw new Error('Error al generar previsualización')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err: any) {
      console.error('[ContractTemplateClient] Error updating preview:', err)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Actualizar previsualización al montar y cuando el usuario edita (con debounce de 600ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      refreshPreview(template)
    }, 600)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [template])

  // Limpiar URL al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Handlers para campos numéricos y texto de terms
  const handleTermChange = (key: keyof ContractTemplateData['terms'], value: any) => {
    setTemplate(prev => ({
      ...prev,
      terms: {
        ...prev.terms,
        [key]: value
      }
    }))
  }

  // Handlers para lessor
  const handleLessorChange = (key: keyof ContractTemplateData['lessor'], value: string) => {
    setTemplate(prev => ({
      ...prev,
      lessor: {
        ...prev.lessor,
        [key]: value
      }
    }))
  }

  // Handlers para artículos
  const handleArticleTitleChange = (artNumber: number, title: string) => {
    setTemplate(prev => ({
      ...prev,
      articles: prev.articles.map(art => art.number === artNumber ? { ...art, title } : art)
    }))
  }

  const handleArticleContentChange = (artNumber: number, text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
    setTemplate(prev => ({
      ...prev,
      articles: prev.articles.map(art => art.number === artNumber ? { ...art, content: paragraphs } : art)
    }))
  }

  const toggleArticleExpand = (artNumber: number) => {
    setExpandedArticles(prev => {
      const next = new Set(prev)
      if (next.has(artNumber)) next.delete(artNumber)
      else next.add(artNumber)
      return next
    })
  }

  // Guardar cambios en BD
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setErrorMessage(null)
      const res = await fetch('/api/admin/contract-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la plantilla')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  // Restablecer a fábrica de 1-clic
  const handleReset = async () => {
    try {
      setIsSaving(true)
      setErrorMessage(null)
      setIsResetConfirmOpen(false)

      const res = await fetch('/api/admin/contract-template/reset', {
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al restablecer la plantilla')
      }

      setTemplate(data.data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al restablecer valores de fábrica')
    } finally {
      setIsSaving(false)
    }
  }

  // Filtrado de artículos
  const filteredArticles = template.articles.filter(art => {
    if (!articleSearch.trim()) return true
    const q = articleSearch.toLowerCase()
    return (
      art.title.toLowerCase().includes(q) ||
      art.chapter.toLowerCase().includes(q) ||
      art.content.some(c => c.toLowerCase().includes(q)) ||
      art.number.toString() === q
    )
  })

  return (
    <div className="contract-editor-container">
      <AdminPageHeader
        title="Contrato"
        description="Tarifas, penalizaciones, datos del arrendador y cláusulas del contrato PDF."
        actions={
          <>
            {/* Acción destructiva fuera del camino principal, en un menú secundario */}
            <div className="contract-more">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                aria-label="Más opciones"
                onClick={() => setIsMoreOpen(o => !o)}
              >
                <MoreHorizontal size={18} />
              </button>
              {isMoreOpen && (
                <div className="contract-more__menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="contract-more__item"
                    onClick={() => { setIsMoreOpen(false); setIsResetConfirmOpen(true) }}
                    disabled={isSaving}
                  >
                    <RotateCcw size={15} /> Restablecer valores de fábrica…
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Guardando…' : 'Guardar cambios'}</span>
            </button>
          </>
        }
      />

      {/* Alertas de Estado */}
      {saveSuccess && (
        <div style={{ background: 'var(--adm-sage-soft)', border: '1px solid var(--adm-sage-soft)', padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--adm-sage)', fontSize: '0.85rem' }}>
          <CheckCircle2 size={18} />
          <span><strong>¡Plantilla guardada con éxito!</strong> Los nuevos contratos generados aplicarán estos cambios inmediatamente.</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ background: 'var(--adm-rose-soft)', border: '1px solid var(--adm-rose-soft)', padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--adm-rose)', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} />
          <span><strong>Error:</strong> {errorMessage}</span>
        </div>
      )}

      {/* Confirmación de Reset */}
      {isResetConfirmOpen && (
        <div style={{ background: 'var(--adm-amber-soft)', border: '1px solid var(--adm-amber-soft)', padding: '14px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--adm-amber)', fontSize: '0.85rem' }}>
            <AlertTriangle size={20} />
            <span>
              Se perderán todos tus cambios en tarifas, penalizaciones, datos del arrendador y cláusulas, y volverán los
              <strong> 31 artículos oficiales</strong>. Esta acción no se puede deshacer.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-utopia-outline"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-utopia-danger"
              onClick={handleReset}
            >
              Restablecer y perder cambios
            </button>
          </div>
        </div>
      )}

      {/* Split-Screen Layout */}
      <div className="contract-split-grid">
        {/* PANEL IZQUIERDO: Formulario de Edición */}
        <div className="contract-form-panel">
          {/* Navegación por pestañas del editor */}
          <div className="adm-tabs contract-tabs" role="tablist" aria-label="Secciones de la plantilla">
            <button
              type="button"
              onClick={() => setActiveSection('terms')}
              role="tab"
              aria-selected={activeSection === 'terms'}
              className={`adm-tab contract-tab ${activeSection === 'terms' ? 'adm-tab--on' : ''}`}
            >
              <DollarSign size={15} />
              <span>Tarifas & Penalizaciones</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('lessor')}
              role="tab"
              aria-selected={activeSection === 'lessor'}
              className={`adm-tab contract-tab ${activeSection === 'lessor' ? 'adm-tab--on' : ''}`}
            >
              <Building size={15} />
              <span>Datos Arrendador</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('articles')}
              role="tab"
              aria-selected={activeSection === 'articles'}
              className={`adm-tab contract-tab ${activeSection === 'articles' ? 'adm-tab--on' : ''}`}
            >
              <Scale size={15} />
              <span>31 Artículos Legales</span>
            </button>
          </div>

          {/* SECCIÓN 1: Tarifas y Penalizaciones */}
          {activeSection === 'terms' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
              {/* Conducción y Fianza */}
              <div className="editor-card" style={{ width: '100%' }}>
                <div className="editor-card-header">
                  <div className="editor-card-header-left">
                    <DollarSign size={18} color="var(--adm-text)" />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text)' }}>Conducción, Kilometraje y Fianza</strong>
                  </div>
                </div>
                <div className="editor-card-body">
                  <div className="form-grid-3">
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-depositAmount">Fianza por defecto (€)</label>
                      <input
                        id="term-depositAmount"
                        name="term_depositAmount"
                        type="number"
                        className="editor-input"
                        value={template.terms.depositAmount}
                        onChange={e => handleTermChange('depositAmount', Number(e.target.value))}
                        aria-describedby="term-depositAmount-help"
                      />
                      <span id="term-depositAmount-help" className="editor-help">
                        El contrato usa la fianza de la ficha de cada camper (Flota). Esta cifra solo se aplica si un camper no tiene fianza.
                      </span>
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-includedKmPerDay">Km Incluidos / Día</label>
                      <input
                        id="term-includedKmPerDay"
                        name="term_includedKmPerDay"
                        type="number"
                        className="editor-input"
                        value={template.terms.includedKmPerDay}
                        onChange={e => handleTermChange('includedKmPerDay', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-extraKmPrice">Precio Km Extra (€/km)</label>
                      <input
                        id="term-extraKmPrice"
                        name="term_extraKmPrice"
                        type="number"
                        step="0.01"
                        className="editor-input"
                        value={template.terms.extraKmPrice}
                        onChange={e => handleTermChange('extraKmPrice', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-conductorMinAge">Edad Mínima Conductor</label>
                      <input
                        id="term-conductorMinAge"
                        name="term_conductorMinAge"
                        type="number"
                        className="editor-input"
                        value={template.terms.conductorMinAge}
                        onChange={e => handleTermChange('conductorMinAge', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-conductorMinLicenseYears">Años Carnet Mínimo</label>
                      <input
                        id="term-conductorMinLicenseYears"
                        name="term_conductorMinLicenseYears"
                        type="number"
                        className="editor-input"
                        value={template.terms.conductorMinLicenseYears}
                        onChange={e => handleTermChange('conductorMinLicenseYears', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-depositReturnDaysDamageAssessment">Plazo Liquidación Daños (Días)</label>
                      <input
                        id="term-depositReturnDaysDamageAssessment"
                        name="term_depositReturnDaysDamageAssessment"
                        type="number"
                        className="editor-input"
                        value={template.terms.depositReturnDaysDamageAssessment}
                        onChange={e => handleTermChange('depositReturnDaysDamageAssessment', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Penalizaciones Específicas */}
              <div className="editor-card" style={{ width: '100%' }}>
                <div className="editor-card-header">
                  <div className="editor-card-header-left">
                    <ShieldAlert size={18} color="var(--adm-rose)" />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text)' }}>Penalizaciones Operativas y Errores Graves</strong>
                  </div>
                </div>
                <div className="editor-card-body">
                  <div className="form-grid-3">
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-smokePenalty">Fumar en el vehículo (€)</label>
                      <input
                        id="term-smokePenalty"
                        name="term_smokePenalty"
                        type="number"
                        className="editor-input"
                        value={template.terms.smokePenalty}
                        onChange={e => handleTermChange('smokePenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-keyPenalty">Pérdida de Llaves (€)</label>
                      <input
                        id="term-keyPenalty"
                        name="term_keyPenalty"
                        type="number"
                        className="editor-input"
                        value={template.terms.keyPenalty}
                        onChange={e => handleTermChange('keyPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-documentPenalty">Pérdida Documentación (€)</label>
                      <input
                        id="term-documentPenalty"
                        name="term_documentPenalty"
                        type="number"
                        className="editor-input"
                        value={template.terms.documentPenalty}
                        onChange={e => handleTermChange('documentPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-fuelServiceCharge">Gestión Combustible Faltante (€)</label>
                      <input
                        id="term-fuelServiceCharge"
                        name="term_fuelServiceCharge"
                        type="number"
                        className="editor-input"
                        value={template.terms.fuelServiceCharge}
                        onChange={e => handleTermChange('fuelServiceCharge', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-cleaningBasic">Limpieza Básica (€)</label>
                      <input
                        id="term-cleaningBasic"
                        name="term_cleaningBasic"
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningBasic}
                        onChange={e => handleTermChange('cleaningBasic', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-cleaningIntensive">Limpieza Intensiva (€)</label>
                      <input
                        id="term-cleaningIntensive"
                        name="term_cleaningIntensive"
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningIntensive}
                        onChange={e => handleTermChange('cleaningIntensive', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-cleaningWc">WC sucio / no vaciado (€)</label>
                      <input
                        id="term-cleaningWc"
                        name="term_cleaningWc"
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningWc}
                        onChange={e => handleTermChange('cleaningWc', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-waterFuelContaminationPenalty">Combustible en Depósito Agua (€)</label>
                      <input
                        id="term-waterFuelContaminationPenalty"
                        name="term_waterFuelContaminationPenalty"
                        type="number"
                        className="editor-input"
                        value={template.terms.waterFuelContaminationPenalty}
                        onChange={e => handleTermChange('waterFuelContaminationPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label" htmlFor="term-heightLimitMeters">Límite de Gálibo / Altura (m)</label>
                      <input
                        id="term-heightLimitMeters"
                        name="term_heightLimitMeters"
                        type="number"
                        step="0.05"
                        className="editor-input"
                        value={template.terms.heightLimitMeters}
                        onChange={e => handleTermChange('heightLimitMeters', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: Datos del Arrendador */}
          {activeSection === 'lessor' && (
            <div className="editor-card">
              <div className="editor-card-header">
                <div className="editor-card-header-left">
                  <Building size={18} color="var(--adm-text)" />
                  <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text)' }}>Datos Sociales y Representación</strong>
                </div>
              </div>
              <div className="editor-card-body">
                <div className="form-grid-2">
                  <div className="editor-field-group">
                    <label className="editor-label" htmlFor="lessor-legalName">Razón Social</label>
                    <input
                      id="lessor-legalName"
                      name="lessor_legalName"
                      type="text"
                      className="editor-input"
                      value={template.lessor.legalName}
                      onChange={e => handleLessorChange('legalName', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label" htmlFor="lessor-cif">CIF</label>
                    <input
                      id="lessor-cif"
                      name="lessor_cif"
                      type="text"
                      className="editor-input"
                      value={template.lessor.cif}
                      onChange={e => handleLessorChange('cif', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="editor-label" htmlFor="lessor-address">Domicilio Social</label>
                    <input
                      id="lessor-address"
                      name="lessor_address"
                      type="text"
                      className="editor-input"
                      value={template.lessor.address}
                      onChange={e => handleLessorChange('address', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label" htmlFor="lessor-legalRepresentative">Representante Legal</label>
                    <input
                      id="lessor-legalRepresentative"
                      name="lessor_legalRepresentative"
                      type="text"
                      className="editor-input"
                      value={template.lessor.legalRepresentative}
                      onChange={e => handleLessorChange('legalRepresentative', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label" htmlFor="lessor-contactEmail">Email Oficial de Contacto</label>
                    <input
                      id="lessor-contactEmail"
                      name="lessor_contactEmail"
                      type="email"
                      className="editor-input"
                      value={template.lessor.contactEmail}
                      onChange={e => handleLessorChange('contactEmail', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label" htmlFor="lessor-contactPhone">Teléfono de Asistencia</label>
                    <input
                      id="lessor-contactPhone"
                      name="lessor_contactPhone"
                      type="text"
                      className="editor-input"
                      value={template.lessor.contactPhone}
                      onChange={e => handleLessorChange('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: 31 Artículos Legales */}
          {activeSection === 'articles' && (
            <div>
              {/* Buscador de artículos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: 'var(--adm-surface)', border: '1px solid var(--adm-border-strong)', borderRadius: '10px', padding: '6px 12px' }}>
                <Search size={16} color="var(--adm-text-2)" />
                <input
                  id="contract-article-search"
                  name="contract_article_search"
                  aria-label="Buscar por artículo legal"
                  type="text"
                  placeholder="Buscar por artículo (ej: 4, seguro, fianza, combustible)..."
                  value={articleSearch}
                  onChange={e => setArticleSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--adm-text)' }}
                />
              </div>

              {filteredArticles.map(art => {
                const isExpanded = expandedArticles.has(art.number)
                return (
                  <div key={art.number} className="article-item">
                    <div className="article-header" onClick={() => toggleArticleExpand(art.number)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="article-badge">Art. {art.number}</span>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--adm-text)' }}>{art.title}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--adm-text-2)' }}>
                        <span style={{ fontSize: '0.72rem' }}>{art.chapter.split('–')[0].trim()}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="article-body">
                        <div className="editor-field-group">
                          <label className="editor-label" htmlFor={`art-title-${art.number}`}>Título del Artículo {art.number}</label>
                          <input
                            id={`art-title-${art.number}`}
                            name={`art_title_${art.number}`}
                            aria-label={`Título del Artículo ${art.number}`}
                            type="text"
                            className="editor-input"
                            value={art.title}
                            onChange={e => handleArticleTitleChange(art.number, e.target.value)}
                          />
                        </div>

                        <div className="editor-field-group">
                          <label className="editor-label" htmlFor={`art-content-${art.number}`}>Contenido Legal (Párrafos separados por doble salto)</label>
                          <textarea
                            id={`art-content-${art.number}`}
                            name={`art_content_${art.number}`}
                            aria-label={`Contenido Legal del Artículo ${art.number}`}
                            className="editor-textarea"
                            rows={art.content.length * 2 + 1}
                            value={art.content.join('\n\n')}
                            onChange={e => handleArticleContentChange(art.number, e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PANEL DERECHO: Previsualización en Vivo del PDF */}
        <div className="contract-preview-panel">
          <div className="preview-top-bar">
            <div className="preview-status-indicator">
              <Eye size={16} />
              <span>Vista previa del PDF</span>
            </div>
            <div className="preview-actions-bar">
              {previewUrl && (
                <a
                  href={previewUrl}
                  download="plantilla-contrato-previsualizacion.pdf"
                  className="preview-download"
                >
                  <Download size={13} />
                  <span>Descargar PDF</span>
                </a>
              )}
            </div>
          </div>

          <div className="preview-iframe-wrapper">
            {isLoadingPreview && (
              <div className="preview-loading-overlay">
                <Loader2 size={28} className="animate-spin" />
                <span>Actualizando previsualización interactiva...</span>
              </div>
            )}

            {previewUrl ? (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                className="preview-iframe"
                title="Vista previa del contrato PDF"
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--adm-text-3)' }}>
                <Loader2 size={24} className="animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
