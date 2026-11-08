---
name: contrato-2o-conductor
description: Por qué el 2º conductor del contrato puede no coincidir con el de la reserva: la identidad sale del perfil del cliente y el suplemento del desglose de esa reserva
metadata:
  type: project
---

El bloque "SEGUNDO CONDUCTOR AUTORIZADO" del contrato se arma con **dos fuentes distintas**: la identidad viene del perfil del cliente (`users.has_second_driver` / `second_driver_name`, que persiste entre reservas y solo lo escribe la subida de documentación) y el importe viene del desglose de **esa** reserva (`pricing_breakdown.secondDriver*`). Nada obliga a que coincidan, así que el documento puede autorizar a una persona que esa reserva no contrató, u omitir a la que sí se cobró.

**Why:** el 2º conductor se contrata en el paso 5 (y se valida ahí: 25 años y 2 años de carnet), pero el contrato nunca lee `bookings.passengers`. Detectado al revisar el cambio de 2026-11-08 que abrió el 2º conductor a la fianza Estándar por 5 €/día.

**How to apply:** cualquier texto del contrato o del PDF sobre el 2º conductor (identidad, requisitos o precio) debe salir de la reserva, no del perfil. Antes de proponer una redacción, comprueba de qué fuente la va a rellenar `generateContractData`. Relacionado con [[pendientes-aprobacion-javier]].
