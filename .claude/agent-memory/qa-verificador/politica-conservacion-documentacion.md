---
name: politica-conservacion-documentacion
description: Política de conservación (100 días imágenes / 3 años datos legales): los tres huecos abiertos, el atajo bookingId que se salta el corte y los guardas redundantes que ningún test puede matar
metadata:
  type: project
---

Verificada el 2026-11-10 (`lib/booking/dataRetention.ts`, `app/api/admin/retention/documents/route.ts`, migración `20261110_document_retention_policy.sql` PREPARADA SIN APLICAR). La simulación por defecto se comprobó limpia: sin `confirm: true` exacto no sale ni una petición distinta de GET a `/rest/v1`, ni un DELETE de Storage, ni fila de `retention_purge_log`.

**Huecos abiertos (QA-RET-1 a 4, con test que los documenta en `tests/qa_retencionDocumentacion.test.ts`):**

1. **Borrado a medias sin constancia.** `remove` va en tandas de `REMOVE_CHUNK = 100`; si falla una tanda, el código hace `continue`, deja `folder.deleted = 0` y no mete nada en `done`, así que los ~100 archivos que SÍ se borraron en la tanda anterior no aparecen en `retention_purge_log` ni en `identity_images_purged_count`, y `summary.files` cuenta menos de lo borrado. Storage no tiene papelera: es el peor sitio donde perder la traza.
2. **Tope de candidatas sin orden.** `loadCandidates` pide `limit` (50 por defecto, 500 máximo) **sin `.order()`** y sin filtrar lo ya purgado. Con más candidatas de 100 días que el tope, las de 3 años pueden no entrar nunca: `truncated: true` y `summary.columns: 0`.
3. **Nadie llama a la ruta.** No hay botón, página de `/admin` ni tarea programada: `grep -rn retention app components lib` solo encuentra el propio módulo. La política existe y no se ejecuta sola.
4. **Reserva sin `user_id`**: se salta la purga de imágenes sin aparecer en `skipped`, así que es invisible en la simulación. Y la migración afirma que la ruta «LISTA» las cuentas con el plazo del perfil vencido: no lo hace, `accountLegalPurgeDecision` no se importa en la ruta.

**El atajo peligroso:** `POST { bookingId }` **no aplica el corte de 100 días** (`loadCandidates` hace `.eq('id', …)` a secas). Lo único que impide purgar una reserva devuelta ayer es el `if (!plan.imageDue || !plan.userId) continue` del paso 2 y el `plan.imageDue` del paso 3. Esas dos comprobaciones no tenían ningún test: las mutaciones M38 y M39 sobrevivían. Cualquier cambio en esa zona se mide con «pedir una reserva por `bookingId` NO se salta el plazo».

**Guardas redundantes que ningún test puede matar** (sobreviven a la mutación y está bien que sobrevivan, no son huecos): `usable = plans.filter(!plan.blocked)` (una reserva bloqueada nunca es `due`, porque su día de purga es `''`), `if (Object.keys(patch).length === 0) continue` (la lista `legal` ya está filtrada por `columns.length > 0`) y los dos `!f.unreadable` (una carpeta ilegible siempre sale con `files: []`). Antes de «arreglar» un test para matarlas, comprobar que la mutación cambia algo observable.

**Why:** son los cuatro sitios por los que esta purga puede borrar de más, de menos o sin dejar rastro, y el único irreversible del proyecto.

**How to apply:** al tocar la purga, pasar `tests/qa_retencionDocumentacion.test.ts` y repetir la mutación de `>=` a `>` en `isPurgeDayDue` y de `Europe/Madrid` a `UTC` en `madridDay`. Ver [[mutar-para-validar-tests]] y [[regla-y-pantalla-segundo-conductor]] (el plazo de SUBIDA es otro: se cierra el día después de la devolución, no a los 100 días).
