---
name: politica-conservacion-documentacion
description: Política de conservación (100 días imágenes / 3 años datos legales): estado tras la 2ª ronda, qué quedó arreglado, el bucle que no termina y el sello que no significa lo que parece
metadata:
  type: project
---

Dos rondas de verificación (2026-11-10 y 2026-11-12) sobre `lib/booking/dataRetention.ts`, `app/api/admin/retention/documents/route.ts` y la migración `20261110_document_retention_policy.sql` (PREPARADA, SIN APLICAR). Commits `4416c55` y los arreglos posteriores de `supabase-datos`. Decisión de Javier: purgar imágenes a los 100 días de la devolución, retener datos legales 3 años (RD 933/2021); el **perfil (`public.users`) no caduca**, se conserva mientras exista la cuenta.

**Arreglado y comprobado por la ruta real (2ª ronda):** la simulación no escribe nada; `confirm: true` borra exactamente lo anunciado y lo registrado coincide elemento a elemento; cada plazo tiene su consulta ordenada (`end_date.asc,id.asc`) con tope propio y `.is(<columna de purga>, null)`, así que los 3 años ya no los agotan las candidatas de 100 días; una tanda de `remove` que sale bien se cuenta y se registra antes de abandonar la carpeta; `no_user` sale en `skipped`; el modo `bookingId` ya no arrastra la carpeta de cuenta; los nombres no reconocidos se informan como recuento y tres muestras recortadas a 10 caracteres.

**3ª ronda (2026-11-12, commit `e66d127`), arreglado y comprobado**: el esquema se comprueba ANTES de construir las consultas (`filterPurged`), así que una base sin migrar da 409 y no un 500; `stalled`/`stalledReasons`/`stalledWarning` y los dos textos de `truncatedWarning` dicen cuándo repetir no sirve; `truncated` pide `limit + 1` (con exactamente el tope ya no pide otra pasada); `userId` exige UUID; y hay **dos marcas**: `identity_images_reviewed_at` (su subcarpeta está limpia; es la que filtra la consulta y hace avanzar el barrido) y `identity_images_purged_at` (no queda ninguna imagen suya, ni en la carpeta de cuenta).

**4ª ronda (2026-11-12), arreglado**: QA-RET-10 cerrado (al purgar la carpeta de cuenta, la misma pasada cierra `identity_images_purged_at` de las reservas ya revisadas, en `closedByHolder`, y `reviewedWarning` las nombra en `reviewedOnly`); `userId: ''` ya da 400; y hay **sonda de sello** antes del primer borrado (`probeSealPermission` escribe `identity_images_purged_count = -1`, o `-2` si ya era `-1`, y restaura): si el sello no se puede escribir, 409 sin borrar nada.

**Lo que la sonda NO cierra (QA-RET-14)**: prueba `identity_images_purged_count` y el sello escribe sobre todo `identity_images_reviewed_at`. Si lo que el trigger rechaza es esa otra columna, la sonda pasa, **se borra** y el sello falla después. Ya no es un 200 callado (`sealFailed`, `sealWarning` y el registro lo dicen), pero la ventana sigue ahí. La sonda tampoco corre cuando no hay archivos que borrar (`willDelete`): en la purga de datos legales no hace falta, porque el vaciado y su marca van en el MISMO `UPDATE` y es atómico (comprobado).

**QA-RET-10, cerrado; el texto de abajo queda como historia de por qué existen las dos marcas**: una reserva que queda solo «revisada» **no vuelve nunca al barrido general** (el filtro es por `reviewed_at`). Cuando la cuenta se purga del todo más tarde, por otra reserva, su `identity_images_purged_at` **se queda a null para siempre** aunque de ella no quede nada en el bucket. La única salida es pedirla a mano con `bookingId` **y** `userId` a la vez (solo con `bookingId` no se cierra), y `reviewedWarning` es un texto genérico que **no nombra ninguna reserva**: no hay lista por la que ir. No es un bucle infinito —el barrido termina— pero una auditoría por `identity_images_purged_at IS NOT NULL` no llega nunca al sí.

**Lo que sigue abierto:**

- **El bucle de `truncatedWarning` no termina.** El aviso dice «vuelve a ejecutar hasta que truncated sea false», pero una reserva que **nunca se puede sellar** vuelve a salir en cada pasada: sin `user_id`, o cuya cuenta tiene una reserva viva sin fechas (`undatable_booking`), o con la carpeta ilegible. Con 60 de esas y tope 50, tres pasadas seguidas dan `truncated: true` y **cero escrituras**. Cuando sí se pueden sellar, 60 candidatas se acaban en 2 pasadas.
- **El 409 queda detrás de la consulta de candidatas.** `checkRetentionSchema` necesita las filas, así que corre DESPUÉS de `loadCandidates`, que ya filtra por `.is('identity_images_purged_at', null)`. En PostgREST real, filtrar por una columna que no existe es un 42703, así que una base sin la migración da un **500 genérico que no nombra la migración**, no el 409. En los tests no se ve porque el Supabase simulado trata `is(col, null)` sobre una columna ausente como «coincide». SIN VERIFICAR contra una base real.
- **`identity_images_purged_at` no significa «ya no queda nada de esta reserva».** Se sella con la subcarpeta de la reserva purgada aunque la carpeta de CUENTA del titular siga intacta porque otra reserva viva la retiene (`reason: 'retained'`). Lo único que lo distingue es el informe `holders` de la respuesta.
- **Nadie llama a la ruta**: sin botón, sin página y sin tarea programada, la política no se ejecuta sola.
- Decisión pendiente para Javier: la purga pone `customer_email` a null, y `app/[locale]/admin/users/page.tsx` empareja las reservas sin cuenta por ese campo; el histórico de un cliente antiguo deja de asociarse.

**Guardas redundantes que sobreviven a la mutación y deben sobrevivir** (otra condición ya tapa el caso; comprobar antes de escribirles un test): `if (!includeHolderFolders) continue` en el bucle del sello (en modo dirigido `holders` está vacío y el `if (!holder) continue` siguiente ya corta), `usable`/`plans` filtrado por `blocked` (una reserva bloqueada nunca es `due`) y los dos `!f.unreadable` (una carpeta ilegible sale con `files: []`).

**Why:** es el único borrado irreversible del proyecto y Storage no tiene papelera.

**How to apply:** al tocar la purga, pasar `tests/qa_retencionDocumentacion.test.ts` y `tests/qa_retencionSegundaRonda.test.ts`, y repetir las mutaciones de `>=` a `>` en `isPurgeDayDue` y de `Europe/Madrid` a `UTC` en `madridDay`. Ver [[mutar-para-validar-tests]], [[dias-civiles-de-madrid-en-tests]] y [[regla-y-pantalla-segundo-conductor]] (el plazo de SUBIDA es otro: se cierra el día después de la devolución, no a los 100 días).
