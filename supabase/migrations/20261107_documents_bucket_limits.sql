-- =====================================================
-- M4, parte de Storage (auditoría 2be2cc8): tipos y tamaño admitidos en el bucket documents.
-- Estado: PREPARADA, SIN APLICAR. La revisa y la aplica Javier.
-- =====================================================
-- Problema: el bucket se crea desde el código sin límites y ninguna migración lo define. La
-- comprobación de tipo y tamaño solo existe en las rutas, y /api/upload-document no tiene ninguna.
--
-- Solución: la lista cerrada se fija en el propio bucket, también para la service role.
--   - 10485760 bytes = 10 MB, igual que MAX_DOCUMENT_BYTES en upload-driver-docs/route.ts.
--   - JPEG, PNG, PDF y HEIC, igual que detectDocumentType en lib/driverDocuments.ts.
--   - image/heif no lo envía esa ruta, que siempre declara image/heic. Se conserva para archivos
--     de la familia HEIF subidos por /api/upload-document, que usa el tipo del navegador.
--
-- Quién escribe en este bucket (LEÍDO en el código):
--   - /api/upload-driver-docs: fotos y PDF del cliente. Es el flujo en uso.
--   - /api/contracts/sign: PDF firmado, con contentType application/pdf. Si un PDF pasase de
--     10 MB, la subida fallaría y la ruta solo lo avisa en el log.
--   - /api/upload-document: sin llamadas desde la interfaz y sin validación propia.
--
-- ANTES DE APLICAR, comprobar:
--   1. Que ya está DESPLEGADA la ruta nueva de upload-driver-docs, que sube un Buffer con el tipo
--      detectado en el contenido. La versión anterior usa el tipo del navegador: un .heic sin tipo
--      llegaría como application/octet-stream y este bucket lo rechazaría.
--   2. Tipos ya guardados y que los contratos firmados no pasan de 10 MB: la sección 10 de
--      supabase/consulta-solo-lectura.sql da el recuento por tipo y el tamaño máximo. Los límites
--      solo afectan a las subidas nuevas; lo ya guardado sigue ahí.
--   3. Si el bucket fuera público hoy: esta migración lo deja privado. El código no usa
--      getPublicUrl y lee con createSignedUrl, pero una URL pública antigua dejaría de abrir.
--      Si la consulta da public = true, avisar: las fotos de DNI habrían estado expuestas.
--
-- Matriz: no cambia quién accede, solo qué se admite. Las políticas del bucket documents no
-- constan en el repositorio: SIN VERIFICAR.
--
-- Idempotente: crea el bucket si falta y fija la configuración si ya existe.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- COMPROBACIÓN (solo lectura). Esperado: public false, 10485760 y los cinco tipos.
--   SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'documents';
--
-- COMPROBACIÓN FUNCIONAL: subir un JPEG, un PDF y un HEIC desde /dashboard/datos, y comprobar que
-- un .html se rechaza. Escribe en Storage real: solo con permiso de Javier y con una cuenta de prueba.
--
-- REVERTIR (quita los límites; apuntar antes los valores de la consulta de solo lectura):
--   UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'documents';
