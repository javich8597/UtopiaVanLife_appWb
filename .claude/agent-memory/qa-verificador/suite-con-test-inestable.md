---
name: suite-con-test-inestable
description: npm test tiene un test que falla por el reloj (cookie Expires en checkoutRoute); un verde no es reproducible sin repetir la tanda
metadata:
  type: project
---

`tests/checkoutRoute.test.ts` → «la respuesta es igual que la de un email sin cuenta» compara los atributos completos de `Set-Cookie` de DOS peticiones seguidas, `Expires` incluido, así que falla cuando las dos caen a distinto lado de un segundo (reproducido el 2026-11-09 en la tanda completa: `Expires ...22:16:40` frente a `...22:16:41`; el mismo archivo aislado pasó 8 de 8).

**Why:** el proyecto usa «npm test en verde» como prueba de que un cambio está cerrado. Un rojo de esta prueba no es del cambio que se esté verificando, y un verde tampoco demuestra que no haya otros rojos intermitentes. Además la prueba es de seguridad (que la respuesta no revele si el email ya tiene cuenta): si se normaliza a «esa falla a veces», se pierde la señal.

**How to apply:** al atribuir un rojo, mirar primero si es este; repetir la tanda antes de culpar a nadie. Si se arregla, comparar los atributos sin `Expires` o congelar el reloj. Ver también [[verificar-arbol-en-movimiento]].
