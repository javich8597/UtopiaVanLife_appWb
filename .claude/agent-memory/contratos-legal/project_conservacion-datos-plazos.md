---
name: conservacion-datos-plazos
description: Los cuatro plazos de conservación decididos por Javier, qué parte de la mecánica NO está viva todavía y por qué eso condiciona lo que se puede publicar
metadata:
  type: project
---

Plazos decididos por Javier y ya publicados en `app/[locale]/legal/privacidad/page.tsx` (2026-11-14):

1. Imágenes de identidad (DNI/NIE/pasaporte y carnet, titular y 2º conductor): **100 días desde la devolución** (2026-11-10).
2. Datos del registro de viajeros del RD 933/2021: **3 años desde la devolución** (art. 5.3 de la norma).
3. Contrato firmado y firma manuscrita: **sin plazo decidido**. La página publica el *criterio* (art. 13.2.a lo permite), nunca un número.
4. Ficha de cliente y cuenta (`public.users`): mientras exista la cuenta; la cuenta solo se borra a petición (2026-11-11 y 2026-11-12).

**Why:** la política no decía ni un plazo, y eso incumple el art. 13.2.a del RGPD. Pero tres de los cuatro plazos describen una mecánica que todavía no corre: `20261110_document_retention_policy.sql` está PREPARADA SIN APLICAR, `POST /api/admin/retention/documents` no lo dispara nadie (ni botón de panel ni tarea programada, no hay `vercel.json`), y el borrado de cuenta no existe en ninguna parte de la aplicación. Publicar un plazo que no se ejecuta es una declaración falsa, no solo una laguna.

**How to apply:** antes de volver a tocar esos textos, comprueba en el código si la migración sigue sin aplicar y si alguien dispara ya la purga; si siguen así, el texto publicado va por delante de los hechos y hay que decirlo en el informe, no suavizarlo. Dos incoherencias abiertas que decide Javier: el art. 31 del contrato y `rgpdText.conservacion` de `lib/contracts/contractEngine.ts` solo dicen «plazos legales aplicables» (el PDF ni imprime esa línea: `rgpdContent` en `lib/contracts/pdfGenerator.ts` omite `conservacion`), y el responsable del tratamiento no coincide entre la política (Palma, `hola@`) y el contrato (San Sebastián de los Reyes, `info@`, CIF B24902637). Ver [[pendientes-aprobacion-javier]] y [[marco-legal-fuentes]].
