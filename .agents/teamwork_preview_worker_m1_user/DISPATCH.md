## 2026-09-17T22:57:00Z
You are the User Area Worker (worker_m1_user).
Your working directory is: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_worker_m1_user
The authoritative request is in: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\PROJECT.md
Survey handoff: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_explorer_survey_user\handoff.md
Parent conversation ID: 17707f7d-4404-46bd-8f1d-58a74f2a2c7e

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your write ownership (files you own exclusively):
- `app/[locale]/dashboard/DashboardClient.tsx`
- `app/[locale]/dashboard/documentos/DocumentsClient.tsx`
- `app/[locale]/dashboard/manual/CamperManualClient.tsx`
- `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx`

Your Mission:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and the Survey handoff.
2. In `app/[locale]/dashboard/DashboardClient.tsx`:
   - Map dynamic booking extras if present, with graceful fallback.
3. In `app/[locale]/dashboard/documentos/DocumentsClient.tsx`:
   - When the user has no bookings (`bookings.length === 0`), do NOT inject a hardcoded mock booking ("Javier Prieto"). Instead, render an elegant, premium empty state explaining that upcoming contracts, check-in records, and rental invoices will appear here once they book, with a CTA to `/campers`. Keep full functionality intact when bookings exist.
4. In `app/[locale]/dashboard/manual/CamperManualClient.tsx`:
   - Add complete guide for Cocina de Gas (cartuchos, encendido, llaves de paso, ventilación y seguridad).
   - Add complete guide for Cama de Techo Elevable Eléctrica (modelo SPACE, mandos, anclajes de seguridad en marcha, claraboyas).
   - Add interactive Troubleshooting accordion (resolución de averías frecuentes: inversor 230V, bomba de agua, calefacción diésel, nevera compresor, gestión de batería).
   - Ensure the "Guía PDF" button works cleanly.
5. In `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx`:
   - Add dedicated, high-end section for Normativa de Pernocta y Acampada en Mallorca (DGT 08/V-74, diferencias entre pernocta y acampada, espacios protegidos).
   - Add directory / guide of Puntos de Recarga de Agua Potable y Vaciado en la isla.
   - Add Consejos para Nómadas (abastecimiento local, cobertura 4G/5G, precauciones en carreteras de montaña, Leave No Trace).
6. Verify your changes:
   - Run `npm.cmd test` and ensure 100% passing tests.
   - Run `npm.cmd run build` and ensure exit code 0.
7. Write your full report to `handoff.md` in your working directory and notify the parent via `send_message`.
