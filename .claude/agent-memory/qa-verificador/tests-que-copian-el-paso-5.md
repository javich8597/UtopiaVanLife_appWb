---
name: tests-que-copian-el-paso-5
description: Tests que pasan con y sin el cambio (copias del paso 5, nombres heredados) y fronteras vivas del 2º conductor de la reserva
metadata:
  type: feedback
---

Un test que reconstruye a mano lo que envía `Step5Checkout.tsx` (helpers tipo `sentByStep5`, `sentCustomer`) se queda en verde con la lógica vieja y deja de cubrir lo que cambió. Pasó con el 2º conductor (2026-11-08): `sentByStep5` seguía forzando `isSecondDriver: false` con fianza Estándar y su matriz saltaba la combinación `withDriver && deposit !== 'flex_1000'`.

El mismo riesgo con otra cara (2026-11-09): un test cuyo **nombre** describe la regla vieja y que sigue pasando con la nueva. «con dos reservas... basta cualquiera» pasaba con las dos versiones de la ruta, porque el documento enviado coincidía con la ficha; el test que distingue el cambio es el del documento que NO coincide. Lo mismo con aserciones ancladas al archivo donde estaba la lógica (`ADMIN_SOURCE.includes('secondDriverSupplement')` dejó de valer en cuanto `panel-admin` la movió a `lib/admin/bookingBreakdown.ts`).

**Why:** una copia de la lógica solo prueba la copia, y un nombre heredado hace creer que una frontera está cubierta cuando no lo está. `driverTextNormalization.test.ts` usa el patrón bueno: lee el fuente con `readFileSync` y comprueba la condición con una expresión regular.

**How to apply:** antes de confiar en un test de cierre, ejecutarlo contra el código revertido en una copia (ver [[verificar-arbol-en-movimiento]]); si pasa igual, no cubre el cambio — y entonces hace falta el caso negativo. Preferir el comportamiento al fuente, y cuando se lea el fuente, apuntar a la función (`lib/...`), no a la pantalla. Fronteras del 2º conductor comprobadas el 2026-11-09 y **ya resueltas**: contrato y PDF nacen de la reserva, el panel de admin tiene su línea y cuadra con el total, y `/dashboard/datos` saca el interruptor de la reserva. Las que **siguen abiertas** (`{ todo: 'QA-SD-7..11' }` en `tests/qa_segundoConductorFronteras.test.ts`): la ruta de subida no ordena la consulta y `/dashboard/datos` ordena `start_date` ascendente sobre estados que incluyen `completed`, así que con varias reservas gana una cualquiera o la más antigua; `contractEngine` cae en `users.second_driver_*` cuando la reserva cobró el suplemento sin ficha; `adminBookingSecondDriver` no mira las columnas nuevas de la reserva (dos resolutores con reglas distintas); y el nombre guardado en la reserva sale del formulario.
