---
name: regla-y-pantalla-segundo-conductor
description: Las dos listas que deciden el plazo de subida del 2º conductor, ya alineadas (QA-SD-15 y QA-SD-16 cerradas), y qué comparar en la próxima ronda
metadata:
  type: project
---

Dos funciones distintas deciden lo mismo y hay que compararlas en cada cambio del plazo de subida del 2º conductor: `uploadableSecondDriverBookings` (`lib/booking/secondDriver.ts`, la que aplica `app/api/upload-driver-docs/route.ts`) y `upcomingSecondDriverBookings` (`lib/user/secondDriverBookings.ts`, la que llena el selector de `/dashboard/datos`).

Estado al **2026-11-10, segunda pasada**: alineadas en los cinco estados de `LIVE_BOOKING_STATUSES` más cancelada, sin pagar, sin fechas y 2º conductor sin documento. La regla viva, en orden: entrega de recogida cerrada → `handed_over`; `status === 'completed'` (devolución registrada) → `returned`, el mismo día y sin mirar el calendario; sin `start_date` → `not_schedulable`; `madridDay(now) > end_date` → `returned`; si no, `open`.

- **QA-SD-15 CERRADA**: Javier decidió (2026-11-10) que manda la pantalla. `completed` lo escribe `app/api/admin/handovers/route.ts` al cerrar la entrega de devolución, con la camper ya revisada en persona, así que cierra el plazo ese mismo día.
- **QA-SD-16 CERRADA**: `uploadWindowState` exige `start_date`; sin fecha de recogida es `not_schedulable` y el mensaje lo dice («no tiene fecha de recogida»). Ojo: ese texto y el de `secondDriverRequirementError` comparten esa frase, así que un test que solo haga `match(/no tiene fecha de recogida/)` **no distingue qué rechazo se aplicó**; hay que comparar con `uploadWindowClosedMessage('not_schedulable')` entero.
- **No es discrepancia, es reparto**: la pantalla no consulta `handovers`, así que ofrece la reserva ya entregada y la ruta le explica el motivo.
- `BookingSecondDriverRow` ya declara `end_date` (antes no, y toda la regla depende de él).

**Why:** mientras las dos listas sigan existiendo, cualquier cambio en una tiene que medirse contra la otra, y el cierre por fechas solo actúa sobre las reservas que nadie cerró por entrega ni por devolución (`confirmed`, `active`, `pending`).

**How to apply:** comparar las dos listas con el mismo juego de filas y el mismo `now`, un caso por estado, como hace `tests/qa_plazoDevolucionSegundoConductor.test.ts`. Y al cambiar el defecto de un fixture compartido, comprobar que las fronteras que medían una cosa no empiezan a cerrarse por otra: aquí el defecto pasó de `completed` a `active` y 11 tests dejaron de medir la fecha hasta que se escribió el estado a propósito. Ver [[mutar-para-validar-tests]] y [[tests-que-copian-el-paso-5]].
