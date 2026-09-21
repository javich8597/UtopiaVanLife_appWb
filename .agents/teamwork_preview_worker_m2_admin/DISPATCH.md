## 2026-09-17T22:57:02Z
You are the Admin Area Worker (worker_m2_admin).
Your working directory is: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_worker_m2_admin
The authoritative request is in: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\PROJECT.md
Survey handoff: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_explorer_survey_admin\handoff.md
Parent conversation ID: 17707f7d-4404-46bd-8f1d-58a74f2a2c7e

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (files you own exclusively):
- `app/[locale]/admin/campers/*`
- `app/[locale]/admin/verifications/*`
- `app/[locale]/admin/settings/*`
- `app/api/admin/campers/*` (create if needed)
- `app/api/admin/verify-doc/route.ts`
- `app/api/admin/seasons/[id]/route.ts`

Your Mission:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and the Admin survey handoff.
2. In `app/[locale]/admin/campers/`:
   - Replace the static "Nueva Camper", "Editar" and "Eliminar" buttons with interactive client functionality.
   - Implement an interactive modal for adding and editing camper specs (name, slug, seats, beds, deposit_amount, is_active, is_available: Disponible / Mantenimiento, base price).
   - Implement confirmation for delete/archive.
   - Implement the corresponding API route (`app/api/admin/campers/route.ts` and/or `app/api/admin/campers/[id]/route.ts`) supporting GET, POST, PATCH, DELETE with admin auth check (`isAdminUser`) and Supabase persistence.
3. In `app/[locale]/admin/verifications/`:
   - Update the rejection flow: when "Rechazar" is clicked, open a rejection reason dialog/modal offering predefined reasons ("Foto borrosa o ilegible", "Carnet de conducir caducado", "Conductor novel (< 2 años)", "Documento incompleto o cortado", "Otro") and custom text.
   - Send the reason in the POST payload to `app/api/admin/verify-doc/route.ts`.
   - Update `app/api/admin/verify-doc/route.ts` to persist `rejection_reason` (on `users` table or `document_validations`).
   - Add inline image zoom/lightbox modal so clicking any document thumbnail opens a high-res zoomed view with close button (matching `CustomerDetailModal.tsx` experience), avoiding reliance solely on opening external tabs.
4. In `app/[locale]/admin/settings/`:
   - Update `SeasonsTableClient.tsx` to display and allow editing of the base nightly price (`price_per_night`).
   - Update `app/api/admin/seasons/[id]/route.ts` to accept `price_per_night` and persist it to the database.
5. Verify your changes:
   - Run `npm.cmd test` and ensure 100% tests passing.
   - Run `npm.cmd run build` and ensure clean exit code 0.
6. Write your full report to `handoff.md` in your working directory and notify the parent via `send_message`.
