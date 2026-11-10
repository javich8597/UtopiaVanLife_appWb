---
name: mutar-para-validar-tests
description: Cómo comprobar de verdad que un test nuevo falla sin el cambio (mutaciones en copia del scratchpad) y qué mutaciones han sobrevivido en este repo
metadata:
  type: feedback
---

Para validar una tanda de tests, no basta revertir todo el árbol: hay que mutar **una regla a la vez** en una copia y ver qué test se pone rojo. Receta que funcionó (2026-11-09): `git archive HEAD | tar -x -C <scratchpad>/mut`, copiar encima `tests/` y los archivos de `git diff --name-only -- app lib`, enlazar `node_modules` con una unión y lanzar `node node_modules/tsx/dist/cli.mjs --test <archivos>` (en Windows `spawnSync('npx.cmd', ...)` da `EINVAL`: hay que invocar `cli.mjs` con `process.execPath`). Un script que aplique la mutación, ejecute y restaure el original permite pasar una lista entera de un tirón.

Dos arreglos de la receta (2026-11-10):

- **Falta copiar los archivos sin seguimiento.** En este repo medio módulo nuevo está en `??` (`lib/admin/secondDriverAlerts.ts`, `lib/user/secondDriverBookings.ts`, `lib/handover/secondDriverStep.ts`, `app/api/admin/bookings/second-driver*`), así que `git archive HEAD` + `git diff` deja la copia sin ellos y el test correspondiente sale rojo por un import que no existe, no por la mutación. Hay que añadir también `git status --porcelain -- app lib components | grep '^??'`. Si la BASE no está en verde, el barrido no vale.
- **Patrones con salto de línea no encajan**: los archivos del árbol de trabajo están en CRLF, así que un `from` con `\n` no se encuentra. Mutar dentro de una sola línea.
- Para fijar el reloj de una **ruta** (que mide con `new Date()` y no acepta `now`), `mock.timers.enable({ apis: ['Date'], now })` de `node:test` funciona y `Intl.DateTimeFormat(...).formatToParts` sigue aceptando ese `Date`; limpiar con `mock.timers.reset()` en `afterEach`.

**Why:** un test puede pasar con y sin el cambio por anclarse a una constante, a un mensaje o a un filtro que otro filtro ya tapa. En esa tanda sobrevivieron cuatro mutaciones con la suite en verde: subir `MAX_DOCUMENT_UPLOADS_PER_IP` a 100000 (el test recorría la propia constante), quitar `included === true` del texto del contrato (ningún test pasaba la clave ausente), meter `completed` otra vez en `UPCOMING_STATUSES` (los casos usaban viajes completados Y pasados, el filtro por fecha lo tapaba) y borrar la llamada a `secondDriverRequirementError` de la ruta de subida (solo estaba probada llamando a la función por su cuenta, nunca por la ruta).

Mutaciones que sobrevivieron a los tests del autor el **2026-11-10** (tope de un mes del 2º conductor): cambiar `timeZone: 'Europe/Madrid'` por `'UTC'` en `madridDay` no ponía rojo ningún test de los cuatro archivos tocados —ninguno medía la frontera en la medianoche de Madrid— y los tests anclados al reloj real (`isUploadWindowOpen(...)` sin `now`) caducan solos: uno de `segundoConductorIdentidad.test.ts` se habría puesto rojo el 2026-12-10. Las dos cosas quedan cubiertas en `tests/qa_plazoDevolucionSegundoConductor.test.ts` (antes `qa_topeSubidaSegundoConductor.test.ts`; el tope de un mes se retiró ese mismo día).

Segunda ronda del **2026-11-10** (plazo = día de la devolución), 19 mutaciones y 19 muertas, con dos lecciones nuevas:

- **Un texto de usuario que solo se comprueba por una parte de su frase no está fijado.** `adminSecondDriverRemate.test.ts` comprobaba el aviso de subida a medias con `/Ya pasó el plazo/`, que sobrevive a cambiar el resto de la frase: devolver ese texto a «se cierra al mes de la devolución» no ponía rojo nada. Cada texto del plazo necesita su `assert.match(/el día de la devolución/)` **y** su `assert.doesNotMatch(/\bmes(es)?\b/)`.
- **Los dos domingos del cambio de hora de la UE distinguen Madrid de UTC mejor que un día cualquiera.** Con una devolución en invierno la frontera cae a las 23:00Z y en verano a las 22:00Z: una sola de las dos deja pasar la mutación a `'UTC'` según el mes elegido.

Mutar un texto con `from` de una sola línea funciona aunque el `to` tenga varias; y la copia hay que **refrescarla** (volver a copiar el test) después de cada cambio en el árbol real, o el barrido mide el archivo viejo.

Tercera ronda del **2026-11-10** (política de conservación), 44 mutaciones; cuatro arreglos más de la receta:

- **Una línea que aparece dos veces no es una mutación, es un `AMBIGUA`.** `holderImagePurgeDecision` y `accountLegalPurgeDecision` son casi copias, así que seis `from` encajaban dos veces y el barrido las saltó en silencio. Hay que contar las ocurrencias y, si son varias, mutar **todas** (`split().join()`), no la primera.
- **Mutar el primer tramo de una cadena `&&` no la desactiva.** Cambiar `!value.includes('/')` dentro de `isSafeSegment` dejó vivo el `&& !value.includes('..')` que venía detrás, así que el valor del test (`…/..`) seguía siendo rechazado y la mutación parecía muerta por el motivo equivocado. Elegir el valor del test contra la condición que queda, no contra la que se mutó.
- **Añadir un `.filter(f => true)` delante de un filtro real no muta nada**: es un no-op y el «SOBREVIVE» no significa nada.
- **Un guarda redundante sobrevive y debe sobrevivir.** Cuatro mutaciones de `route.ts` sobrevivieron porque otra condición ya tapaba el caso (una reserva bloqueada nunca es `due`; una carpeta ilegible siempre sale con `files: []`). Antes de escribir un test para matar una mutación, comprobar que cambia algo observable; si no, anotarla como defensa en profundidad.

Lo que **sí** destapó el barrido: dos comprobaciones de plazo de la ruta (`plan.imageDue` en los pasos 2 y 3) y los dos `.eq('id', …)` de los `UPDATE` no tenían ningún test, porque todos los casos usaban UNA sola reserva y ninguno usaba el atajo `{ bookingId }`, que **se salta el filtro de fechas**. Regla nueva: **todo `UPDATE` con filtro se prueba con DOS filas**, una que debe cambiar y otra que no.

**How to apply:** un tope numérico se escribe en el test (`assert.equal(MAX, 10)` y un bucle de 10), nunca se recorre la constante. Un valor por defecto se prueba con la clave AUSENTE, no con `false`. Un filtro por estado se prueba con una fila que pase el filtro por fecha, y al revés. Una comprobación que hace la ruta se prueba por la ruta, no solo por la función. Ver también [[tests-que-copian-el-paso-5]] y [[verificar-arbol-en-movimiento]].
