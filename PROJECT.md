# Project: Utopia Van Life — User & Admin Portals & Premium Booking Flow

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Internationalization**: `next-intl` (locales: `es`, `en`, `de`, `fr`, default `es`; `/admin` strictly enforces `es`)
- **Styling**: Tailwind CSS v4, global CSS variables in `app/globals.css`, scoped styled-jsx for interactive dashboards, Lucide icons, Framer Motion
- **Database & Storage**: Supabase SSR client for user session, Supabase Service Role client (`supabaseAdmin`) for privileged administrative mutations and Storage bucket (`documents`) signed URLs
- **Mapping**: Leaflet with custom tiles and Google 3D relief layers
- **Calendar**: FullCalendar v6 (DayGrid, TimeGrid, Interaction, YearGrid)
- **PDF Generation**: `jspdf` for official 31-article multi-page contracts, check-in records, and rental invoices
- **Payment Gateway**: Official Redsys TPV (Tarjeta bancaria / Bizum) with 3DES CBC key diversification and HMAC-SHA256 digital signature, online webhook notification (`/api/webhooks/redsys`)

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

## Interface Contracts
### Booking Engine ↔ Pricing Engine
- `calculatePriceV2(params)`:
  - Input: `{ camperId, startDate, endDate, pickupSlot?, dropoffSlot?, kmPackage?: 'included_150' | 'unlimited', cancellationPolicy?: 'standard' | 'flexible', extrasSelected?: Array<{ extraId: string, quantity: number, pricingType: 'per_day' | 'fixed', price: number, name: string, category: string }> }`
  - Output: `PricingBreakdown { basePrice, nights, kmPackage, kmSupplement, cancellationPolicy, cancellationSupplement, slotSupplement, extrasSubtotal, discountAmount, totalPrice, depositAmount, itemizedExtras }`

### Checkout API ↔ Redsys Gateway
- `POST /api/bookings/checkout`:
  - Input: `{ camperSlug, startDate, endDate, pickupSlot, dropoffSlot, kmPackage, cancellationPolicy, extras, customer: { fullName, email, phone, dniNie, address, city, postalCode, country, travelersCount, notes } }`
  - Logic: Validates availability, creates/links Supabase user, verifies server-side price, persists `bookings` record with `payment_status: 'pending'`, signs Redsys parameters with `createRedsysPaymentForm`.
  - Output: `{ success: true, bookingId, redsys: { url, params: Ds_MerchantParameters, signature: Ds_Signature, version: Ds_SignatureVersion } }`

### Redsys Webhook ↔ Supabase Database
- `POST /api/webhooks/redsys`:
  - Validates `Ds_Signature` using HMAC-SHA256 and merchant key.
  - Updates `bookings` record: `payment_status: 'paid'`, `payment_intent_id: orderId`, `status: 'pending'` (pending manual admin approval).
  - Inserts auto-block into `blocked_dates`: `{ camper_id, start_date, end_date, session_id: 'redsys_' + orderId }`.

### Admin Bookings ↔ Booking Model
- `BookingDetailModal` consumes `booking`:
  - Reads `booking.km_package`, `booking.km_price`, `booking.cancellation_policy`, `booking.cancellation_price`, `booking.pricing_breakdown`, `booking.customer_dni`, `booking.customer_address`, `booking.travelers_count`.

### Admin Calendar ↔ Availability Model
- `app/[locale]/admin/calendar/page.tsx` fetches `campers`, `bookings`, and `blocked_dates`.
- `CalendarClient.tsx` accepts `blocked_dates: any[]` and displays auto-blocks as locked calendar events (`🔒 Auto-Bloqueo Redsys / Bloqueo de Fechas`).

## Code Layout
- `app/[locale]/reserva/[slug]/`: Dedicated multi-step booking page (`page.tsx`, `BookingWizardClient.tsx`, `WizardHeader.tsx`, `Step1Dates.tsx`, `Step2Mileage.tsx`, `Step3Cancellation.tsx`, `Step4Extras.tsx`, `Step5Checkout.tsx`, `StickyTripSummary.tsx`, `WizardBottomBar.tsx`)
- `app/api/bookings/checkout/`: Checkout & Redsys form generation endpoint (`route.ts`)
- `app/api/webhooks/redsys/`: Redsys payment webhook notification endpoint (`route.ts`)
- `lib/pricing/`: Pricing calculation engine (`engine.ts`, `types.ts`)
- `lib/redsys.ts`: Redsys cryptographic signing and verification utilities
- `app/[locale]/admin/bookings/`: `BookingsClient.tsx`, `BookingDetailModal.tsx`
- `app/[locale]/admin/calendar/`: `page.tsx`, `CalendarClient.tsx`
- `app/[locale]/dashboard/`: `DashboardClient.tsx`, `DashboardNavClient.tsx`
- `tests/`: Automated test suites (`r4_pricing_flow.test.ts`, `r4_wizard_validation.test.ts`, `r4_redsys_gateway.test.ts`, `r4_calendar_sync.test.ts`, `r4_portals_sync.test.ts`, `stress_adversarial_challenger_1.test.ts`)
