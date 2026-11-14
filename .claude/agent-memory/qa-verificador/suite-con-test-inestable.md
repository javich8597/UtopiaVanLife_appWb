---
name: suite-con-test-inestable
description: El test inestable de checkoutRoute (cookie Expires) está ARREGLADO; la suite completa es reproducible otra vez
metadata:
  type: project
---

`tests/checkoutRoute.test.ts` → «la respuesta es igual que la de un email sin cuenta» comparaba los atributos completos de `Set-Cookie` de dos peticiones seguidas, `Expires` incluido, y fallaba cuando caían a distinto lado de un segundo (reproducido el 2026-11-09).

**ARREGLADO** (comprobado el 2026-11-12): el test ya no compara la fecha absoluta, solo que las dos respuestas traen `Expires=`. La prueba de seguridad que importa (que la respuesta no revele si el email ya tiene cuenta) se sigue midiendo.

**Why:** el proyecto usa «npm test en verde» como prueba de que un cambio está cerrado, y mientras esa prueba fuera intermitente un rojo no se podía atribuir.

**How to apply:** la suite completa vuelve a ser reproducible: al 2026-11-12, `npm test` da 1475/1475 en dos pasadas seguidas. Si aparece un rojo, **es del cambio**, no de este test; ya no hay excusa conocida. Aun así, repetir la tanda antes de culpar a nadie y mirar [[dias-civiles-de-madrid-en-tests]], porque los tests anclados al reloj real fallan según la hora.
