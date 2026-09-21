# Project: Utopia Van Life — User & Admin Portals

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Internationalization**: `next-intl` (locales: `es`, `en`, `de`, `fr`, default `es`; `/admin` strictly enforces `es`)
- **Styling**: Tailwind CSS v4, global CSS variables in `app/globals.css`, scoped styled-jsx for interactive dashboards, Lucide icons, Framer Motion
- **Database & Storage**: Supabase SSR client for user session, Supabase Service Role client (`supabaseAdmin`) for privileged administrative mutations and Storage bucket (`documents`) signed URLs
- **Mapping**: Leaflet with custom tiles and Google 3D relief layers
- **Calendar**: FullCalendar v6 (DayGrid, TimeGrid, Interaction, YearGrid)
- **PDF Generation**: `jspdf` for official 31-article multi-page contracts, check-in records, and rental invoices

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

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | User Area (/dashboard) Polish & Completion | Complete gas stove, roof bed, troubleshooting in manual; overnight regs, water points, nomad tips in guide; dynamic extras in dashboard; empty state in documents | none | DONE |
| M2 | Admin Area (/admin) Polish & Completion | Interactive CRUD modal in campers; rejection reason modal & image zoom in verifications; base nightly price editing in settings | none | DONE |
| M3 | Automated Technical Verification | Full test suite (`npm.cmd test`) and production build (`npm.cmd run build`) passing 100% | M1, M2 | DONE |
| M4 | Adversarial Coverage Hardening (Tier 5) | Stress testing, edge cases, malformed payloads, boundary conditions | M3 | DONE |
| M5 | Black-Box Brand & Functional Quality Audit | Independent black-box audit for luxury UX, responsiveness, micro-interactions, empty states, consistency | M4 | DONE |

## Interface Contracts
### User Documentation ↔ Contract Engine
- `contractEngine.generateContractData(profile, booking, customTerms?)`: Generates contract payload with 31 articles, rental parameters, and parties data.
- `pdfGenerator.generateOfficialContractPdfBlob(contractData, signatureBase64)`: Generates multi-page PDF blob.
- `POST /api/contracts/sign`: `{ bookingId: string, signatureDataUrl: string }` -> `{ success: boolean, pdfUrl: string, signedAt: string }`

### Admin Campers CRUD ↔ API
- `POST /api/admin/campers`: Create new camper with name, slug, specs, deposit, pricing.
- `PATCH /api/admin/campers/[id]`: Update specs (seats, beds, deposit), `is_active`, `is_available`.
- `DELETE /api/admin/campers/[id]`: Remove or archive camper.

### Admin Verifications ↔ API
- `POST /api/admin/verify-doc`: `{ userId: string, action: 'approve' | 'reject', reason?: string }` -> Updates `users.verification_status` and logs `document_validations.rejected_reason`.

### Admin Seasons ↔ Pricing API
- `PATCH /api/admin/seasons/[id]`: `{ min_nights?: number, discount_7days_pct?: number, price_per_night?: number }` -> Updates season settings and base nightly rates.

## Code Layout
- `app/[locale]/dashboard/`: User area pages (`page.tsx`, `layout.tsx`, `DashboardClient.tsx`, `DashboardNavClient.tsx`)
  - `profile/`: `ProfileClient.tsx`
  - `documentos/`: `DocumentsClient.tsx`, `ContractSignModal.tsx`
  - `manual/`: `CamperManualClient.tsx`
  - `guia/`: `MallorcaGuideClient.tsx`
- `app/[locale]/admin/`: Admin area pages (`page.tsx`, `layout.tsx`, `AdminNavClient.tsx`, `AdminSidebarFooterClient.tsx`)
  - `bookings/`: `BookingsClient.tsx`, `BookingDetailModal.tsx`, `ApproveActionClient.tsx`, `RefundActionClient.tsx`
  - `calendar/`: `CalendarClient.tsx`
  - `campers/`: `CampersClient.tsx`
  - `verifications/`: `ValidationActionsClient.tsx`, `VerificationsClient.tsx`
  - `users/`: `UsersTableClient.tsx`, `CustomerDetailModal.tsx`
  - `contrato/`: `ContractTemplateClient.tsx`
  - `settings/`: `SeasonsTableClient.tsx`
- `app/api/admin/`: Admin API endpoints
- `lib/`: Shared utilities, contracts, pricing, auth, supabase
- `tests/`: Automated unit, integration, and E2E test suites
