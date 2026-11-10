---
name: entrega-cierra-plazos-no-las-fechas
description: Javier prefiere reglas atadas a un hecho del negocio (la entrega de llaves) antes que a plazos en días inventados; y «entrega cerrada» es completed_at
metadata:
  type: feedback
---

Cuando haya que decidir hasta cuándo se admite algo de una reserva, átalo a un **hecho que ocurre de verdad** (la entrega de llaves, el pago firmado, la devolución registrada) antes que a un plazo en días.

**Why:** el plazo de 7 días para subir la documentación del 2º conductor (`UPLOAD_GRACE_DAYS`) lo elegí yo sin regla de negocio detrás. Javier lo sustituyó el 2026-11-09 por «mientras no haya una entrega de recogida cerrada», porque la documentación hace falta antes de dar las llaves y en la entrega el admin la comprueba como un paso más: una fecha inventada no significaba nada para nadie.

**How to apply:**
- Propón la versión atada al hecho y di en claro qué comportamiento cambia (aquí: sin entrega registrada la subida sigue abierta aunque el viaje haya pasado).
- Deja el cierre por fechas solo como respaldo de lo que no se puede situar (una reserva sin fechas no autoriza nada).
- «Entrega cerrada» = `handovers.completed_at`, la marca que escribe `app/api/admin/handovers/route.ts` cuando no queda ningún paso pendiente. No recalcules el checklist con `missingSteps(row)`: sin `options` se deja fuera el paso del 2º conductor que añade el panel.
- Ver [[segundo-conductor-pertenece-a-la-reserva]] y [[entorno-comprobaciones]].
