'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Clock
} from 'lucide-react'
import PriceCalculator from '@/components/booking/PriceCalculator'
import BookingCalendar, { BlockedRange } from '@/components/booking/BookingCalendar'
import { BlockedSlot } from '@/lib/booking/availability'
import {
  calculatePrice,
  calculatePriceV2,
  formatPrice,
  getMinNightsForDate,
  getMinNightsForDateV2,
  DaySlot,
} from '@/lib/pricing/engine'
import CamperModelSwitcher from '@/components/campers/CamperModelSwitcher'
import CamperGalleryGrid from '@/components/campers/CamperGalleryGrid'
import CamperLightboxModal from '@/components/campers/CamperLightboxModal'
import CamperFeaturePills from '@/components/campers/CamperFeaturePills'
import CamperDescription from '@/components/campers/CamperDescription'
import CamperFloorplans from '@/components/campers/CamperFloorplans'
import CamperFeatureGrid from '@/components/campers/CamperFeatureGrid'
import CamperIncluded from '@/components/campers/CamperIncluded'
import CamperStickyBookingBar from '@/components/campers/CamperStickyBookingBar'
import { resolveCamperContent } from '@/lib/campers/camperCatalog'
import { useTranslations, useLocale } from 'next-intl'

interface Props {
  camper: any
  seasons: any[]
  extras: any[]
  initialFrom?: string
  initialTo?: string
  seasonsV2?: any[]
  seasonPeriods?: any[]
  durationDiscounts?: any[]
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────────────────── */

export default function CamperDetailClient({
  camper,
  seasons,
  extras,
  initialFrom,
  initialTo,
  seasonsV2,
  seasonPeriods,
  durationDiscounts,
}: Props) {
  const t = useTranslations('CamperDetail')
  const locale = useLocale()
  const bookingSectionRef = useRef<HTMLDivElement>(null)

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const slug = camper.slug?.toLowerCase() || 'space'
  const content = useMemo(() => resolveCamperContent(camper), [camper])
  const basePrice = content.rental.basePricePerNight
  const {
    standardDepositAmount,
    flexDepositAmount,
    flexDepositRatePerDay,
    secondDriverRatePerDay,
  } = content.rental

  const [sidebarStartDate, setSidebarStartDate] = useState(initialFrom || '')
  const [sidebarStartSlot, setSidebarStartSlot] = useState<DaySlot>('afternoon')
  const [sidebarEndDate, setSidebarEndDate] = useState(initialTo || '')
  const [sidebarEndSlot, setSidebarEndSlot] = useState<DaySlot>('morning')
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])

  useEffect(() => {
    let isMounted = true
    async function fetchAvailability() {
      try {
        const res = await fetch(`/api/campers/${slug}/availability`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setBlockedSlots(data.blockedSlots || [])
            setBlockedRanges(data.blockedRanges || [])
          }
        }
      } catch {
        // Silencioso si falla la carga de disponibilidad
      }
    }
    fetchAvailability()
    return () => {
      isMounted = false
    }
  }, [slug])

  const effectiveSeasons = seasons.length > 0 ? seasons : [
    { id: 's1', name: 'Temporada Alta', start_date: '2025-06-15', end_date: '2025-09-15', price_per_night: 175, discount_7days_pct: 10 },
    { id: 's2', name: 'Temporada Media', start_date: '2025-04-01', end_date: '2025-06-14', price_per_night: 130, discount_7days_pct: 8 },
    { id: 's3', name: 'Temporada Baja', start_date: '2025-11-01', end_date: '2026-03-31', price_per_night: 95, discount_7days_pct: 5 },
  ]

  const sidebarMinNights = sidebarStartDate
    ? (seasonsV2 && seasonPeriods && seasonsV2.length > 0)
      ? getMinNightsForDateV2(new Date(sidebarStartDate), seasonsV2, seasonPeriods)
      : getMinNightsForDate(new Date(sidebarStartDate), effectiveSeasons)
    : 3

  const sidebarBreakdown = useMemo(() => {
    if (!sidebarStartDate || !sidebarEndDate) return null
    const start = new Date(sidebarStartDate)
    const end = new Date(sidebarEndDate)
    if (end <= start) return null

    if (seasonsV2 && seasonPeriods && seasonsV2.length > 0 && basePrice) {
      return calculatePriceV2({
        startDate: start,
        startSlot: sidebarStartSlot,
        endDate: end,
        endSlot: sidebarEndSlot,
        camperBasePrice: basePrice,
        seasons: seasonsV2,
        periods: seasonPeriods,
        discounts: durationDiscounts || [],
        selectedExtras: [],
        standardDepositAmount,
        flexDepositAmount,
        flexDepositRatePerDay,
        secondDriverRatePerDay,
        depositAmount: standardDepositAmount,
      })
    }
    return calculatePrice(start, sidebarStartSlot, end, sidebarEndSlot, effectiveSeasons, [], standardDepositAmount)
  }, [sidebarStartDate, sidebarStartSlot, sidebarEndDate, sidebarEndSlot, seasonsV2, seasonPeriods, durationDiscounts, basePrice, effectiveSeasons, standardDepositAmount, flexDepositAmount, flexDepositRatePerDay, secondDriverRatePerDay])

  const sidebarBookingHref = useMemo(() => {
    const params = new URLSearchParams({ step: '1' })
    if (sidebarStartDate && sidebarEndDate && sidebarBreakdown) {
      const pickupTime = sidebarStartSlot === 'morning' ? '09:00' : '15:00'
      const dropoffTime = sidebarEndSlot === 'morning' ? '12:00' : '19:00'
      params.set('from', sidebarStartDate)
      params.set('pickup_time', pickupTime)
      params.set('to', sidebarEndDate)
      params.set('dropoff_time', dropoffTime)
    }
    return `/${locale}/reserva/${slug}?${params.toString()}`
  }, [locale, slug, sidebarStartDate, sidebarStartSlot, sidebarEndDate, sidebarEndSlot, sidebarBreakdown])

  const effectiveExtras = extras.length > 0 ? extras : [
    { id: 'e1', name_es: 'Kit Snorkel', price: 25, icon: 'waves' },
    { id: 'e2', name_es: 'Silla de Camping', price: 15, icon: 'armchair' },
    { id: 'e3', name_es: 'Wi-Fi 4G Portátil', price: 20, icon: 'wifi' },
  ]

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const handleScrollToBooking = () => {
    if (bookingSectionRef.current) {
      bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="camper-detail-v2">
      {/* ── Top Bar ── */}
      <section className="camper-header">
        <div className="header-top-row">
          <div className="header-left">
            <Link href={`/${locale}/campers`} className="back-link">
              <ChevronRight size={14} className="rotate-180" />
              <span>Volver a Campers</span>
            </Link>
          </div>
          <div className="header-switcher-mobile">
            <CamperModelSwitcher currentSlug={slug} />
          </div>
        </div>
      </section>

      {/* ── Two-Column Layout ── */}
      <div className="page-layout">
        {/* Content Column */}
        <div className="content-column">
          <div className="header-hero-block">
            <span className="hero-eyebrow">UTOPIA VAN LIFE · COLECCIÓN EXCLUSIVA</span>
            <h1 className="camper-title">{content.name}</h1>
            <p className="camper-tagline">{content.card.tagline}</p>
            <CamperFeaturePills pills={content.card.pills} />
          </div>

          <CamperGalleryGrid
            images={content.galleryImages}
            onOpenLightbox={handleOpenLightbox}
          />

          <CamperDescription
            paragraphs={content.descriptionParagraphs}
            inlineImage={content.descriptionInlineImage}
          />

          <CamperFloorplans
            dayImage={content.floorplanDay}
            nightImage={content.floorplanNight}
          />

          <CamperFeatureGrid
            title="CARACTERÍSTICAS Y EQUIPAMIENTO"
            features={content.features}
            initialVisible={8}
          />

          <CamperFeatureGrid
            title="CARACTERÍSTICAS TÉCNICAS"
            features={content.technicalFeatures}
            initialVisible={8}
          />

          <CamperIncluded items={content.included} />

          {/* Mobile-only PriceCalculator */}
          <div className="mobile-calculator-section" ref={bookingSectionRef}>
            <div className="section-divider-row">
              <h3 className="section-divider-title">RESERVA TU AVENTURA</h3>
              <div className="section-divider-line" />
            </div>
            <div className="calculator-card">
              <PriceCalculator
                camperSlug={slug}
                depositAmount={standardDepositAmount}
                flexDepositAmount={flexDepositAmount}
                flexDepositRatePerDay={flexDepositRatePerDay}
                secondDriverRatePerDay={secondDriverRatePerDay}
                seasons={effectiveSeasons}
                availableExtras={effectiveExtras}
                initialFrom={initialFrom}
                initialTo={initialTo}
                maxGuests={camper.specs?.seats || (slug === 'space' ? 2 : 3)}
                seasonsV2={seasonsV2}
                seasonPeriods={seasonPeriods}
                durationDiscounts={durationDiscounts}
                camperBasePrice={basePrice}
              />
            </div>
          </div>
        </div>

        {/* Sidebar (desktop fixed/sticky while scrolling left content) */}
        <aside className="booking-sidebar">
          <div className="sidebar-switcher-wrap">
            <CamperModelSwitcher currentSlug={slug} />
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-accent" />

            <div className="sidebar-response-row">
              <Clock size={14} className="sidebar-icon-muted" />
              <span>Sin compromiso · Respuesta en menos de 24h</span>
            </div>

            <div className="sidebar-price-header">
              <div className="sidebar-price-block">
                <span className="sidebar-price-label">desde</span>
                <span className="sidebar-price-amount">{basePrice}€</span>
                <span className="sidebar-price-unit">/ noche</span>
              </div>
              {sidebarBreakdown && sidebarBreakdown.numNights > 0 && (
                <div className="sidebar-estimated-total">
                  <span>{formatPrice(sidebarBreakdown.totalWithoutDeposit)}</span>
                  <span className="sidebar-estimated-nights"> · {sidebarBreakdown.numNights} {sidebarBreakdown.numNights === 1 ? 'noche' : 'noches'}</span>
                </div>
              )}
            </div>

            <div className="sidebar-calendar-wrap">
              <BookingCalendar
                startDate={sidebarStartDate}
                startSlot={sidebarStartSlot}
                endDate={sidebarEndDate}
                endSlot={sidebarEndSlot}
                onChange={(start, sSlot, end, eSlot) => {
                  setSidebarStartDate(start)
                  setSidebarStartSlot(sSlot)
                  setSidebarEndDate(end)
                  setSidebarEndSlot(eSlot)
                }}
                blockedSlots={blockedSlots}
                blockedRanges={blockedRanges}
                minNights={sidebarMinNights}
                showSlots={false}
                showDoneButton={false}
                monthsCount={1}
              />
            </div>

            <Link
              href={sidebarBookingHref}
              className="sidebar-cta-btn"
            >
              <span>Reservar esta Camper</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </aside>
      </div>

      {/* ── Lightbox ── */}
      <CamperLightboxModal
        isOpen={lightboxOpen}
        images={content.galleryImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />

      {/* ── Sticky Bottom Bar (mobile) ── */}
      <CamperStickyBookingBar
        slug={slug}
        pricePerNight={basePrice}
        initialFrom={initialFrom}
        initialTo={initialTo}
        onScrollToCalculator={handleScrollToBooking}
      />

      <style jsx>{`
        :global(.camper-detail-main) {
          padding-top: 72px;
        }
        :global(.camper-detail-fallback) {
          height: 50vh;
        }

        /* ── Page Root ── */
        .camper-detail-v2 {
          background-color: #0b0c0e;
          color: #f5f5f7;
          min-height: 100vh;
          padding-bottom: calc(100px + env(safe-area-inset-bottom, 16px));
          overflow-x: clip;
          transition: background-color 240ms ease, color 240ms ease;
        }

        /* ── Header ── */
        .camper-header {
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px 24px 16px;
        }
        .header-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        :global(.back-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 0.45);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        :global(.back-link:hover) {
          color: #ffffff;
        }
        .header-hero-block {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 24px;
          margin-bottom: 28px;
        }
        .hero-eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #e6ca65;
          margin-bottom: 8px;
        }
        .camper-title {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1;
          margin: 0 0 10px;
          text-transform: uppercase;
        }
        .camper-tagline {
          font-size: 16px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.55;
          margin: 0;
          max-width: 680px;
        }

        /* ── Two-Column Layout ── */
        .page-layout {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 40px;
          align-items: start;
        }
        .content-column {
          min-width: 0;
        }

        /* ── Mobile Calculator (hidden on desktop) ── */
        .mobile-calculator-section {
          display: none;
        }
        .section-divider-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .section-divider-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
          margin: 0;
        }
        .section-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(230, 202, 101, 0.3), rgba(255, 255, 255, 0.06));
          border-radius: 1px;
        }
        .calculator-card {
          background: #131518;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
        }

        /* ── Sidebar ── */
        .booking-sidebar {
          position: sticky;
          top: 88px;
          align-self: start;
          height: fit-content;
        }
        .sidebar-switcher-wrap {
          margin-bottom: 12px;
          display: flex;
        }
        .sidebar-switcher-wrap :global(.camper-model-switcher) {
          width: 100%;
          display: flex;
          justify-content: stretch;
          padding: 4px;
        }
        .sidebar-switcher-wrap :global(.model-pill) {
          flex: 1;
          justify-content: center;
          text-align: center;
          padding: 7px 12px;
        }
        .header-switcher-mobile {
          display: none;
        }
        .sidebar-card {
          position: relative;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #131518;
          padding: 16px 18px;
          overflow: hidden;
          transition: background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
        }
        .sidebar-card-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #e6ca65, rgba(230, 202, 101, 0.2));
        }
        .sidebar-response-row {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 2px;
          margin-bottom: 10px;
        }
        :global(.sidebar-icon-muted) {
          color: #e6ca65;
          flex-shrink: 0;
        }
        .sidebar-price-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .sidebar-price-block {
          display: flex;
          align-items: baseline;
        }
        .sidebar-price-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          text-transform: lowercase;
          margin-right: 7px;
        }
        .sidebar-price-amount {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }
        .sidebar-price-unit {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
          margin-left: 3px;
        }
        .sidebar-estimated-total {
          font-size: 12px;
          font-weight: 700;
          color: #e6ca65;
          background: rgba(230, 202, 101, 0.12);
          border: 1px solid rgba(230, 202, 101, 0.28);
          padding: 3px 9px;
          border-radius: 9999px;
        }
        .sidebar-estimated-nights {
          font-weight: 500;
          color: rgba(255, 255, 255, 0.72);
        }
        .sidebar-calendar-wrap {
          margin-bottom: 14px;
        }
        .sidebar-calendar-wrap :global(.booking-cal) {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 10px 12px;
          box-shadow: none;
          background: #0b0c0e;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sidebar-calendar-wrap :global(.booking-cal__step-banner) {
          padding: 5px 10px;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__header) {
          margin-bottom: 6px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__weekdays) {
          margin-bottom: 2px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__day) {
          aspect-ratio: auto;
          height: 29px;
          font-size: 12px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__day-number) {
          width: 26px;
          height: 26px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__legend) {
          margin-top: 6px;
          padding-top: 6px;
          gap: 8px;
          font-size: 10.5px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__footer) {
          margin-top: 6px;
          padding-top: 6px;
        }
        .sidebar-calendar-wrap :global(.booking-cal__clear-btn) {
          padding: 4px 10px;
          font-size: 11px;
        }
        :global(.sidebar-cta-btn) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 18px;
          border-radius: 12px;
          background: #e6ca65;
          color: #0b0c0e;
          font-size: 12.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 6px 20px rgba(230, 202, 101, 0.25);
        }
        :global(.sidebar-cta-btn:hover) {
          background: #d8bc59;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(230, 202, 101, 0.35);
        }

        /* ── Light Mode Support ── */
        :global(html[data-theme="light"]) .camper-detail-v2 {
          background-color: #F2F0EC;
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) :global(.back-link) {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) :global(.back-link:hover) {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .header-hero-block {
          border-bottom-color: #EAE5DD;
        }
        :global(html[data-theme="light"]) .hero-eyebrow {
          color: #B8893A;
          font-weight: 800;
        }
        :global(html[data-theme="light"]) .camper-title {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .camper-tagline {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .section-divider-title {
          color: #1A1714;
        }
        :global(html[data-theme="light"]) .section-divider-line {
          background: linear-gradient(90deg, #D9D1C4, #EAE5DD);
        }
        :global(html[data-theme="light"]) .calculator-card {
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(40, 30, 15, 0.08);
        }
        :global(html[data-theme="light"]) .sidebar-card {
          background: #FFFFFF;
          border-color: #EAE5DD;
          box-shadow: 0 8px 30px rgba(40, 30, 15, 0.08);
        }
        :global(html[data-theme="light"]) .sidebar-card-accent {
          background: linear-gradient(90deg, #CCA053, #E8D6B2);
        }
        :global(html[data-theme="light"]) .sidebar-response-row {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) :global(.sidebar-icon-muted) {
          color: #82681A;
        }
        :global(html[data-theme="light"]) .sidebar-price-label,
        :global(html[data-theme="light"]) .sidebar-price-unit {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .sidebar-price-amount {
          color: #1F1B17;
        }
        :global(html[data-theme="light"]) .sidebar-estimated-total {
          background: #F7EEDC;
          border-color: #E8D6B2;
          color: #1A1714;
        }
        :global(html[data-theme="light"]) .sidebar-estimated-nights {
          color: #5A5248;
        }
        :global(html[data-theme="light"]) .sidebar-calendar-wrap :global(.booking-cal) {
          background: #FAF8F5;
          border-color: #EAE5DD;
        }
        :global(html[data-theme="light"]) :global(.sidebar-cta-btn) {
          background: #1A1714;
          color: #F6EBD3;
          box-shadow: 0 6px 20px rgba(26, 23, 20, 0.16);
        }
        :global(html[data-theme="light"]) :global(.sidebar-cta-btn:hover) {
          background: #2E2822;
          box-shadow: 0 8px 24px rgba(26, 23, 20, 0.24);
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .header-switcher-mobile {
            display: block;
          }
          .page-layout {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .booking-sidebar {
            display: none;
          }
          .mobile-calculator-section {
            display: block;
            margin-bottom: 48px;
          }
          .camper-title {
            font-size: 40px;
          }
        }

        @media (max-width: 640px) {
          .camper-header {
            padding: 16px 16px 20px;
          }
          .header-top-row {
            margin-bottom: 20px;
          }
          .camper-title {
            font-size: 32px;
          }
          .camper-tagline {
            font-size: 14px;
          }
          .page-layout {
            padding: 0 16px;
          }
        }
      `}</style>
    </div>
  )
}
