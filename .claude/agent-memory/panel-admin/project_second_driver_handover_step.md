---
name: second-driver-handover-step
description: Paso del segundo conductor en la entrega de recogida y vía del admin para completar su ficha; dónde se guarda y qué falta por aplicar
metadata:
  type: project
---

La entrega de recogida lleva un paso `second_driver` ("Segundo conductor comprobado") solo si la reserva lleva segundo conductor. Las casillas viven en `handovers.checklist` (jsonb) con ids `second_driver_license`, `second_driver_document` y `second_driver_no_photos_ack` (sin columna nueva).

- `handoverSteps/missingSteps(h, { secondDriver })`: sin la opción devuelven los pasos de siempre. reservas-pagos usa `missingSteps` para decidir «entrega cerrada»: sin la opción NO incluye este paso, así que la fuente fiable de «cerrada» es `completed_at`, que solo pone la ruta `/api/admin/handovers` tras exigir el paso (ficha de la reserva + fotos leídas de Storage en ese momento).
- Falta un dato de la ficha (nombre, documento, nº carnet, 2 fechas) = bloquea sin remedio hasta completarla. Falta una foto o Storage ilegible = se exige la casilla `no_photos_ack`.
- El label del paso del titular pasó a «Carnet del titular comprobado».
- Ficha editable por admin: `POST /api/admin/bookings/second-driver` (`lib/admin/secondDriverRecord.ts`, `SecondDriverRecordEditor.tsx` en el detalle). Escribe `bookings.second_driver_*` + `second_driver_updated_by/at`. Exige las migraciones `20261108_booking_second_driver_columns.sql` y `20261109_booking_second_driver_audit.sql`, ambas PREPARADAS, SIN APLICAR; sin ellas la ruta responde 409.

**Why:** Javier quiere cerrar el plazo de subida con la entrega de llaves y que el admin compruebe la documentación del segundo conductor.
**How to apply:** al tocar la entrega o `bookingSecondDriver`, mantener `secondDriverStepInput` como única fuente para pantalla y ruta; el nº de carnet sale de `passengers[].driverLicenseId` si no hay columnas.
