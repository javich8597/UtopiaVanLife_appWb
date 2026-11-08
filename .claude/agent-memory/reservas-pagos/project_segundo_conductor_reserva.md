---
name: segundo-conductor-pertenece-a-la-reserva
description: Decisión de Javier (2026-11-08): el 2º conductor pertenece a la reserva, no al perfil del cliente; el perfil solo es respaldo de lectura
metadata:
  type: project
---

El 2º conductor es un dato de la **reserva**, no de la cuenta. Quién está autorizado, con qué documento y con qué suplemento se cobró sale de la reserva, en este orden: columnas `bookings.second_driver_*` → `bookings.passengers[].isSecondDriver` → `pricing_breakdown`. `users.has_second_driver` y `users.second_driver_*` solo completan datos de lectura y **nunca** deciden si hay 2º conductor ni identifican a la persona.

**Why:** del desajuste salieron tres hallazgos graves de la auditoría del 2026-11-08: la subida de documentación aceptaba el DNI de cualquier persona mientras *alguna* reserva del cliente llevara 2º conductor (sin comparar con quién), el contrato activaba la cláusula con el perfil (un cliente con dos reservas firmaba en la Estándar que iba «incluido sin coste», falso), y la consulta no filtraba por estado, así que una reserva cancelada o sin pagar autorizaba para siempre.

**How to apply:**
- La regla compartida está en `lib/booking/secondDriver.ts`: `bookingSecondDriver`, `sameDocument`, `secondDriverRequirementError`, `LIVE_BOOKING_STATUSES`. Reutilízala; no vuelvas a leer el perfil para decidir.
- «Incluido sin coste» solo se afirma con `pricing_breakdown.includesSecondDriver === true` (o, en reservas antiguas sin esa clave, con `depositOption === 'flex_1000'`). Un `secondDriverSupplement === 0` significa «sin dato», no gratis.
- La migración `supabase/migrations/20261108_booking_second_driver_columns.sql` está **preparada, sin aplicar**: añade las columnas y protege además `passengers` y `pricing_breakdown`. Mientras no se aplique, la ruta escribe esas columnas en modo «mejor esfuerzo» y sigue guardando el perfil; cuando se aplique, hay que quitar la escritura del perfil en `/api/upload-driver-docs`.
- `/dashboard/datos` saca el interruptor de la reserva y manda `bookingId`. Un perfil con `has_second_driver` antiguo y sin reserva que lo autorice **no** puede bloquear el guardado del titular (era QA-SD-6, un cliente sin poder guardar ni su propio DNI).
- Ver [[segundo-conductor-regla]] para la tarifa y el máximo de uno por reserva.
