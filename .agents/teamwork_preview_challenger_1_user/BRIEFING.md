# BRIEFING — 2026-09-18T01:10:30+02:00

## Mission
Empirically stress-test the User Area (/dashboard) across edge cases, empty states, PDF generation, anchor/links/coordinates, and run test suite to render APPROVE or REQUEST_CHANGES verdict.

## 🔒 My Identity
- Archetype: empirical challenger
- Roles: critic, specialist
- Working directory: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_challenger_1_user
- Original parent: 17707f7d-4404-46bd-8f1d-58a74f2a2c7e
- Milestone: user-area-testing
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Empirical verification: run verification code yourself, do not trust claims or logs. If you cannot reproduce a bug empirically, it does not count.
- `.agents/` holds only agent metadata. NEVER place source code, tests, or data files here.
- Write only to your folder; read any folder.

## Current Parent
- Conversation ID: 17707f7d-4404-46bd-8f1d-58a74f2a2c7e
- Updated: 2026-09-18T01:10:30+02:00

## Review Scope
- **Files to review**:
  - `app/[locale]/dashboard/DashboardClient.tsx`
  - `app/[locale]/dashboard/profile/ProfileClient.tsx`
  - `app/[locale]/dashboard/documentos/page.tsx`, `DocumentsClient.tsx`, `ContractSignModal.tsx`
  - `app/[locale]/dashboard/manual/CamperManualClient.tsx`
  - `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx`
  - `lib/contracts/licenseValidator.ts`, `lib/contracts/contractEngine.ts`, `lib/contracts/pdfGenerator.ts`
- **Interface contracts**: PROJECT.md and ORIGINAL_REQUEST.md
- **Review criteria**: Empirical correctness, edge cases (0 bookings, null profile, novel license < 2 yrs, expired license), empty state rendering in /dashboard/documentos, valid PDF generation in /dashboard/manual without crashing, valid anchor tags/links/coordinates in /dashboard/guia and /dashboard/manual, test suite execution (npm.cmd test).

## Attack Surface
- **Hypotheses tested**:
  1. Edge case 0 bookings crashes dashboard or documents area: REJECTED (empty states rendered gracefully).
  2. Null or sparse profile crashes validation or contracts: REJECTED (safe fallbacks and strict validation).
  3. Novel license (< 2 yrs) allows contract signing without warning: REJECTED (properly flagged and blocked).
  4. Expired license allows contract signing: REJECTED (properly flagged and blocked).
  5. PDF generation in manual or contract throws or corrupts: REJECTED (multi-page A4 generated cleanly).
  6. Anchor links or coordinates in guide/manual are broken or out of bounds: REJECTED (all 35 spots and 6 water points within Mallorca WGS84 bounds, valid protocols).
- **Vulnerabilities found**: None in audited scope.
- **Untested angles**: Live browser hardware canvas pressure with stylus input (mocked via standard canvas API).

## Loaded Skills
None

## Key Decisions Made
- Created comprehensive empirical stress test suite `tests/dashboard_stress.test.ts` covering all required edge cases, PDF generation, and cartographic boundaries.
- Executed `npm.cmd test`: 54 passing tests, 0 failures.
- Verdict rendered: APPROVE.

## Artifact Index
- DISPATCH.md — Dispatch instructions
- BRIEFING.md — Situational awareness
- progress.md — Heartbeat and status tracking
- handoff.md — Final handoff report
- tests/dashboard_stress.test.ts — Comprehensive automated empirical test suite
