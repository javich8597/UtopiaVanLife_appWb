---
name: second-driver-docs-admin
description: Cómo el panel lee y presenta las fotos del segundo conductor (Storage por reserva, recorte, subidas antiguas, avisos)
metadata:
  type: project
---

Las fotos del segundo conductor viven en `documents/<cliente>/<reserva>/second_*`; las sueltas `second_*` en la carpeta del cliente son de subidas antiguas y NO se pueden atribuir a ninguna persona.

- `resolveSecondDriverDocuments(client, userId, bookings, {onlyBookingId})` (lib/admin/secondDriverDocuments.ts) devuelve `{folders, skippedFolders, unlinkedFolders, failed}`; solo recorre carpetas de reservas del cliente (vivas primero, tope 25). Los avisos salen de `secondDriverDocsNotices` y deben verse en pantalla.
- Entrega: `handoverSecondDriverDocs` separa las fotos de esta reserva de la «subida anterior», que va en un bloque aparte y no cuenta para la casilla del carnet.
- Avisos del detalle de reserva: `secondDriverAlerts(booking, now, photos)`; `photos` viene de `GET /api/admin/bookings/second-driver-docs` (lo que hay en Storage) y manda sobre `second_driver_docs_uploaded_at`, que solo recuerda que una subida pasó por la ruta.

**Why:** QA encontró fotos antiguas presentadas como de la reserva, recortes mudos a 25 carpetas y lecturas de reservas con la sesión que degradaban en silencio por RLS.
**How to apply:** toda lectura de reservas en pantallas de admin con `getAdminClientOrSession`; nunca callar un fallo de Storage como «No adjuntado».
