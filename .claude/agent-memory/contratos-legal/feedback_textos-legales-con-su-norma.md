---
name: textos-legales-con-su-norma
description: Cómo quiere Javier los textos legales: cada plazo o afirmación con su norma en una línea, y coherencia de fondo entre contrato, PDF y política antes que redacción idéntica
metadata:
  type: feedback
---

Todo plazo o afirmación legal que se publique va con **su norma en una línea**, dentro del propio
texto que lee el cliente (no en un comentario del código). Y entre el contrato, el PDF y la política
lo que tiene que coincidir es **el fondo** (números y normas), no la redacción palabra por palabra:
cada documento habla a su lector (el contrato en 3ª persona y «ARRENDATARIO», la política en 2ª).

**Why:** palabras de Javier al cerrar el plazo del contrato firmado (2026-11-14): «es más fácil de
defender si se explica», y «cuida que el texto del contrato y el de la política digan lo mismo, que es
lo que de verdad importa aquí». Aprobó la recomendación de los 6 años con el art. 30 del Código de
Comercio detrás, y pidió el mismo número también donde el texto avisa a un tercero (2º conductor).

**How to apply:** al redactar o revisar un texto legal, escribir el número y la norma juntos; si no se
ha podido verificar la norma en su fuente en esa sesión, no citarla. Para la coherencia, escribir el
texto una vez en código (`lib/contracts/retentionTerms.ts` es el ejemplo) y dejar que un test compare
los números con los otros textos, en lugar de duplicar cadenas. Ver
[[conservacion-datos-plazos]] y [[marco-legal-fuentes]].
