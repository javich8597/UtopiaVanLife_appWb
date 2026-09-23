# Project: Utopia Van Life — User & Admin Portals, Premium Booking Flow & Cinematic Redesign

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Internationalization**: `next-intl` (locales: `es`, `en`, `de`, `fr`, default `es`; `/admin` strictly enforces `es`)
- **Styling**: Tailwind CSS v4, global CSS variables in `app/globals.css`, scoped styled-jsx for interactive dashboards, Lucide icons, Framer Motion
- **Database & Storage**: Supabase SSR client for user session, Supabase Service Role client (`supabaseAdmin`) for privileged administrative mutations and Storage bucket (`documents`) signed URLs
- **Mapping**: Leaflet with custom tiles and Google 3D relief layers
- **Calendar**: FullCalendar v6 (DayGrid, TimeGrid, Interaction, YearGrid)
- **PDF Generation**: `jspdf` for official 31-article multi-page contracts, check-in records, and rental invoices
- **Payment Gateway**: Official Redsys TPV (Tarjeta bancaria / Bizum) with 3DES CBC key diversification and HMAC-SHA256 digital signature, online webhook notification (`/api/webhooks/redsys`)
- **Visual Design (Round 3)**: Cinematic Dark Mode / Outdoor Nocturno aesthetic (charcoal matte surfaces #0B0D11 / #0F1115 / #14171D, warm gold/amber accents #E5C07B / #D4AF37 / #C8A882, dark glassmorphism backdrop-blur-md, editorial typography with italic accents, Framer Motion spring physics and layoutId indicators, interactive technical blueprints with engineering hotspots).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dashboard Overview | Active booking hero card, countdown, GPS pickup link, driver validation status, emergency cards, empty state, dynamic extras mapping | M1 | R1 |
| 2 | User Profile & Driver License | Contact phone, address, DNI/NIE, license issue/expiry validation, expired blocking, <2 year warning, front/back uploads, second driver toggle | M1 | R1 |
| 3 | Documentation & Digital Contract | Live verification states, digital signature modal with Retina canvas, storage upload, multi-page PDF generation/download, clean empty state when 0 bookings | M1 | R1 |
| 4 | Camper Operation Manual | 12V/220V Victron guide, water tanks/boiler, heating/fridge, gas stove operation & safety, SPACE pop-up roof / drop-down electric bed, interactive troubleshooting accordion for frequent issues, working PDF guide link | M1 | R1 |
| 5 | Mallorca Travel Guide | 35 GPS spots across 5 zones, 3 camper routes, interactive 3D relief Leaflet map, Mallorca overnight & camping regulations (DGT 08/V-74), directory of water refill/dumping points, nomad life tips | M1 | R1 |
| 6 | Admin KPI Dashboard | Confirmed revenue, active bookings, pending payments, registered users count, recent bookings table | M2 | R2 |
| 7 | Bookings Management | Status filtering tabs, real-time search, financial breakdown & extras detail modal, approval & Stripe refund flows | M2 | R2 |
| 8 | Occupancy Calendar | FullCalendar timeline/grid by vehicle, pickup/return hours, event details, blocked dates | M2 | R2 |
| 9 | Campers Fleet Management | Fleet inventory table, technical specs (seats, beds, deposit), active/maintenance status toggle, interactive edit/create/delete modal & API persistence | M2 | R2 |
| 10 | Document Verification Queue | Queue with signed document URLs, license issue/expiry validation badges, approve action, reject action with explicit rejection reason modal, and inline image zoom/lightbox | M2 | R2 |
| 11 | Users & Clients Management | Client table, real-time search, detail modal with 3 tabs (personal data, documents with zoom, booking history), direct validation | M2 | R2 |
| 12 | Contract Template Editor | Visual editor for rental terms, company legal data, 31 legal clauses with live search, real-time PDF preview, persistence in DB and reset to factory defaults | M2 | R2 |
| 13 | Season Rates & Base Pricing | High/mid/low season dates, minimum stay editing, rental extras catalog, and editing/persisting base nightly pricing (`price_per_night`) | M2 | R2 |
| 14 | Automated Test Verification | Complete test suite passes with 0 failures (`npm.cmd test`) | M3 | R3 |
| 15 | Production Build Verification | Next.js Turbopack build compiles with exit code 0 (`npm.cmd run build`) | M3 | R3 |
| 16 | Adversarial Coverage Hardening | White-box stress-testing: boundary values, invalid inputs, edge cases, error feedback | M4 | R3/R4 |
| 17 | Independent Black-Box Brand Audit | Independent evaluators verifying Apple/Emil Kowalski finish, microinteractions, responsive design, empty states, error handling, and cross-panel consistency | M5 | R4 |
| 18 | Database Schema & Pricing Engine V2 | Extended `bookings` schema (KM, cancellation, time slots, customer DNI & address, pricing breakdown), categorized `extras` (Equipamiento, Deporte, Confort), and `calculatePriceV2` extension for KM and cancellation supplements | M6 | Follow-up R1/R2 |
| 19 | Redsys Payment Form & Webhook Auto-Block | Endpoint `/api/bookings/checkout` generating signed Redsys parameters; `/api/webhooks/redsys` validating HMAC-SHA256 signature, setting booking status to paid, inserting auto-blocks in `blocked_dates`, keeping status pending admin approval | M6 | Follow-up R2 |
| 20 | Multi-Step Wizard Page (/[locale]/reserva/[slug]) | Dedicated full-screen Holo-Van inspired booking page with header thumbnails, model, step progress bar, and bottom navigation bar | M7 | Follow-up R1 |
| 21 | Step 1: Fechas y Horarios | Real-time calendar with morning/afternoon slots (09:00-12:00 / 15:00-19:00), real-time availability check, passenger selector | M7 | Follow-up R1 |
| 22 | Step 2: Paquete de Kilometraje | Comparison cards: 150 km/día included vs. Ilimitado (+15 €/día) with dynamic day multiplier | M7 | Follow-up R1 |
| 23 | Step 3: Política de Cancelación | Policy cards: Estándar included (modification >60d) vs. Flexible (+8 €/día, graduated refund 100% >30d, 50% 29-15d, 1 free change >15d) | M7 | Follow-up R1 |
| 24 | Step 4: Experiencias y Extras Categorizados | Interactive cards grouped by Equipamiento, Deporte, Confort with unit or daily prices, quantity selector, and live price integration | M7 | Follow-up R1 |
| 25 | Step 5: Datos Personales & Checkout | Complete checkout form (name, surname, travelers, DNI/NIE, phone, email, address, notes), frictionless Supabase user creation/linking, direct Redsys payment form submission | M7 | Follow-up R1 |
| 26 | Sticky Trip Summary ("YOUR TRIP") | Lateral floating card recalculating in real-time all amounts (base rental, KM supplement, cancellation supplement, extras, subtotal, 1.000 € deposit, included services) | M7 | Follow-up R1 |
| 27 | Admin Bookings Detail Sync | Enhanced `BookingDetailModal.tsx` showing KM package, cancellation policy, itemized financial breakdown, categorized extras, and client contact/billing data | M8 | Follow-up R3 |
| 28 | Admin Calendar Blocked Dates Sync | Update `/admin/calendar` page and `CalendarClient.tsx` to query and render `blocked_dates` (Redsys auto-blocks and maintenance holds) | M8 | Follow-up R3 |
| 29 | User Dashboard Booking Sync | Update `/dashboard` to properly show `"Pagada · En Aprobación Admin"` when `payment_status === 'paid' && status === 'pending'`, render dynamic pickup/dropoff slots, link to `/dashboard/documentos` | M8 | Follow-up R3 |
| 30 | E2E Test Suite (Tiers 1-4) & TEST_READY.md | 5 comprehensive integration test suites (`r4_pricing_flow`, `r4_wizard_validation`, `r4_redsys_gateway`, `r4_calendar_sync`, `r4_portals_sync`) via Node.js test runner | M9 | Follow-up R4 |
| 31 | Final Verification & Adversarial Hardening | 100% tests passing (`npm test`), clean build (`npm run build`), Challenger verification, Forensic Audit CLEAN | M9 | Follow-up R4 |
| 32 | Dark Mode Hero with Background Video & Search | Immersive night video (`public/videos/video_noche_min.mp4`, 4.2MB), poster fallback, gradient vignette, editorial typography, dark glassmorphic search bar linking to `/reserva/[slug]` or Showcase | M10 | Round 3 R1 |
| 33 | Interactive Camper Showcase NEO & SPACE | Fluid spring toggle between NEO & SPACE, 4 exploration modes (Exterior, Interior, Technical Blueprint with hotspots, Video Tour), direct CTA -> `/[locale]/reserva/[slug]` | M11 | Round 3 R2 |
| 34 | Editorial Craftsmanship & Engineering Section | "Ingeniería & Artesanía" section with `public/images/brand/` photography and spotlight hover cards with Framer Motion micro-interactions | M12 | Round 3 R3 |
| 35 | Mallorca Experiences, Routes & Lifestyle Section | Mallorca outdoor lifestyle section using `public/images/lifestyle/`, video clips, fixing placeholder paths | M12 | Round 3 R3 |
| 36 | Dark Mode FAQ & Footer Harmonization | Harmonized charcoal accordion cards, subtle borders, amber highlights, and polished dark footer | M12 | Round 3 R3 |
| 37 | Enhanced Camper Detail Page & Reservation Linkage | Product detail update: fix `neo-top.webp` 404, embed technical blueprint tab, video clips, and update `PriceCalculator.tsx` booking button to route to `/[locale]/reserva/[slug]` | M12 | Round 3 R4 |
| 38 | Performance, Accessibility & Full Test Suite Pass | Lazy loading for heavy media, `prefers-reduced-motion` compliance, 220/220 tests passing (`npm.cmd test`), clean production build (`npm.cmd run build`) | M13 | Round 3 R5 |
| 39 | Challenger Adversarial Verification & Forensic Audit Gate | Code-executing adversarial challenge & independent forensic audit gate verification | M13 | Round 3 R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | User Area (/dashboard) Polish & Completion | Complete gas stove, roof bed, troubleshooting in manual; overnight regs, water points, nomad tips in guide; dynamic extras in dashboard; empty state in documents | none | DONE |
| M2 | Admin Area (/admin) Polish & Completion | Interactive CRUD modal in campers; rejection reason modal & image zoom in verifications; base nightly price editing in settings | none | DONE |
| M3 | Automated Technical Verification | Full test suite (`npm.cmd test`) and production build (`npm.cmd run build`) passing 100% | M1, M2 | DONE |
| M4 | Adversarial Coverage Hardening (Tier 5) | Stress testing, edge cases, malformed payloads, boundary conditions | M3 | DONE |
| M5 | Black-Box Brand & Functional Quality Audit | Independent black-box audit for luxury UX, responsiveness, micro-interactions, empty states, consistency | M4 | DONE |
| M6 | Backend, Database Schema & Redsys Webhook | `bookings` & `extras` schema extension, `calculatePriceV2` KM & cancellation supplements, `/api/bookings/checkout` and `/api/webhooks/redsys` auto-blocking | M1-M5 | DONE |
| M7 | Dedicated Multi-Step Booking Wizard (/[locale]/reserva/[slug]) | 5-step wizard (Dates/Slots, KM, Cancellation, Categorized Extras, Personal Data & Checkout), Sticky Summary, Bottom Navigation | M6 | DONE |
| M8 | Admin & User Portals Synchronization | `/admin/bookings` detail modal enhancements, `/admin/calendar` `blocked_dates` rendering, `/dashboard` status badge & dynamic time slots | M6, M7 | DONE |
| M9 | Dual Track Convergence, E2E Testing & Quality Gate | Tiers 1-4 test execution, Tier 5 adversarial hardening, 100% test pass, exit code 0 build, Clean Forensic Audit | M6, M7, M8 | DONE |
| M10 | Hero Cinematográfico Dark Mode & Buscador Integrado | Dark video background (`video_noche_min.mp4`), poster fallback, editorial typography, dark glassmorphic search bar linking to `/reserva/[slug]` or Showcase | none | DONE |
| M11 | Showcase Interactivo de Campers NEO & SPACE | Model toggle (NEO/SPACE), 4 exploration modes (Exterior, Interior, Technical Blueprint with Hotspots, Video Tour), direct CTA -> `/[locale]/reserva/[slug]` | M10 | DONE |
| M12 | Secciones Editoriales, FAQ Dark & Ficha Camper Detail | "Ingeniería & Artesanía" (brand photos), "Rutas y Experiencias" (lifestyle), FAQ dark mode, Camper Detail (/campers/[slug]) multimedia upgrade & PriceCalculator booking linkage fix | M11 | DONE |
| M13 | Rendimiento, Accesibilidad & Verificación de Suite Completa | Lazy loading, prefers-reduced-motion, 243/243 test pass, clean production build, Challenger verification & Forensic Auditor Gate CLEAN | M12 | DONE |

## Interface Contracts
### Hero Search & Showcase ↔ Booking Wizard
- URL target: `/[locale]/reserva/[slug]`
- Query parameters passed:
  - `from`: string (`YYYY-MM-DD`) -> maps to `step1.startDate`
  - `to`: string (`YYYY-MM-DD`) -> maps to `step1.endDate`
  - `pax`: string / number -> maps to `step1.pax`
- Consumed by `app/[locale]/reserva/[slug]/page.tsx` and `BookingWizardClient.tsx`.

### Camper Detail PriceCalculator ↔ Booking Wizard
- `PriceCalculator.tsx`:
  - `handleReserve`: redirects to `/${locale}/reserva/${camperSlug}?from=${startDate}&to=${endDate}&startSlot=${startSlot}&endSlot=${endSlot}&pax=${pax}&extras=${extras}` instead of legacy `/checkout`.

### Blueprint Hotspots Data Contract
- Each hotspot item contains:
  - `id`: string
  - `title`: string
  - `description`: string
  - `x`: number (percentage coordinate on blueprint 0-100)
  - `y`: number (percentage coordinate on blueprint 0-100)
  - `category`: 'electrical' | 'comfort' | 'interior' | 'tech' | 'storage'
  - `image`: string (path in `public/images/campers/[slug]/...`)
  - `specBadge`: string

### Color & Token System (Dark Mode / Outdoor Nocturno)
- Base background: `#0B0D11` (void dark), `#0F1115` (charcoal primary), `#14171D` (card surface), `#1B1F27` (card elevated)
- Warm accents: `#E5C07B` (antique gold), `#D4AF37` (champagne gold), `#D97706` (warm amber), `#C8A882` (warm sand)
- Text: `#FFFFFF` (primary), `rgba(255, 255, 255, 0.72)` (secondary), `rgba(255, 255, 255, 0.45)` (muted)
- Glassmorphism: `rgba(15, 17, 21, 0.78)` background with `backdrop-blur-md` (20px blur) and `rgba(255, 255, 255, 0.08)` border.

## Code Layout
- `components/home/HeroSection.tsx`: Dark mode video hero, typography, and dark glass search bar
- `components/home/CamperShowcase.tsx`: (New / Refactored) 4-mode interactive camper showcase (NEO/SPACE)
- `components/home/WhyUtopia.tsx`: "Ingeniería & Artesanía" editorial section with spotlight cards
- `components/home/ExperiencesSection.tsx`: Mallorca routes and lifestyle showcase
- `components/home/FAQSection.tsx` & `components/faq/FAQAccordionList.tsx`: Dark mode FAQ
- `app/[locale]/campers/[slug]/page.tsx` & `CamperDetailClient.tsx`: Camper detail page multimedia upgrade & blueprint
- `components/booking/PriceCalculator.tsx`: Camper detail price calculation and wizard linkage
- `components/layout/Navbar.tsx`: Transparent/dark glass aesthetic for public landing
- `tests/`: Automated test suite (19 test files, 220 tests, must maintain 100% pass)
