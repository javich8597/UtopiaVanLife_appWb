---
name: retention-cron-screen
description: Tarea semanal de purga de documentación (Vercel Cron) y pantalla /admin/conservacion: decisiones, convenciones y lo que queda sin aplicar
metadata:
  type: project
---

Montado el 2026-11-14 por encargo de Javier («la purga se ejecuta una vez por semana»). La política (100 días, 3 años, 6 años) y `lib/booking/dataRetention.ts` NO son del panel: no se tocan.

- **Estructura**: núcleo de una pasada en `lib/admin/retentionPass.ts` (movido de la ruta de admin sin cambiar lógica; los 177 tests de retención lo prueban). Dos puertas: `app/api/admin/retention/documents/route.ts` (requireAdmin) y `app/api/cron/retention/documents/route.ts` (GET, `CRON_SECRET`). Bucle y secreto en `lib/admin/retentionCron.ts`. Pantalla en `app/[locale]/admin/conservacion/`, historial en `app/api/admin/retention/history/route.ts`.
- **Convención «quién la lanzó»**: `retention_purge_log.ran_by = NULL` significa «la tarea programada»; un admin deja siempre su id. No se añadió columna a esa tabla porque la crea 20261110 (sin aplicar) y un cambio ahí obligaría a la purga a comprobar una columna más antes de borrar.
- **Simulación = UNA pasada** a propósito: simular no marca nada, así que repetir devuelve siempre las mismas 50 candidatas. Solo con `RETENTION_CRON_CONFIRM=true` exacto repite (tope 10 vueltas, 45 s, `maxDuration` 60) y para si `advanceable === 0` o no hay avance.
- **Resultado legible**: tabla `retention_cron_runs`, migración `20261115_retention_cron_runs.sql`, PREPARADA, SIN APLICAR. La ruta no falla si no existe (`recorded: false`).
- **Cron**: `vercel.json` `0 3 * * 1` (lunes 03:00 UTC = 04:00/05:00 Madrid). Vercel Cron va en UTC.

**Why:** Javier quiere revisar varias semanas de simulaciones antes de dar permiso de borrar; Storage no tiene papelera.
**How to apply:** si se toca la purga, el allowlist de `tests/securityMigrations.test.ts` (rutas que actualizan `bookings`) apunta a `lib/admin/retentionPass.ts`, no a la ruta. Si algún día se quiere distinguir cron/admin con columna, hace falta migración nueva posterior a 20261110. La pantalla se probó con SSR y estados precargados, nunca en navegador.
