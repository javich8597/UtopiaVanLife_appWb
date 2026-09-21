# E2E Test Infra: Utopia Van Life — User & Admin Portals

## Test Philosophy
- Opaque-box & transparent verification, requirement-driven per `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis + Real-World Workload Testing.
- Pass/Fail Semantics: 100% test pass rate with 0 failures (`npm.cmd test`), clean production compilation with exit code 0 (`npm.cmd run build`).

## Feature Inventory & Test Coverage
| # | Feature | Requirement Source | Tier 1 (Happy Path) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Workloads) |
|---|---------|-------------------|:-------------------:|:-------------------:|:---------------------:|:------------------:|
| 1 | Dashboard Overview | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Profile & License | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Documents & Contract Sign | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Camper Manual | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Mallorca Guide | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | Admin Dashboard | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Bookings Management | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | Occupancy Calendar | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 9 | Campers Management | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 10 | Verifications Queue | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 11 | Users Management | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 12 | Contract Editor | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 13 | Season Settings | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Node.js test runner (`tsx --test tests/**/*.test.ts`)
- **Suites**:
  - `tests/admin/auth.test.ts`: Admin role authorization & security
  - `tests/admin/verification.test.ts`: Driver verification state normalization
  - `tests/admin/refund.test.ts`: Refund rules and validation
  - `tests/admin/pricing.test.ts`: Pricing engine, high/mid/low seasons, extras
  - `tests/availability/*.test.ts`: Calendar slots, date normalization, availability
  - `tests/contracts/*.test.ts`: Contract data generation, 31 articles, PDF generation, template service
  - `tests/e2e/*.test.ts`: User and admin portals end-to-end integration flows

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full User Onboarding & Rental Agreement | Profile completion, license validation, digital signature, PDF download | High |
| 2 | Camper Handover & Manual Consultation | Troubleshooting resolution, gas/roof operating guidelines, Mallorca route planning | Medium |
| 3 | Admin Fleet Operations & Availability | Camper fleet updates, calendar blocking, season price configuration | High |
| 4 | Document Review & Approval / Rejection | Pending verification queue, license expiration checks, rejection with explicit reason | Medium |
| 5 | Booking Lifecycle & Refund Processing | Search booking, inspect financial breakdown, approve or process Stripe refund | High |
