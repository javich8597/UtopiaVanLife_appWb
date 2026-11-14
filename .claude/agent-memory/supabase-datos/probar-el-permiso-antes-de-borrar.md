---
name: probar-el-permiso-antes-de-borrar
description: Un borrado irreversible seguido de un registro que puede fallar no «falla cerrado»: hay que probar el permiso de escritura antes de borrar
metadata:
  type: feedback
---

Cuando una operación borra algo irreversible y después escribe la constancia, el orden importa: si la escritura puede fallar por permisos, hay que **probar el permiso antes del primer borrado**, no confiar en que el fallo sea inocuo.

**Why:** el 2026-11-12 escribí en un informe que un trigger mal calibrado «falla cerrado, no borra nada». Era falso: la purga borraba los archivos de Storage y después escribía el sello, y un `UPDATE` rechazado con 42501 solo hacía `console.error` y `continue`. Resultado comprobado por `seguridad-auditor`: fotos de DNI borradas, `sealed: 0` y un 200 sin ningún aviso. Lo peor es que la comprobación funcional que yo mismo había escrito en la migración habría destruido las fotos de una reserva real justo al probar que todo funcionaba.

**How to apply:** antes de borrar, hacer una escritura de prueba sobre una fila candidata con un valor que **cambie de verdad** (un trigger solo salta con `IS DISTINCT FROM`, así que un patch idéntico pasa también para quien no tiene permiso y no prueba nada) y que no afirme nada (un recuento negativo, nunca una marca de hecho). Deshacerla. Si falla, abortar con un error que diga qué revisar, sin haber borrado nada.

Y, en paralelo, que el resultado **nunca pueda quedar callado**: si se borró más de lo que se pudo registrar, hace falta un aviso explícito y la lista de filas afectadas. Un `sealed: 0` junto a `files: 2` no disparaba nada.

Preferí la sonda a «marcar antes de borrar, carpeta a carpeta» porque marcar primero hace que la fila afirme que está limpia antes de que lo esté: si el borrado falla después, la fila queda fuera del filtro de candidatas y los archivos se quedan para siempre con la auditoría diciendo lo contrario. Cambiar una omisión por una afirmación falsa es peor. Ver [[politica-conservacion-documentacion]].
