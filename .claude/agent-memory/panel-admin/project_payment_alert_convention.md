---
name: payment-alert-convention
description: Cómo el panel ve y apaga los avisos "[PAGO A REVISAR]" de notes (sin columna propia) y de dónde sale el rol admin
metadata:
  type: project
---

Los cobros de Redsys con incidencia (importe distinto, reserva cancelada o reembolsada) se guardan solo como una línea `[PAGO A REVISAR] <texto>` en `bookings.notes` (la escribe `appendPaymentAlert` en `lib/redsysNotification.ts`, territorio de reservas-pagos). No hay columna ni estado propios.

- El panel lo lee con `activePaymentAlerts`/`hasPaymentAlert` de `lib/admin/bookingStatus.ts`. Un aviso con alerta no es "abandonado" (`isAbandonedPending`) y se ve como chip "Pago a revisar" en la lista, pestaña `?status=alert`, portada y contador del menú.
- Para apagarlo, `POST /api/admin/bookings/resolve-payment-alert` AÑADE una línea `[PAGO REVISADO] <mismo texto>` y conserva la original: `appendPaymentAlert` deduplica con `notes.includes(línea)`, así que borrar la línea haría que Redsys o `verify-payment` la reescribieran.
- El texto de `notes` también lo escribe el cliente en el checkout (`cust.notes`), así que un cliente podría imitar el marcador al inicio de línea; pendiente de que reservas-pagos lo limpie allí.

**Why:** evitar que un cobro real con incidencia caduque, se archive en lote o quede invisible, sin tocar el esquema.
**How to apply:** si se añade columna/estado propio de pago a revisar, migrar estas funciones y retirar la convención de líneas.

Rol admin: la verdad es `public.users.role` o `app_metadata.role`; `user_metadata` lo edita el propio usuario y no cuenta. `middleware.ts` usa `isAdminSession` (`lib/admin/auth.ts`); layouts y API usan `isAdminUser`.
