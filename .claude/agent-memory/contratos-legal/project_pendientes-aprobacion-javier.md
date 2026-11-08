---
name: pendientes-aprobacion-javier
description: Cambios legales del contrato y del PDF propuestos y aún no aprobados por Javier (fianza vs franquicia, devolución de la fianza, modalidad de fianza, 2º conductor); ninguno se aplica sin su OK
metadata:
  type: project
---

Propuestas de redacción legal entregadas a Javier y **pendientes de su aprobación expresa** (a 2026-11-08):

1. Separar en el contrato y en el PDF **fianza** (retención en tarjeta, 2.000 € Estándar / 1.000 € Flex) de **franquicia del seguro** (1.000 € por siniestro): hoy se mezclan y el cliente puede entenderlos como lo mismo.
2. No prometer en la web ni en el asistente **más devolución de la fianza de la que garantiza el contrato** (el contrato reserva plazos de peritaje; la web dice "se libera íntegramente tras el check-out").
3. Recoger en el contrato la **modalidad de fianza contratada** (Estándar o Flex): hoy `ContractData.pricing` solo lleva `depositAmount`, así que el documento no deja constancia de qué modalidad se vendió.
4. Dejar constancia probatoria de la firma: versión de plantilla, fecha, huella del documento e identificación del firmante (firma electrónica simple eIDAS; su valor depende de las pruebas que la acompañen).

El cambio del 2º conductor (5 €/día con Estándar, incluido con Flex) **agrava el punto 3**: el texto que el PDF imprime para el 2º conductor depende de la modalidad y el documento no la recoge.

**Why:** Javier decide el sentido de toda cláusula; el agente no cambia una cláusula sin su aprobación expresa, y el original de `docs/Contract/` (31 artículos) es la referencia.

**How to apply:** antes de volver a proponer estos puntos, comprueba en el código si siguen abiertos y no los repitas enteros: basta decir si el trabajo en curso los afecta. Ver [[marco-legal-fuentes]].
