---
name: validacion-textos-clientes
description: Valores reales que hay que probar al verificar validadores de nombre, teléfono, dirección y email en Utopia Van Life, y dónde mirar además del validador
metadata:
  type: project
---

Al verificar cualquier validador de nombre o teléfono, probar siempre: punto volado catalán (`Marcel·la`, U+00B7), acento suelto (`O´Connor`, U+00B4), coma (`Pérez, Ana`) y espacio duro en teléfonos (U+00A0). Además, espacio duro en nombres, letras en teléfonos (`611222333 Javi`), espacio fino (U+2009, U+202F), guion duro (U+2011), raya (U+2013), marcas de dirección (U+200E, U+2066, U+202A) y separadores de línea U+2028/U+2029 (no son \p{Zs}).

**Why:** la empresa opera en Mallorca, con clientes catalanohablantes, y lo que entra en el paso 5 llega rellenado a formularios posteriores (/checkout/success, /dashboard/datos) con reglas propias (2026-11-07). Desde 2026-11-08 paso 5, checkout y subida comparten `lib/driverDocuments.ts` y guardan normalizado; la implicación paso 5 → checkout → subida se comprueba de punta a punta en `tests/qa_cierre_subida_pago_fianza.test.ts` (`stepFiveImpliesUpload`). Desde la segunda tanda (2026-11-08) el email sí está unificado (QA-C7 es implicación). Ojo con el estado oculto del asistente: Step5Checkout envía `secondDriverSoloEnabled`/`secondDriverSolo` aunque el bloque ya no se vea (más viajeros o fianza Estándar) y validateStep5 no lo mira; el checkout sí (QA-C8 y QA-C9, resueltos en la tercera tanda). Queda el mismo patrón en `isSecondDriver` de los acompañantes al pasar de Flex a Estándar (todo QA-C10). Ante cualquier campo que el paso 5 oculte según viajeros o fianza, probar el borrador antiguo.

**How to apply:** comparar lo que acepta el paso 5 con lo que acepta la ruta sobre el valor ya GUARDADO (prefijo y dirección concatenada incluidos), no sobre el texto tecleado. Un test de implicación debe exigir un mínimo de casos aceptados para no cumplirse en vacío. Mirar también el destino del valor: en el PDF, jsPDF escribe en UTF-16 toda línea con un carácter ajeno a WinAnsi. Para dejar un fallo reproducido sin alterar el rojo esperado de `npm test`, usar `{ todo: 'QA-x' }` en `node:test`. Ver también [[verificar-arbol-en-movimiento]].
