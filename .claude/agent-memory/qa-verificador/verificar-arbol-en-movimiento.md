---
name: verificar-arbol-en-movimiento
description: Otros agentes editan el árbol de trabajo mientras QA verifica; cómo no atribuir mal fallos y cómo hacer mutaciones sin tocar el repo
metadata:
  type: feedback
---

Durante una verificación, otros agentes siguen editando archivos del repo sin commit (2026-11-08: `lib/redsysNotification.ts`, pay route, `driverDocuments.ts` y checkout cambiaron a mitad de la ronda y `npm test`/`tsc` pasaron de verde a rojo por esos cambios).

**Why:** un veredicto sobre código que cambió después de leerlo es engañoso, y un rojo nuevo puede no ser del cambio verificado.

**How to apply:** anotar `ls --time-style=full-iso` de los archivos verificados al empezar y al terminar; repetir `npm test` al final y atribuir cada rojo por archivo y hora. Para comprobar que un test falla sin el cambio, copiar `app lib components tests messages i18n i18n.ts middleware.ts tsconfig.json package.json` al scratchpad y enlazar `node_modules` con una unión (PowerShell `New-Item -ItemType Junction`); al limpiar, borrar primero la unión con `(Get-Item ...\node_modules).Delete()` y solo después la carpeta, o se borraría el `node_modules` real.
