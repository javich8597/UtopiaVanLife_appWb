# Conservación de datos: plazos, decisiones y lo que todavía no se ejecuta

Estado a **14 de noviembre de 2026**. Este documento existe porque la política de
privacidad publicada anuncia plazos que el sistema **todavía no cumple**, y eso es una
decisión consciente de Javier, no un descuido. Aquí queda por escrito qué se decidió,
cuándo, con qué fundamento, y qué falta para que lo publicado sea verdad.

Si cambia cualquiera de los cuatro plazos, hay que cambiarlos en los cuatro sitios a la
vez (ver «Dónde vive cada plazo»); hay tests que se ponen rojos si uno se desvía.

## Los cuatro plazos

| Qué | Plazo | Desde | Por qué |
|---|---|---|---|
| Imágenes de identidad (fotos de DNI/NIE/pasaporte y del permiso de conducir, del titular y del 2º conductor) | **100 días** | la devolución del vehículo | Decisión de Javier. La finalidad —comprobar que esa persona puede conducir— se agota con el viaje |
| Datos del registro de viajeros | **3 años** | la devolución | Obligación del **RD 933/2021, art. 5.3** |
| Contrato firmado y firma manuscrita | **6 años** | la devolución | **Art. 30 del Código de Comercio** (seis años desde el último asiento). Absorbe los 4 años de prescripción tributaria y los 5 del art. 1964.2 del Código Civil |
| Ficha de cliente y cuenta (`public.users`) | **mientras exista la cuenta** | — | Decisión de Javier. Otra finalidad y otra base jurídica: la relación con el cliente y su propia cuenta |

## Decisiones de Javier, con fecha

- **2026-11-10** — Las imágenes se purgan a los **100 días** tras la devolución; los datos
  legales se conservan **3 años** por el RD 933/2021.
- **2026-11-10** — El plazo de 100 días vence **el propio día 100** (devolución el día D →
  se borra el día D+100), no el 101.
- **2026-11-11** — El **perfil no caduca**: se conserva mientras exista la cuenta. Son datos
  de la cuenta y no de una reserva, y vaciarlos sería borrar la cuenta.
- **2026-11-12** — La **cuenta solo se borra si el cliente lo pide**. No hay criterio de
  inactividad.
- **2026-11-14** — El **contrato y la firma, 6 años** desde la devolución.
- **2026-11-14** — El responsable del tratamiento correcto es el del contrato: **CIF
  B24902637**, San Sebastián de los Reyes (Madrid), `info@utopiavanlife.com`. La política
  decía Palma de Mallorca y un correo (`hola@`) que ya no existe como buzón; corregido.
- **2026-11-14** — **La política se publica ya**, sabiendo que los plazos no se ejecutan
  todavía, y el desfase se documenta aquí.
- **2026-11-14** — **Se guarda constancia** de que el titular confirmó haber informado al 2º
  conductor (en marcha cuando se escribe esto).
- **2026-11-14** — El **artículo 16 del contrato (GPS)** se deja como está, aunque use la
  misma fórmula vacía («conforme a normativa aplicable») que se quitó del artículo 31.

## Lo que NO se ejecuta hoy

Esto es el desfase entre lo publicado y lo real. Por orden de importancia:

1. **Nadie dispara la purga.** El programa existe
   (`app/api/admin/retention/documents/route.ts`) y nunca se ha ejecutado. No hay tarea
   programada ni botón en el panel: hace falta un `POST` a mano. Y **por defecto simula**:
   dice qué borraría sin borrar nada, a propósito, para que el estreno no fuera a ciegas.
2. **La migración `20261110_document_retention_policy.sql` está PREPARADA, SIN APLICAR**, así
   que las columnas de constancia y la tabla `retention_purge_log` no existen en la base. Sin
   ellas la purga responde **409 y no borra nada**, también a propósito: no se borran fotos de
   DNI si no se puede dejar constancia de que se borraron.
3. **Los contratos vencidos no entran en la purga.** `BOOKING_IDENTITY_NOT_PURGED` los excluye
   (`lib/booking/dataRetention.ts`), así que los 6 años no se cumplen solos.
4. **El borrado de cuenta no existe.** No hay ruta, ni pantalla, ni procedimiento escrito, así
   que «mientras exista la cuenta» es hoy, de hecho, indefinido. El art. 17 del RGPD no exige
   un botón —un procedimiento manual por correo vale—, pero sí que exista.
5. **Lo que queda atascado necesita mano humana.** Reservas sin cliente asignado, o cuyas
   cuentas tienen una reserva viva sin fechas, no las resuelve ninguna ejecución; la respuesta
   las lista (`stalled`, `stalledReasons`) y nadie las mira todavía.

## Lo primero que hay que hacer

1. **Comprobar si hay fila en `contract_template_settings`.** La plantilla guardada manda
   sobre el código (`lib/contracts/templateService.ts`), así que una plantilla anterior al
   2026-11-14 seguiría imprimiendo el artículo 31 viejo mientras la política publica los 6
   años. Si la hay, regenerar el articulado desde los valores por defecto.
2. **Aplicar la migración `20261110`**, empezando por el paso 0 de su comprobación funcional:
   antes de aplicarla, un `POST` con `confirm` tiene que responder 409 enumerando lo que falta.
3. **Programar la purga.** Recomendación: tarea semanal, **en simulación** las primeras
   semanas, repitiendo hasta que `truncated` sea `false` (cada pasada mira 50 reservas).
4. **Primera ejecución real dirigida** a una sola reserva antigua (`bookingId` + `userId`),
   revisando la simulación antes. La purga es irreversible: Storage no tiene papelera.

## Dónde vive cada plazo

- **Los números y el reparto**: `lib/booking/dataRetention.ts` (100 días y 3 años) y
  `lib/contracts/retentionTerms.ts` (6 años, y los textos del contrato).
- **La ejecución**: `app/api/admin/retention/documents/route.ts`.
- **La base**: `supabase/migrations/20261110_document_retention_policy.sql`, que explica en su
  cabecera el razonamiento, la matriz de permisos y los pasos de comprobación.
- **Los textos de usuario**: `app/[locale]/legal/privacidad/page.tsx` (apartados 3, 4 y 5), el
  artículo 31 del contrato (`lib/contracts/contractEngine.ts` y `docs/Contract/CONTRATO
  ALQUILER.md`), el recuadro RGPD del PDF (`lib/contracts/pdfGenerator.ts`), la pantalla de
  firma y el aviso del 2º conductor en `/dashboard/datos`.
- **Los tests que impiden que se desvíen**: `tests/contracts/politicaPrivacidadConservacion.test.ts`
  y `tests/contracts/conservacionContratoPdf.test.ts`.

## Pendiente de confirmar con un abogado

El art. 30 del Código de Comercio cuenta los seis años **desde el último asiento contable**;
aquí se cuentan **desde la devolución**. La duración coincide, el punto de partida no: frente
al cliente es más protector, pero podría quedarse corto para la obligación mercantil si hay un
apunte posterior de esa reserva (liberación de fianza, rectificación de factura). Los textos
dicen «6 años desde la devolución» y atribuyen al art. 30 el plazo, no el cómputo.

Tampoco está decidido cómo se cumple el **bloqueo del art. 32 de la LOPDGDD**: al suprimir hay
que identificar y reservar lo que se retiene por obligación legal, dejarlo solo a disposición
de jueces, Ministerio Fiscal y Administraciones durante la prescripción, y destruirlo después.
Los textos actuales no afirman que se apliquen medidas de bloqueo; solo dicen que esos datos no
se usan para ninguna otra finalidad, que sí es cierto.
