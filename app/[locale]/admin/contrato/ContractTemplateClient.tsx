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
  Search
} from 'lucide-react'
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
      {/* Header Principal */}
      <div className="contract-editor-header">
        <div className="contract-editor-title-box">
          <div className="contract-editor-icon-badge">
            <FileText size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A2B21', margin: 0 }}>
              Plantilla del Contrato Oficial
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Edita las cláusulas, tarifas y penalizaciones que rigen los contratos PDF generados para los usuarios.
            </p>
          </div>
        </div>

        <div className="contract-editor-actions">
          <button
            type="button"
            className="btn-utopia-danger"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isSaving}
          >
            <RotateCcw size={15} />
            <span>Restablecer Fábrica</span>
          </button>

          <button
            type="button"
            className="btn-utopia-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isSaving ? 'Guardando...' : 'Guardar Plantilla'}</span>
          </button>
        </div>
      </div>

      {/* Alertas de Estado */}
      {saveSuccess && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#065F46', fontSize: '0.85rem' }}>
          <CheckCircle2 size={18} />
          <span><strong>¡Plantilla guardada con éxito!</strong> Los nuevos contratos generados aplicarán estos cambios inmediatamente.</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} />
          <span><strong>Error:</strong> {errorMessage}</span>
        </div>
      )}

      {/* Confirmación de Reset */}
      {isResetConfirmOpen && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400E', fontSize: '0.85rem' }}>
            <AlertTriangle size={20} />
            <span>¿Confirmas restablecer la plantilla a los <strong>31 artículos y tarifas oficiales de fábrica</strong> de docs/Contract?</span>
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
              Sí, Restablecer Fábrica
            </button>
          </div>
        </div>
      )}

      {/* Split-Screen Layout */}
      <div className="contract-split-grid">
        {/* PANEL IZQUIERDO: Formulario de Edición */}
        <div className="contract-form-panel">
          {/* Navegación por pestañas del editor */}
          <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '6px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveSection('terms')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSection === 'terms' ? '#ffffff' : 'transparent',
                color: activeSection === 'terms' ? '#1A2B21' : '#64748B',
                boxShadow: activeSection === 'terms' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <DollarSign size={15} />
              <span>Tarifas & Penalizaciones</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('lessor')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSection === 'lessor' ? '#ffffff' : 'transparent',
                color: activeSection === 'lessor' ? '#1A2B21' : '#64748B',
                boxShadow: activeSection === 'lessor' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              <Building size={15} />
              <span>Datos Arrendador</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('articles')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSection === 'articles' ? '#ffffff' : 'transparent',
                color: activeSection === 'articles' ? '#1A2B21' : '#64748B',
                boxShadow: activeSection === 'articles' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
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
                    <DollarSign size={18} color="#1A2B21" />
                    <strong style={{ fontSize: '0.9rem', color: '#1A2B21' }}>Conducción, Kilometraje y Fianza</strong>
                  </div>
                </div>
                <div className="editor-card-body">
                  <div className="form-grid-3">
                    <div className="editor-field-group">
                      <label className="editor-label">Fianza Obligatoria (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.depositAmount}
                        onChange={e => handleTermChange('depositAmount', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Km Incluidos / Día</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.includedKmPerDay}
                        onChange={e => handleTermChange('includedKmPerDay', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Precio Km Extra (€/km)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="editor-input"
                        value={template.terms.extraKmPrice}
                        onChange={e => handleTermChange('extraKmPrice', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Edad Mínima Conductor</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.conductorMinAge}
                        onChange={e => handleTermChange('conductorMinAge', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Años Carnet Mínimo</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.conductorMinLicenseYears}
                        onChange={e => handleTermChange('conductorMinLicenseYears', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Plazo Liquidación Daños (Días)</label>
                      <input
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
                    <ShieldAlert size={18} color="#DC2626" />
                    <strong style={{ fontSize: '0.9rem', color: '#1A2B21' }}>Penalizaciones Operativas y Errores Graves</strong>
                  </div>
                </div>
                <div className="editor-card-body">
                  <div className="form-grid-3">
                    <div className="editor-field-group">
                      <label className="editor-label">Fumar en el vehículo (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.smokePenalty}
                        onChange={e => handleTermChange('smokePenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Pérdida de Llaves (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.keyPenalty}
                        onChange={e => handleTermChange('keyPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Pérdida Documentación (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.documentPenalty}
                        onChange={e => handleTermChange('documentPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Gestión Combustible Faltante (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.fuelServiceCharge}
                        onChange={e => handleTermChange('fuelServiceCharge', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Limpieza Básica (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningBasic}
                        onChange={e => handleTermChange('cleaningBasic', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Limpieza Intensiva (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningIntensive}
                        onChange={e => handleTermChange('cleaningIntensive', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">WC sucio / no vaciado (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.cleaningWc}
                        onChange={e => handleTermChange('cleaningWc', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Combustible en Depósito Agua (€)</label>
                      <input
                        type="number"
                        className="editor-input"
                        value={template.terms.waterFuelContaminationPenalty}
                        onChange={e => handleTermChange('waterFuelContaminationPenalty', Number(e.target.value))}
                      />
                    </div>
                    <div className="editor-field-group">
                      <label className="editor-label">Límite de Gálibo / Altura (m)</label>
                      <input
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
                  <Building size={18} color="#1A2B21" />
                  <strong style={{ fontSize: '0.9rem', color: '#1A2B21' }}>Datos Sociales y Representación</strong>
                </div>
              </div>
              <div className="editor-card-body">
                <div className="form-grid-2">
                  <div className="editor-field-group">
                    <label className="editor-label">Razón Social</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={template.lessor.legalName}
                      onChange={e => handleLessorChange('legalName', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label">CIF</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={template.lessor.cif}
                      onChange={e => handleLessorChange('cif', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group" style={{ gridColumn: 'span 2' }}>
                    <label className="editor-label">Domicilio Social</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={template.lessor.address}
                      onChange={e => handleLessorChange('address', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label">Representante Legal</label>
                    <input
                      type="text"
                      className="editor-input"
                      value={template.lessor.legalRepresentative}
                      onChange={e => handleLessorChange('legalRepresentative', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label">Email Oficial de Contacto</label>
                    <input
                      type="email"
                      className="editor-input"
                      value={template.lessor.contactEmail}
                      onChange={e => handleLessorChange('contactEmail', e.target.value)}
                    />
                  </div>
                  <div className="editor-field-group">
                    <label className="editor-label">Teléfono de Asistencia</label>
                    <input
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: '#ffffff', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '6px 12px' }}>
                <Search size={16} color="#64748B" />
                <input
                  type="text"
                  placeholder="Buscar por artículo (ej: 4, seguro, fianza, combustible)..."
                  value={articleSearch}
                  onChange={e => setArticleSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#1E293B' }}
                />
              </div>

              {filteredArticles.map(art => {
                const isExpanded = expandedArticles.has(art.number)
                return (
                  <div key={art.number} className="article-item">
                    <div className="article-header" onClick={() => toggleArticleExpand(art.number)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="article-badge">Art. {art.number}</span>
                        <strong style={{ fontSize: '0.84rem', color: '#1E293B' }}>{art.title}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                        <span style={{ fontSize: '0.72rem' }}>{art.chapter.split('–')[0].trim()}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="article-body">
                        <div className="editor-field-group">
                          <label className="editor-label">Título del Artículo</label>
                          <input
                            type="text"
                            className="editor-input"
                            value={art.title}
                            onChange={e => handleArticleTitleChange(art.number, e.target.value)}
                          />
                        </div>

                        <div className="editor-field-group">
                          <label className="editor-label">Contenido Legal (Párrafos separados por doble salto)</label>
                          <textarea
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
              <span>Vista Previa del PDF en Tiempo Real</span>
            </div>
            <div className="preview-actions-bar">
              {previewUrl && (
                <a
                  href={previewUrl}
                  download="plantilla-contrato-previsualizacion.pdf"
                  className="btn-utopia-primary"
                  style={{ background: '#2D4A39', padding: '4px 10px', fontSize: '0.75rem' }}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                <Loader2 size={24} className="animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
