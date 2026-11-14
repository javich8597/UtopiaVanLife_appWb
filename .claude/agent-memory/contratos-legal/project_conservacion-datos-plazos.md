---
name: conservacion-datos-plazos
description: Los cuatro plazos de conservación decididos por Javier (los cuatro cerrados ya), dónde se escriben una sola vez y qué parte de la mecánica sigue sin ejecutarse
metadata:
  type: project
---

Plazos decididos por Javier, publicados en `app/[locale]/legal/privacidad/page.tsx` y en el artículo 31
del contrato:

1. Imágenes de identidad (DNI/NIE/pasaporte y carnet, titular y 2º conductor): **100 días desde la
   devolución** (2026-11-10).
2. Datos del registro de viajeros del RD 933/2021: **3 años desde la devolución** (art. 5.3).
3. Contrato firmado y firma manuscrita: **6 años desde la devolución** (2026-11-14), con el art. 30
   del Código de Comercio como razón.
4. Ficha de cliente y cuenta (`public.users`): mientras exista la cuenta; la cuenta solo se borra a
   petición (2026-11-11 y 2026-11-12).

Desde 2026-11-14 el texto del contrato se escribe **una sola vez** en
`lib/contracts/retentionTerms.ts` (`CONTRACT_RETENTION_PARAGRAPHS` para el art. 31,
`CONTRACT_RETENTION_SUMMARY` para `rgpdText.conservacion`), y de ahí lo toman el motor, el PDF y la
pantalla de firma. La política mantiene su propia redacción (habla en 2ª persona); lo que no puede
diferir son los números y las normas, y eso lo compara
`tests/contracts/politicaPrivacidadConservacion.test.ts`.

**Why:** tres textos distintos (política, art. 31, recuadro RGPD del PDF) decían cosas distintas sobre
el mismo dato, y el PDF ni imprimía la conservación. Un plazo contradictorio incumple el art. 13.2.a
igual que no publicar ninguno.

**How to apply:**

- El plazo del contrato se cuenta **desde la devolución**, que es criterio de Javier; el art. 30 CCom
  cuenta sus seis años «a partir del último asiento realizado en los libros» (verificado en el BOE el
  2026-11-14). La duración coincide, el *dies a quo* no: para el cliente es más protector, pero un
  abogado tiene que decir si basta para la obligación mercantil. No afirmar que el art. 30 impone
  contar desde la devolución.
- Lo que NO se ejecuta (comprobar si sigue así antes de escribir nada que lo tape):
  `20261110_document_retention_policy.sql` sigue PREPARADA SIN APLICAR, nadie llama a
  `POST /api/admin/retention/documents` (no hay `vercel.json` ni botón), el borrado de cuenta no
  existe, y la purga **excluye a propósito** el contrato y la firma
  (`BOOKING_IDENTITY_NOT_PURGED`: `contract_signature`, `contract_pdf_url`, `pricing_breakdown`), así
  que los 6 años no se cumplen solos. Encargo abierto para `supabase-datos`.
- El responsable del tratamiento ya coincide en todas partes: UTOPIA VAN LIFE S.L., CIF B24902637, San
  Sebastián de los Reyes (Madrid), `info@utopiavanlife.com`. La política era el único sitio con
  «Palma de Mallorca» y `hola@` (corregido 2026-11-14). `hola@` solo queda en
  `components/layout/Footer.tsx`, que lleva los dos correos.

Sigue abierto, de [[pendientes-aprobacion-javier]]: no se guarda versión de plantilla ni huella del
documento firmado, así que no se puede probar **qué texto** firmó el cliente, y ahora ese texto se
conserva 6 años. Ver [[marco-legal-fuentes]].
