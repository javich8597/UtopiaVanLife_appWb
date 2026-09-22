# TEST_INFRA.md — Utopia Van Life Test Infrastructure & Quality Architecture

## 1. Overview & Testing Philosophy

Utopia Van Life adopts an **opaque-box, requirement-driven testing architecture** grounded strictly in `ORIGINAL_REQUEST.md` and `PROJECT.md`. The test infrastructure guarantees that all critical business logic—pricing calculations, booking wizard validation, Redsys cryptographic signatures, calendar synchronization, and portal state presentation—functions deterministically and securely.

### Core Principles
- **Opaque-Box Verification**: Tests validate observable behaviors, contract inputs/outputs, error handling, and business constraints rather than brittle internal implementation details.
- **Zero External Test Dependencies**: The project uses the modern **Node.js 20+ native test runner** (`node:test` and `node:assert/strict`) combined with `tsx` for high-speed TypeScript execution without Jest/Vitest overhead (~800ms for full test execution).
- **Independence & Isolation**: Every test is self-contained, sets up its own state, executes deterministically in any order, and produces zero cross-test side effects.
- **Progressive Testability & Backward Compatibility**: R4 test suites extend test coverage for the dedicated multi-step booking engine while maintaining 100% pass rates across all existing legacy test suites (Campers, Contracts, Seasons, Dashboard, Admin).

---

## 2. Execution Commands & Test Runner Configuration

The test suite is configured in `package.json` and executed natively via `tsx`:

```bash
# Execute all Round 4 test suites
npx.cmd tsx --test tests/r4_*.test.ts

# Execute the entire application test suite (Legacy + Round 4)
npm.cmd test

# Type-checking verification
npx.cmd tsc --noEmit

# Production build verification (Turbopack)
npm.cmd run build
```

---

## 3. Test Suites & Tiered Coverage Architecture

The Round 4 test suite is partitioned into 5 dedicated test modules mapped across 4 coverage tiers:

```
tests/
├── r4_pricing_flow.test.ts        # Pricing Engine: KM packages, cancellation policies, extras, slots
├── r4_wizard_validation.test.ts   # Booking Wizard: Step 1-5 schemas, Spanish DNI/NIE, negative inputs
├── r4_redsys_gateway.test.ts      # Redsys TPV: 3DES CBC, HMAC-SHA256, URL-safe signatures, webhook codes
├── r4_calendar_sync.test.ts       # Calendar Sync: Webhook auto-blocking, conflict prevention, idempotency
└── r4_portals_sync.test.ts        # Portals Sync: Admin detail modal, calendar blocked dates, user dashboard
```

### Coverage Tiers

| Tier | Name | Focus | Suites |
|---|---|---|---|
| **Tier 1** | Primary Functionality & Enums | Happy path validation, enumeration constraints, fee calculation, Redsys request formatting | `r4_pricing_flow`, `r4_wizard_validation`, `r4_redsys_gateway` |
| **Tier 2** | Boundary & Cryptographic Hardening | 1-night stays, 30+ day rentals, high/low season cross-over, 3DES key diversification, malformed emails/DNIs | `r4_pricing_flow`, `r4_wizard_validation`, `r4_redsys_gateway`, `r4_calendar_sync` |
| **Tier 3** | Asynchronous Sync & Idempotency | Redsys webhook payload decoding, `blocked_dates` insertion, duplicate delivery idempotency, failure code handling | `r4_redsys_gateway`, `r4_calendar_sync`, `r4_portals_sync` |
| **Tier 4** | Cross-Portal State Mapping | Admin modal detail mapping, Admin FullCalendar event rendering, User Dashboard status badge mapping | `r4_portals_sync` |

---

## 4. Test Specifications by Module

### 4.1. `tests/r4_pricing_flow.test.ts`
- **Tier 1 (Core Pricing Rules)**:
  - **KM Packages**: `included_150` (0,00 €) vs `unlimited` (+15,00 €/day × totalDays).
  - **Cancellation Policies**: `standard` (0,00 €) vs `flexible` (+8,00 €/day × totalDays).
  - **Categorized Extras**: Fixed (`per_rental`) vs daily (`per_day`), quantity multipliers, category grouping (Equipamiento, Deporte, Confort).
  - **Pickup / Dropoff Slots**: Afternoon pickup + Morning dropoff (0 extra cost); Morning pickup (+0.5 day); Afternoon dropoff (+0.5 day); Morning pickup + Afternoon dropoff (+1.0 day).
- **Tier 2 (Boundary & Edge Conditions)**:
  - 1-night minimal stays.
  - Zero extras selected.
  - Extended 30+ day rentals (duration discounts applied to base rental while KM/cancellation apply across all days).
  - High vs Low season pricing variations and cross-season date ranges.
  - Segregation of the 1.000 € refundable deposit hold from payable total.

### 4.2. `tests/r4_wizard_validation.test.ts`
- **Tier 1 (Step 1-5 Happy Path Validation)**:
  - **Step 1**: Valid date ranges (`start_date < end_date`), valid pickup/dropoff slots, season minimum nights enforcement.
  - **Step 2**: KM package enum validation (`'included_150' | 'unlimited'`).
  - **Step 3**: Cancellation policy enum validation (`'standard' | 'flexible'`).
  - **Step 4**: Categorized extras selection (optional/empty or positive integer quantities).
  - **Step 5**: Personal and billing information validation (Full Name, Spanish DNI/NIE or Passport, RFC 5322 email, phone, billing address, travelers count within camper capacity).
  - **State Preservation**: Reversible wizard navigation preserves all entered data across step transitions.
- **Tier 2 (Negative & Boundary Cases)**:
  - Rejection of invalid Spanish DNI/NIE checksums.
  - Rejection of malformed email addresses (missing `@`, invalid domains, whitespace).
  - Rejection of past dates and inverted dates (`end_date <= start_date`).
  - Rejection of stays below minimum season nights.
  - Rejection of missing mandatory fields and travelers counts exceeding camper berth capacity.

### 4.3. `tests/r4_redsys_gateway.test.ts`
- **Tier 1 (Parameters & Encoding)**:
  - Redsys order ID format: 4 to 12 alphanumeric characters, starting with strictly 4 numeric digits.
  - Amount conversion: Euro amounts converted into exact integer cents strings (`525.50 € => "52550"`).
  - Currency: Strictly numeric ISO 4217 code `978` (EUR).
  - Transaction Type: Strictly `'0'` (Autorización estándar).
  - Webhook and callback URLs verification (`DS_MERCHANT_MERCHANTURL`, `DS_MERCHANT_URLOK`, `DS_MERCHANT_URLKO`).
- **Tier 2 (Cryptographic Security)**:
  - 3DES CBC key diversification with zero IV and zero-padded order buffer.
  - HMAC-SHA256 signature generation over Base64 parameters using diversified key.
  - Signature verification with URL-safe character mapping (`-` for `+`, `_` for `/`).
  - Rejection of tampered payloads and unauthorized secret keys.
- **Tier 3 (Webhook Decoding & Response Codes)**:
  - Base64 payload decoding into `RedsysNotificationParams`.
  - Detection of authorization success codes (`0000` to `0099`).
  - Proper classification of decline and error codes (`0101`, `0184`, `0904`, `9102`, `9915`).

### 4.4. `tests/r4_calendar_sync.test.ts`
- **Tier 2 & 3 (Auto-Blocking & Availability Sync)**:
  - Webhook notification triggers auto-block creation in `blocked_dates` with `session_id: 'redsys_<orderId>'`.
  - Immediate reflection in availability checks: booked dates are blocked for subsequent booking attempts.
  - Turnover slot management: consecutive bookings allowed when previous booking checks out in morning and next booking checks in afternoon.
  - Webhook Idempotency: duplicate delivery of identical Redsys notification does not generate duplicate `blocked_dates` records.
  - Payment failure: decline codes do not create `blocked_dates` records, leaving dates open for other travelers.

### 4.5. `tests/r4_portals_sync.test.ts`
- **Tier 3 & 4 (Cross-Portal Presentation & Linking)**:
  - **Admin Bookings Detail Modal**:
    - KM package label and daily supplement mapping.
    - Cancellation policy label and daily supplement mapping.
    - Itemized breakdown (base rental, duration discount, KM supplement, cancellation supplement, extras subtotal, total charged, Redsys order badge, refundable deposit).
    - Grouped categorized extras display (Equipamiento, Deporte, Confort).
    - Full client contact and billing address presentation.
  - **Admin Calendar Event Mapping**:
    - Auto-blocked dates mapped to FullCalendar events with `🔒 Auto-Bloqueo Redsys (#<orderId>)` and custom warning styling.
    - Maintenance blocks mapped to `⛔ Bloqueo Flota (<reason>)`.
    - 12-month year grid occupancy reflection for blocked dates.
  - **User Dashboard Status Badge**:
    - Mappings for `confirmed`, `paid-pending` (`"Pagada · En Aprobación Admin"` when `payment_status: 'paid'` and `status: 'pending'`), and `pending` (`"Pendiente de Pago"`).
    - Dynamic display of chosen pickup/dropoff hours.
  - **Official Digital Contract Linkage**:
    - Verification that generated contract data reflects the booked camper, dates, customer identity, and financial breakdown.

---

## 5. Quality Gate Verification Workflow

Before publishing `TEST_READY.md` or approving pull requests, the following three-step verification gate must pass:

1. **Test Suite Execution**:
   ```bash
   npx.cmd tsx --test tests/r4_*.test.ts
   npm.cmd test
   ```
   *Pass criteria*: 100% tests passing, 0 failed, 0 skipped.

2. **TypeScript Compilation**:
   ```bash
   npx.cmd tsc --noEmit
   ```
   *Pass criteria*: Exit code 0, 0 compiler errors.

3. **Production Build**:
   ```bash
   npm.cmd run build
   ```
   *Pass criteria*: Next.js Turbopack build succeeds with exit code 0.
