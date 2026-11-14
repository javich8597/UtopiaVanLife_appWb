'use client'

import React, { useEffect, useState } from 'react'
import { Eye, CheckCircle2 } from 'lucide-react'
import CamperCard from '@/components/campers/CamperCard'
import CamperFeaturePills from '@/components/campers/CamperFeaturePills'
import CamperGalleryGrid from '@/components/campers/CamperGalleryGrid'
import CamperDescription from '@/components/campers/CamperDescription'
import CamperFloorplans from '@/components/campers/CamperFloorplans'
import CamperFeatureGrid from '@/components/campers/CamperFeatureGrid'
import CamperIncluded from '@/components/campers/CamperIncluded'
import Step4Insurance from '@/app/[locale]/reserva/[slug]/Step4Insurance'
import { DepositOption } from '@/app/[locale]/reserva/[slug]/types'
import {
  CamperCardPill,
  CamperCardSummarySpec,
  CamperFeatureItem,
  CamperGalleryItem,
  CamperLocaleCode,
} from '@/lib/campers/camperCatalog'

export type PreviewTabId =
  | 'summary'
  | 'photos'
  | 'description'
  | 'equipment'
  | 'technical'
  | 'rental'

export interface CamperEditorPreviewProps {
  activeTab: PreviewTabId
  activeLocale?: CamperLocaleCode
  camperId: string
  name: string
  slug: string
  isAvailable: boolean
  tagline: string
  seats: number
  beds: number
  summarySpecs: CamperCardSummarySpec[]
  pills: CamperCardPill[]
  wizardHighlights: string[]
  thumbnailUrl: string
  galleryItems: CamperGalleryItem[]
  floorplanDay: string
  floorplanNight: string
  inlineDescImageSrc: string
  inlineDescImageAlt: string
  descriptionParagraphs: string[]
  features: CamperFeatureItem[]
  techSpecs: {
    length: string
    width: string
    height: string
    engine: string
    consumption: string
    license: string
    waterTank: string
    greyWater: string
    battery: string
    heating: string
    fridge: string
    gas: string
  }
  technicalFeatures: CamperFeatureItem[]
  pricePerNight: number
  standardDepositAmount: number
  flexDepositAmount: number
  flexDepositRatePerDay: number
  secondDriverRatePerDay: number
  includedItems: string[]
}

const TAB_DESCRIPTIONS: Record<PreviewTabId, { title: string; subtitle: string }> = {
  summary: {
    title: 'Vista previa · Tarjeta resumen',
    subtitle: 'Diseño real en catálogo, cabecera de ficha y Paso 2 de reserva.',
  },
  photos: {
    title: 'Vista previa · Fotos y planos',
    subtitle: 'Galería principal y planos día/noche en la ficha pública.',
  },
  description: {
    title: 'Vista previa · Descripción',
    subtitle: 'Sección DESCRIPCIÓN tal como se ve en la web.',
  },
  equipment: {
    title: 'Vista previa · Características y equipamiento',
    subtitle: 'Sección CARACTERÍSTICAS Y EQUIPAMIENTO de la web.',
  },
  technical: {
    title: 'Vista previa · Características técnicas',
    subtitle: 'Sección CARACTERÍSTICAS TÉCNICAS de la web.',
  },
  rental: {
    title: 'Vista previa · Alquiler y fianza',
    subtitle: 'Paso 4 de Seguro/Fianza y sección ¿QUÉ INCLUYE EL ALQUILER?.',
  },
}

function detectAdminTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  const adminLayout = document.querySelector('.admin-layout')
  const layoutTheme = adminLayout?.getAttribute('data-theme')
  if (layoutTheme === 'dark' || layoutTheme === 'light') return layoutTheme
  const htmlTheme = document.documentElement.getAttribute('data-theme')
  return htmlTheme === 'dark' ? 'dark' : 'light'
}

export default function CamperEditorPreview({
  activeTab,
  activeLocale = 'es',
  camperId,
  name,
  slug,
  isAvailable,
  tagline,
  seats,
  beds,
  summarySpecs,
  pills,
  wizardHighlights,
  thumbnailUrl,
  galleryItems,
  floorplanDay,
  floorplanNight,
  inlineDescImageSrc,
  inlineDescImageAlt,
  descriptionParagraphs,
  features,
  techSpecs,
  technicalFeatures,
  pricePerNight,
  standardDepositAmount,
  flexDepositAmount,
  flexDepositRatePerDay,
  secondDriverRatePerDay,
  includedItems,
}: CamperEditorPreviewProps) {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>(() => detectAdminTheme())
  const [previewDepositOpt, setPreviewDepositOpt] = useState<DepositOption>('standard_2000')

  useEffect(() => {
    const update = () => setPreviewTheme(detectAdminTheme())
    update()

    const observer = new MutationObserver(update)
    const adminLayout = document.querySelector('.admin-layout')
    if (adminLayout) {
      observer.observe(adminLayout, { attributes: true, attributeFilter: ['data-theme'] })
    }
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const safeName = name.trim() || 'Nueva Camper'
  const safeSlug = slug.trim() || 'nueva-camper'
  const safeThumb = thumbnailUrl.trim() || galleryItems[0]?.src || '/images/campers/neo/neo-ext.png'
  const cleanParagraphs = descriptionParagraphs.filter((p) => p.trim().length > 0)
  const cleanHighlights = wizardHighlights.filter((h) => h.trim().length > 0)
  const cleanIncluded = includedItems.filter((item) => item.trim().length > 0)

  const liveSpecs = {
    seats,
    beds,
    card: {
      tagline,
      summarySpecs,
      pills,
      wizardHighlights: cleanHighlights,
    },
    gallery_items: galleryItems,
    floorplan_day: floorplanDay,
    floorplan_night: floorplanNight,
    description_inline_image: {
      src: inlineDescImageSrc,
      alt: inlineDescImageAlt || `${safeName} interior`,
    },
    description_paragraphs: cleanParagraphs,
    features,
    technical_features: technicalFeatures,
    rental: {
      standard_deposit_amount: standardDepositAmount,
      flex_deposit_amount: flexDepositAmount,
      flex_deposit_rate_per_day: flexDepositRatePerDay,
      second_driver_rate_per_day: secondDriverRatePerDay,
      included: cleanIncluded,
    },
    translations: {
      [activeLocale]: {
        tagline,
        summarySpecs,
        pills,
        wizardHighlights: cleanHighlights,
        galleryTags: galleryItems.map(g => g.tag),
        inlineDescImageAlt,
        descriptionParagraphs: cleanParagraphs,
        features,
        technicalFeatures,
        included: cleanIncluded,
      },
    },
  }

  const meta = TAB_DESCRIPTIONS[activeTab]

  return (
    <aside className={`cep-root cep-root--${previewTheme}`} data-theme={previewTheme} aria-label="Vista previa en tiempo real">
      <div className="cep-topbar">
        <div className="cep-topbar-title">
          <Eye size={15} />
          <div>
            <strong>{meta.title}</strong>
            <span>{meta.subtitle}</span>
          </div>
        </div>
        <div className="cep-badges">
          <span className="cep-locale-badge">{activeLocale.toUpperCase()}</span>
          <span className="cep-live-badge">{previewTheme === 'light' ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </div>
      </div>

      <div className="cep-stage">
        <div className="cep-web-canvas">
          {activeTab === 'summary' && (
            <div className="cep-stack">
              <div className="cep-web-divider">
                <h4 className="cep-web-divider__title">TARJETA EN CATÁLOGO Y HOME</h4>
                <div className="cep-web-divider__line" />
              </div>

              <div
                className="cep-non-nav"
                onClickCapture={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <CamperCard
                  id={camperId || 'preview-camper'}
                  slug={safeSlug}
                  name={safeName}
                  description_es={cleanParagraphs[0] || tagline}
                  thumbnail_url={safeThumb}
                  images={galleryItems.map((g) => g.src)}
                  specs={liveSpecs}
                  deposit_amount={standardDepositAmount}
                  pricePerNight={pricePerNight}
                  isAvailable={isAvailable}
                  variant={previewTheme}
                  customHref="#"
                  locale={activeLocale}
                />
              </div>

              {pills.length > 0 && (
                <div className="cep-block">
                  <div className="cep-web-divider">
                    <h4 className="cep-web-divider__title">CABECERA DE FICHA (/CAMPERS/{safeSlug.toUpperCase()})</h4>
                    <div className="cep-web-divider__line" />
                  </div>
                  <div className="cep-hero-preview">
                    <span className="cep-hero-eyebrow">UTOPIA VAN</span>
                    <h2 className="cep-hero-title">{safeName}</h2>
                    <p className="cep-hero-tagline">{tagline}</p>
                    <CamperFeaturePills pills={pills} />
                  </div>
                </div>
              )}

              {cleanHighlights.length > 0 && (
                <div className="cep-block">
                  <div className="cep-web-divider">
                    <h4 className="cep-web-divider__title">DESTACADOS PASO 2 (ASISTENTE DE RESERVA)</h4>
                    <div className="cep-web-divider__line" />
                  </div>
                  <div className="cep-wizard-card">
                    <div className="cep-wizard-head">
                      <strong>{safeName}</strong>
                      <span>{pricePerNight} € / día</span>
                    </div>
                    <p className="cep-wizard-tagline">{tagline || 'Camper gran volumen'}</p>
                    <ul className="cep-wizard-list">
                      {cleanHighlights.map((item, idx) => (
                        <li key={idx}>
                          <CheckCircle2 size={14} className="cep-wizard-check" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="cep-stack">
              <div className="cep-block">
                <div className="cep-web-divider">
                  <h4 className="cep-web-divider__title">GALERÍA DE LA FICHA ({galleryItems.length})</h4>
                  <div className="cep-web-divider__line" />
                </div>
                {galleryItems.length > 0 ? (
                  <CamperGalleryGrid images={galleryItems} onOpenLightbox={() => {}} />
                ) : (
                  <p className="cep-empty-note">Añade fotos en la galería para ver la previsualización.</p>
                )}
              </div>

              <div className="cep-block">
                <div className="cep-web-divider">
                  <h4 className="cep-web-divider__title">DISTRIBUCIÓN Y DIMENSIONES</h4>
                  <div className="cep-web-divider__line" />
                </div>
                {floorplanDay || floorplanNight ? (
                  <CamperFloorplans
                    dayImage={floorplanDay || floorplanNight}
                    nightImage={floorplanNight || floorplanDay}
                  />
                ) : (
                  <p className="cep-empty-note">Sin planos configurados.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'description' && (
            <div className="cep-stack">
              <div className="cep-web-divider">
                <h4 className="cep-web-divider__title">DESCRIPCIÓN</h4>
                <div className="cep-web-divider__line" />
              </div>
              {cleanParagraphs.length > 0 ? (
                <CamperDescription
                  paragraphs={cleanParagraphs}
                  inlineImage={
                    inlineDescImageSrc
                      ? {
                          src: inlineDescImageSrc,
                          alt: inlineDescImageAlt || `${safeName} interior`,
                        }
                      : undefined
                  }
                  visibleCount={Math.max(3, cleanParagraphs.length)}
                />
              ) : (
                <p className="cep-empty-note">Escribe la descripción para previsualizarla con el diseño real de la web.</p>
              )}
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="cep-stack">
              <div className="cep-web-divider">
                <h4 className="cep-web-divider__title">CARACTERÍSTICAS Y EQUIPAMIENTO</h4>
                <div className="cep-web-divider__line" />
              </div>
              {features.length > 0 ? (
                <CamperFeatureGrid
                  features={features}
                  initialVisible={features.length}
                />
              ) : (
                <p className="cep-empty-note">Añade tarjetas de equipamiento para verlas aquí.</p>
              )}
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="cep-stack">
              <div className="cep-web-divider">
                <h4 className="cep-web-divider__title">CARACTERÍSTICAS TÉCNICAS</h4>
                <div className="cep-web-divider__line" />
              </div>
              {technicalFeatures.length > 0 ? (
                <CamperFeatureGrid
                  features={technicalFeatures}
                  initialVisible={technicalFeatures.length}
                />
              ) : (
                <p className="cep-empty-note">Añade características técnicas para previsualizarlas.</p>
              )}

              <div className="cep-tech-summary">
                <div><span>Dimensiones</span><strong>{[techSpecs.length, techSpecs.width, techSpecs.height].filter(Boolean).join(' × ') || '—'}</strong></div>
                <div><span>Motor</span><strong>{techSpecs.engine || '—'}</strong></div>
                <div><span>Batería</span><strong>{techSpecs.battery || '—'}</strong></div>
                <div><span>Aguas</span><strong>{[techSpecs.waterTank, techSpecs.greyWater].filter(Boolean).join(' / ') || '—'}</strong></div>
              </div>
            </div>
          )}

          {activeTab === 'rental' && (
            <div className="cep-stack">
              <div className="cep-wizard-vars">
                <Step4Insurance
                  depositOption={previewDepositOpt}
                  totalDays={7}
                  standardDepositAmount={standardDepositAmount}
                  flexDepositAmount={flexDepositAmount}
                  flexDepositRatePerDay={flexDepositRatePerDay}
                  secondDriverRatePerDay={secondDriverRatePerDay}
                  onChange={setPreviewDepositOpt}
                />
              </div>

              <div className="cep-block">
                <div className="cep-web-divider">
                  <h4 className="cep-web-divider__title">¿QUÉ INCLUYE EL ALQUILER?</h4>
                  <div className="cep-web-divider__line" />
                </div>
                {cleanIncluded.length > 0 ? (
                  <CamperIncluded items={cleanIncluded} />
                ) : (
                  <p className="cep-empty-note">Añade elementos incluidos para ver este bloque.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .cep-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          border-left: 1px solid var(--adm-border, #e5e7eb);
          background: #0b0c0e;
          color: #f5f5f7;
        }

        .cep-root--light {
          background: #F2F0EC;
          color: #1F1B17;
        }

        .cep-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
          background: var(--adm-surface, #ffffff);
          border-bottom: 1px solid var(--adm-border, #e5e7eb);
          flex-shrink: 0;
        }

        .cep-topbar-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--adm-text, #111827);
          min-width: 0;
        }

        .cep-topbar-title strong {
          display: block;
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--adm-text, #111827);
        }

        .cep-topbar-title span {
          display: block;
          font-size: 0.74rem;
          color: var(--adm-text-muted, #6b7280);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cep-badges {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .cep-locale-badge {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--adm-gold-soft, rgba(217, 119, 6, 0.14));
          color: var(--adm-gold, #b45309);
        }

        .cep-live-badge {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.14);
          color: #059669;
        }

        .cep-stage {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 20px;
        }

        .cep-web-canvas {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .cep-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .cep-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Mismos divisores de sección que CamperDetailClient.tsx */
        .cep-web-divider {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cep-web-divider__title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #ffffff;
          white-space: nowrap;
          margin: 0;
        }

        .cep-root--light .cep-web-divider__title {
          color: #1A1714;
        }

        .cep-web-divider__line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02));
        }

        .cep-root--light .cep-web-divider__line {
          background: linear-gradient(90deg, #D9D1C4, #EAE5DD);
        }

        .cep-hero-preview {
          padding: 18px 20px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .cep-root--light .cep-hero-preview {
          background: #FFFFFF;
          border-color: #EAE5DD;
          box-shadow: 0 6px 20px rgba(40, 30, 15, 0.05);
        }

        .cep-hero-eyebrow {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #e6ca65;
          margin-bottom: 4px;
        }

        .cep-root--light .cep-hero-eyebrow {
          color: #B8893A;
          font-weight: 800;
        }

        .cep-hero-title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.05;
          color: #ffffff;
          margin: 0 0 6px;
          text-transform: uppercase;
        }

        .cep-root--light .cep-hero-title {
          color: #1F1B17;
        }

        .cep-hero-tagline {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.65);
          margin: 0 0 16px;
          line-height: 1.5;
        }

        .cep-root--light .cep-hero-tagline {
          color: #5A5248;
        }

        .cep-non-nav {
          pointer-events: none;
        }

        .cep-empty-note {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.55);
          text-align: center;
          padding: 22px 12px;
          border: 1px dashed rgba(255, 255, 255, 0.14);
          border-radius: 14px;
        }

        .cep-root--light .cep-empty-note {
          color: #5A5248;
          border-color: #D9D1C4;
          background: rgba(255, 255, 255, 0.6);
        }

        .cep-wizard-card {
          background: rgba(255, 255, 255, 0.03);
          color: #f5f5f7;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          padding: 16px 18px;
        }

        .cep-root--light .cep-wizard-card {
          background: #FFFFFF;
          color: #1F1B17;
          border-color: #EAE5DD;
          box-shadow: 0 6px 20px rgba(40, 30, 15, 0.05);
        }

        .cep-wizard-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }

        .cep-wizard-head strong {
          font-size: 1rem;
        }

        .cep-wizard-head span {
          font-size: 0.86rem;
          font-weight: 800;
          color: #e6ca65;
        }

        .cep-root--light .cep-wizard-head span {
          color: #9A6E22;
        }

        .cep-wizard-tagline {
          margin: 0 0 12px;
          font-size: 0.83rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .cep-root--light .cep-wizard-tagline {
          color: #5A5248;
        }

        .cep-wizard-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cep-wizard-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.83rem;
        }

        .cep-wizard-check {
          color: #e6ca65;
          flex-shrink: 0;
        }

        .cep-root--light .cep-wizard-check {
          color: #B8893A;
        }

        .cep-tech-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px;
        }

        .cep-root--light .cep-tech-summary {
          background: #FFFFFF;
          border-color: #EAE5DD;
        }

        .cep-tech-summary > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
        }

        .cep-root--light .cep-tech-summary > div {
          background: #FAF8F5;
        }

        .cep-tech-summary span {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.55);
        }

        .cep-root--light .cep-tech-summary span {
          color: #5A5248;
        }

        .cep-tech-summary strong {
          font-size: 0.84rem;
        }

        /* Variables de Step4Insurance (iguales a BookingWizardClient.tsx) */
        .cep-wizard-vars {
          --black-matte: #f5f5f7;
          --gray-600: rgba(255, 255, 255, 0.62);
          --forest-green: #e6ca65;
          --wz-card-bg: rgba(255, 255, 255, 0.025);
          --wz-card-border: rgba(255, 255, 255, 0.09);
          --wz-card-hover-border: rgba(230, 202, 101, 0.4);
          --wz-card-active-bg: rgba(230, 202, 101, 0.07);
          --wz-card-active-border: #e6ca65;
          --wz-card-active-ring: rgba(230, 202, 101, 0.25);
          --wz-card-active-shadow: rgba(0, 0, 0, 0.35);
          --wz-radio-border: rgba(255, 255, 255, 0.28);
          --wz-pill-bg: rgba(230, 202, 101, 0.14);
          --wz-pill-border: rgba(230, 202, 101, 0.32);
          --wz-pill-text: #e6ca65;
        }

        .cep-root--light .cep-wizard-vars {
          --black-matte: #1F1B17;
          --gray-600: #5A5248;
          --forest-green: #B8893A;
          --wz-card-bg: #FFFFFF;
          --wz-card-border: #E6DFD3;
          --wz-card-hover-border: #C9A45C;
          --wz-card-active-bg: #FCF9F2;
          --wz-card-active-border: #B8893A;
          --wz-card-active-ring: rgba(184, 137, 58, 0.2);
          --wz-card-active-shadow: rgba(40, 30, 15, 0.08);
          --wz-radio-border: #C5BBAE;
          --wz-pill-bg: #F6ECD8;
          --wz-pill-border: #E2CFA8;
          --wz-pill-text: #8C641E;
        }

        @media (max-width: 860px) {
          .cep-root {
            border-left: none;
          }
        }

        @media (max-width: 640px) {
          .cep-stage {
            padding: 14px;
          }

          .cep-tech-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </aside>
  )
}
