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
- **El sello de purga solo lo pone el rol `service_role`**, nunca un admin con su sesión del navegador: si no, se puede declarar purgada una reserva cuyas fotos siguen ahí. Por lo mismo, la tabla del registro no tiene política de `INSERT`.

Pendiente del criterio de Javier (no decidido el 2026-11-10):

1. Plazo para la firma del contrato (`bookings.contract_signature`) y el PDF de `documents/contracts/`. No son datos del registro de viajeros y los plazos civiles y fiscales son más largos que 3 años, así que quedaron fuera de la purga.
2. Si el día 100 es el de borrado (devolución D → se borra en D+100) o si quiere «100 días completos y se borra el 101».
3. Purga de los datos de identidad del perfil (`public.users`) a los 3 años: por ahora solo se listan, porque vaciar el perfil es de hecho borrar la cuenta.
4. Quién dispara la purga: no hay cron ni `pg_cron` en el repositorio, así que la política no se ejecuta sola.
