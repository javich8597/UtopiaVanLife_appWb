---
name: dias-civiles-de-madrid-en-tests
description: Un día de reserva se calcula SIEMPRE con madridDay + addDaysToDay; toISOString(), getDate() y setDate() han roto tests tres veces
metadata:
  type: feedback
---

Para situar un día de reserva (`YYYY-MM-DD`) en un test se usa **`addDaysToDay(madridDay(new Date()), -n)`**, las dos del proyecto (`lib/booking/secondDriver.ts` y `lib/booking/dataRetention.ts`). Nunca `toISOString()`, nunca `getDate()`/`setDate()`, nunca `Date.now() - n*86400000`.

**Why:** el dominio cuenta días de Europe/Madrid y ya ha fallado tres veces por esto:

1. `toISOString().slice(0, 10)` da el día de **UTC**: entre las 23:00 y medianoche de Madrid en invierno (las 22:00 en verano) una reserva devuelta HOY salía como devuelta ayer y el plazo de subida se cerraba antes de tiempo. Rompió tests de verdad, de noche.
2. El arreglo de `supabase-datos` (2026-11-12) pasó a `setDate(getDate() - days)` y **solo formateaba** en Madrid. Eso mueve el fallo, no lo quita: la resta sigue siendo en la zona de la MÁQUINA. Comprobado con un proceso hijo por zona: con `TZ=UTC`, `Asia/Tokyo`, `America/New_York` y `America/Los_Angeles`, `daysAgo(1)` a las 00:30 de Madrid del **2026-03-30** (el día siguiente al cambio de primavera, que solo tiene 23 horas) devolvía el 28 en lugar del 29; con `TZ=Europe/Madrid`, 0 desfases. La ventana se encogió de una hora cada noche de invierno a una hora al año, y solo fuera de Madrid.
3. `madridDay` con `timeZone: 'UTC'` es la mutación que más veces ha sobrevivido en este repositorio. Se mata con una frontera a las 00:30 de Madrid en **verano y en invierno**: una sola de las dos no basta.

**How to apply:**

- Un test que mide una frontera de días **congela el reloj** (`mock.timers.enable({ apis: ['Date'], now })`) y elige el instante a las 00:30 de Madrid, en CEST y en CET. Un test anclado al reloj real caduca solo.
- Si el ayudante tiene que usar el reloj real, delega en las dos funciones del proyecto: una línea, sin `Intl` copiado.
- Para fijar que algo no depende de la zona de la máquina, no hay forma desde dentro del proceso: hay que **lanzar procesos hijos con `TZ` distinto** y comparar las salidas. Está hecho en `tests/qa_retencionSegundaRonda.test.ts` con `tests/helpers/madridDayProbe.mts` (sin `.test.ts` para que `npm test`, que usa `tests/**/*.test.ts`, no lo recoja).
- Barrido para encontrar los que quedan: archivos de test con `new Date()` y sin `mock.timers` que además hagan `slice(0, 10)`, `split('T')[0]`, `setDate` o `setUTCDate`. Al 2026-11-12 quedaba solo `tests/adminStress.test.ts` (umbrales de años: un día de desfase no puede voltear ninguna aserción) y `tests/qa_e2e_flujos.test.ts`, que ya lo hace bien (`Intl` de Madrid y luego aritmética en UTC sobre medianoche UTC).

Ver [[mutar-para-validar-tests]] y [[politica-conservacion-documentacion]].
