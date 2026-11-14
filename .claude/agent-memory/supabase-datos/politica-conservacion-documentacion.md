---
name: politica-conservacion-documentacion
description: Decisión de Javier (2026-11-10) sobre los dos plazos de conservación de la documentación de identidad, y qué quedó pendiente de su criterio
metadata:
  type: project
---

Javier decidió el 2026-11-10, literal: «Purgar imágenes de Storage a los 100 días tras la devolución; retener datos legales 3 años por RD 933/2021». Hasta entonces no había ninguna política: nada se borraba y cada reenvío del formulario dejaba otra copia.

**Why:** cumplimiento del RD 933/2021 (registro de viajeros) y minimización de datos: las fotos de DNI y carnet son el dato más sensible del proyecto y vivían indefinidamente en el bucket `documents`.

**How to apply:** los dos plazos cuelgan del día de la devolución (`end_date`, o `start_date` si falta), en días de Europe/Madrid. Antes de proponer cualquier cambio de plazos, comprobar que siguen siendo esos dos.

Hallazgos de estructura que condicionan cualquier purga futura (comprobar que siguen así antes de confiar en ellos):

- Las fotos del TITULAR están en una sola carpeta por cuenta (`documents/<cliente>/`), compartida por todas sus reservas: no se pueden borrar reserva a reserva sin destruir la documentación de la reserva siguiente. Las del 2º conductor sí bajan a `documents/<cliente>/<reserva>/`.
- Los datos de identidad del perfil (`public.users`) también son de la cuenta, no de la reserva.
- No existe ningún snapshot por reserva de los datos del RD 933/2021: el XML se genera al vuelo desde `users` + `bookings`, y lo único que queda del envío es una línea de log en `bookings.notes`.

Dos reglas que salieron de la auditoría de `seguridad-auditor` y `qa-verificador` (2026-11-10) y que valen para cualquier purga futura:

- **No se borra nada si no se puede dejar constancia.** La ruta comprueba antes que existen las columnas de constancia y la tabla del registro, y responde 409 si falta algo. Storage no tiene papelera: borrar fotos de DNI sin rastro es peor que no borrarlas.
- **El sello de purga solo lo pone el rol `service_role`**, nunca un admin con su sesión del navegador: si no, se puede declarar purgada una reserva cuyas fotos siguen ahí. Por lo mismo, la tabla del registro no tiene política de `INSERT`. Cómo se comprueba el rol sin equivocarse: [[guardas-dentro-de-security-definer]].
- **La comprobación del esquema va antes de construir las consultas.** Filtrar por una columna que no existe es un `42703` en PostgREST, y eso convierte el 409 que explica qué migración falta en un 500 genérico, justo en la base sin migrar para la que se escribió.
- **Una marca no puede afirmar más de lo que pasó.** Las fotos del titular viven en una carpeta de CUENTA, así que una reserva vencida puede quedar «revisada» (su subcarpeta limpia) sin estar «purgada» (el DNI del titular sigue ahí por otra reserva viva). Son dos columnas distintas.
- **Un aviso no puede mandar repetir un bucle que no termina.** Hay candidatas que nunca se pueden marcar (sin `user_id`, o con una reserva viva sin fechas en su cuenta): la respuesta las cuenta aparte y dice que repetir no las arregla.
- **Una reserva `pending` abandonada no alarga ningún plazo de conservación** (`isAbandonedPending`). Si contara, bastaría empezar una reserva con fechas lejanas y no pagarla para que el DNI de un tercero sobreviviera a sus 100 días.
- **No se borra nada antes de probar que se puede escribir la constancia**: [[probar-el-permiso-antes-de-borrar]].
- **Una marca que solo se puede cerrar a mano no sirve de constancia.** Una reserva que queda «revisada» porque su cuenta conserva la carpeta del titular tiene que cerrarse sola cuando esa carpeta se purgue; si no, la columna nunca llega al sí y una auditoría no puede afirmar nada. Y cualquier aviso sobre filas pendientes tiene que **nombrarlas**.

Pendiente del criterio de Javier (no decidido el 2026-11-10):

1. Plazo para la firma del contrato (`bookings.contract_signature`) y el PDF de `documents/contracts/`. No son datos del registro de viajeros y los plazos civiles y fiscales son más largos que 3 años, así que quedaron fuera de la purga.
2. Si el día 100 es el de borrado (devolución D → se borra en D+100) o si quiere «100 días completos y se borra el 101».
3. Purga de los datos de identidad del perfil (`public.users`) a los 3 años: por ahora solo se listan, porque vaciar el perfil es de hecho borrar la cuenta.
4. Quién dispara la purga: no hay cron ni `pg_cron` en el repositorio, así que la política no se ejecuta sola.
