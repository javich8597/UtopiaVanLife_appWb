---
name: segundo-conductor-regla
description: Decisión de Javier (2026-11-08) sobre el 2º conductor: 5 €/día con fianza Estándar, incluido con Flex, máximo uno; sustituye la regla anterior de "solo con Flex"
metadata:
  type: project
---

El 2º conductor se permite con **cualquier** fianza: incluido sin coste con Flex (1.000 €, +10 €/día) y con un suplemento de 5 €/día con Estándar (2.000 €). Como máximo uno por reserva.

**Why:** decisión de negocio de Javier del 2026-11-08. Antes el 2º conductor **solo** existía con Flex, y el asistente, el checkout y los tests estaban escritos para ignorarlo con Estándar (lo borraban del cuerpo de la petición). Varios comentarios y tests de QA afirmaban esa regla antigua como si fuera invariante.

**How to apply:** no "arregles" el código volviendo a limitarlo a Flex. La tarifa está en `SECOND_DRIVER_RATE_PER_DAY` (`lib/pricing/engine.ts`) y la regla compartida (máximo uno, banderas equivalentes, si una reserva lleva 2º conductor) en `lib/booking/checkoutRules.ts`. El bloque "2º conductor solo" del paso 5 sigue existiendo únicamente con 1 viajero y no ocupa plaza; un `body.secondDriver` enviado aparte sí la ocupa. La subida de documentación solo acepta al 2º conductor que autoriza una reserva **viva y pagada**, comparando su documento: ver [[segundo-conductor-pertenece-a-la-reserva]]. Ver [[entorno-comprobaciones]] para cómo probarlo.
