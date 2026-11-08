---
name: project-subida-documentos-vercel
description: Diseño de la subida de documentación del conductor para el límite de 4,5 MB de Vercel (una sola petición, fotos reducidas en el navegador)
metadata:
  type: project
---

La subida de DNI y carnet va en UNA petición a `/api/upload-driver-docs`, con las fotos reducidas a JPEG en el navegador (`lib/compressDocumentImage.ts`; lógica pura y testeada en `lib/documentUploadBudget.ts`). Presupuesto 3,8 MB entre todos los archivos; la ruta rechaza con 413 por encima de 4,5 MB (`MAX_REQUEST_BYTES`).

**Why:** Vercel corta en torno a 4,5 MB por petición a una función. No se puede subir archivo a archivo: el primer envío con archivos pasa a `pending_validation` y revoca la cookie de acceso, así que la segunda petición daría 401.

**How to apply:** cualquier pantalla nueva que envíe fotos a esa ruta usa `prepareDocumentsForUpload` y `interpretUploadResponse` (un 413 de Vercel no es JSON). El bucket `documents` sigue en 10 MB (migración); es solo un techo. `/api/upload-document` (2 archivos de 10 MB) no tiene ningún cliente que la llame y tiene el mismo riesgo si se usa.
