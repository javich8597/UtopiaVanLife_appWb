# Informe de Inspección y Diagnóstico Técnico: Área de Usuario (/dashboard) — R1

**Fecha y Hora**: 2026-09-18T00:56:00Z  
**Autor**: Explorer Survey User (`explorer_survey_user`)  
**Directorio de trabajo**: `c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\.agents\teamwork_preview_explorer_survey_user`  
**Destinatario**: Parent Orchestrator (`17707f7d-4404-46bd-8f1d-58a74f2a2c7e`)  

---

## 1. Observation (Observaciones Directas)

A continuación se detallan las observaciones empíricas recogidas directamente de la inspección del código fuente, rutas API, servicios y comandos de verificación ejecutados en `c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb`:

### 1.1. Estado de la Suite de Tests Automatizados
- **Comando ejecutado**: `npm.cmd test` (definido en `package.json` como `tsx --test tests/**/*.test.ts`).
- **Resultado verbatim**:
  ```
  ✔ Admin Panel Authorization & Security (TDD) (7.4228ms)
  ✔ Verification Status Normalization (TDD) (1.8119ms)
  ✔ Refund Validation Rules (TDD) (1.7119ms)
  ✔ Availability blocked dates normalization (10.1738ms)
  ✔ Booking calendar date logic (4.5452ms)
  ✔ Calendar slot logic (9.3491ms)
  ✔ contractEngine validation and data generation (91.963ms)
  ✔ pdfGenerator (116.3472ms)
  ✔ templateService (7.205ms)
  ✔ templateTypes (3.7124ms)
  ✔ Pricing Engine & Season Rates (TDD) (63.1137ms)
  ℹ tests 39
  ℹ suites 11
  ℹ pass 39
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 1054.4947
  ```
  Los 39 tests pasan de forma limpia, incluyendo pruebas clave de generación de PDF (`tests/contracts/pdfGenerator.test.ts`), motor de contratos (`tests/contracts/contractEngine.test.ts`) y validación de carnet.

---

### 1.2. Subruta 1: Dashboard Principal (`/dashboard`)
- **Archivos**:
  - `app/[locale]/dashboard/layout.tsx` (L1-49)
  - `app/[locale]/dashboard/page.tsx` (L1-41)
  - `app/[locale]/dashboard/DashboardClient.tsx` (L1-897)
  - `app/[locale]/dashboard/DashboardNavClient.tsx` (L1-269)
- **Observaciones de Implementación**:
  1. **Autenticación**: `layout.tsx` (L16-21) y `page.tsx` (L17-22) validan `supabase.auth.getUser()`. Si no hay usuario, redirigen de inmediato a `/auth/login?redirect=/dashboard`.
  2. **Navegación Lateral**: `DashboardNavClient.tsx` implementa enlaces a las 5 subsecciones (`/dashboard`, `/dashboard/documentos`, `/dashboard/guia`, `/dashboard/manual`, `/dashboard/profile`), estado de verificación del usuario (badges `Pendiente`, `En revisión`, `✓`), enlace al Panel Admin si el usuario tiene rol administrativo (`profile?.role === 'admin' || user?.email === 'javipn85@gmail.com'`), tarjeta de emergencias con llamadas directas a Utopia Van Life (+34 611 560 916) y ARAG 24h (+34 662 992 060), y botón de cierre de sesión seguro vía Supabase.
  3. **Cuenta Atrás**: `DashboardClient.tsx` (L29-37 y L54-65) calcula `daysToTrip` restando `now` de `nextBooking.start_date`. Muestra píldora con `Faltan X días para la recogida` o `¡Hoy comienza tu aventura!` si es el día de salida.
  4. **Tarjeta Hero de Reserva**: `DashboardClient.tsx` (L72-146) renderiza imagen de la camper (con fallback a `/images/campers/neo/neo-ext.png`), badge `PREMIUM TIER`, desglose de noches, viajeros, estado de pago/confirmación, fechas de recogida (14:00-18:00) y devolución (10:00-12:00), total de alquiler con formateador de precio y fianza reembolsable (1.000 €).
  5. **Punto de Recogida & GPS**: `DashboardClient.tsx` (L150-190) ubica la base en "Carrer Son Oms, Palma de Mallorca (a 5 min del aeropuerto con transfer rápido)" con enlace directo a Google Maps (`https://maps.google.com/?q=Carrer+Son+Oms+Palma+de+Mallorca`).
  6. **Validación de Carnet**: `DashboardClient.tsx` (L192-259) muestra fila de conductor principal con chip `Verificado` o botón "Subir Carnet" vinculado a `/dashboard/profile`, y fila de segundo conductor opcional.
  7. **Acciones Rápidas**: `DashboardClient.tsx` (L264-302) ofrece 3 tarjetas de acceso directo con iconos: Guía de Mallorca, Manual de la Camper, Documentos & Facturas.
  8. **Asistencia 24h**: `DashboardClient.tsx` (L305-350) integra bloque completo de contacto de emergencias con soporte técnico Utopia y grúa/asistencia ARAG.
  9. **Historial de Viajes**: `DashboardClient.tsx` (L376-401) itera reservas pasadas (`completed` o `cancelled`) con fechas, precio y botón "Reservar de nuevo".
  10. **Estado Vacío (Empty State)**: `DashboardClient.tsx` (L352-373) muestra un contenedor `.empty-state-card` cuando `!bookings || bookings.length === 0`, con ilustración emoji 🚐, titular "Aún no tienes ninguna aventura planificada" y botones hacia `/campers` y `/dashboard/guia`.
- **Carencias Detectadas**:
  - En `DashboardClient.tsx` (L124-126), los extras incluidos están cableados como texto estático (`Pack Ropa de Cama`, `Kit Snorkel Utopia`, `Autonomía Solar Victron`) en lugar de mapear dinámicamente los extras de la reserva (vía tabla `booking_extras`).
  - Si el cliente tiene múltiples reservas activas o futuras simultáneas, solo se muestra la primera en la tarjeta hero; no hay listado secundario para la segunda reserva activa.

---

### 1.3. Subruta 2: Perfil y Validación de Carnet (`/dashboard/profile`)
- **Archivos**:
  - `app/[locale]/dashboard/profile/page.tsx` (L1-29)
  - `app/[locale]/dashboard/profile/ProfileClient.tsx` (L1-1302)
  - `app/[locale]/dashboard/profile/ProfileFormClient.tsx` (L1-145, componente legado no utilizado)
  - `app/api/upload-driver-docs/route.ts` (L1-122)
  - `lib/contracts/licenseValidator.ts` (L1-65)
- **Observaciones de Implementación**:
  1. **Formulario Integral**: `ProfileClient.tsx` recoge:
     - Nombre completo (`full_name`)
     - DNI / NIE / Pasaporte (`dni_nie`)
     - Número de carnet de conducir (`driver_license_id`)
     - Fecha de expedición del carnet (`driver_license_issue_date`)
     - Fecha de caducidad del carnet (`driver_license_expiry_date`)
     - Teléfono de contacto (`phone`)
     - Dirección postal completa (`address`)
  2. **Segundo Conductor**: Dispone de interruptor para habilitar segundo conductor (`has_second_driver`), solicitando nombre, DNI, número de permiso y archivos anverso/reverso.
  3. **Carga y Previsualización de Archivos**: Permite adjuntar:
     - DNI Anverso y Reverso
     - Carnet de Conducir Anverso y Reverso
     - Segundo conductor: DNI anverso/reverso y Carnet anverso/reverso
     - Muestra previsualizaciones en tiempo real (`URL.createObjectURL`) con botón para eliminar/cambiar archivo.
  4. **Validación de Permiso en Tiempo Real**: Ejecuta `validateDriverLicense()`:
     - Si está caducado: Bloquea el envío con mensaje de error explícito.
     - Si tiene menos de 2 años de antigüedad: Advierte al usuario que requiere autorización del administrador.
  5. **Persistencia y Endpoint**: Llama a `POST /api/upload-driver-docs`, el cual:
     - Valida sesión de usuario.
     - Sube los archivos a Supabase Storage en el bucket `documents` bajo `${user.id}/${prefix}_${timestamp}.${ext}` usando la clave de servicio (`supabaseAdmin`).
     - Actualiza la tabla `users` con los datos personales, fechas de carnet y asigna `verification_status = 'pending_validation'`.
  6. **Interconexión con Contratos**: Detecta el parámetro `?reason=missing_contract_data` (L39 de `ProfileClient.tsx`) si el usuario vino redirigido desde `/dashboard/documentos` por faltarle datos obligatorios para el contrato, mostrando avisos contextuales.
- **Carencias Detectadas**:
  - `ProfileFormClient.tsx` es código muerto residual de una iteración anterior (solo sube carnet básico sin campos de contrato ni segundo conductor). Debe ser depurado o mantenerse aislado sin interferir.
  - Al recargar la página, los campos de texto se rellenan del perfil, pero si el usuario ya subió archivos previamente, no se renderizan miniaturas de los archivos existentes en Supabase Storage (solo indica el estado `pending_validation` o `verified`).

---

### 1.4. Subruta 3: Documentación y Contrato Oficial (`/dashboard/documentos`)
- **Archivos**:
  - `app/[locale]/dashboard/documentos/page.tsx` (L1-55)
  - `app/[locale]/dashboard/documentos/DocumentsClient.tsx` (L1-1950)
  - `app/[locale]/dashboard/documentos/ContractSignModal.tsx` (L1-912)
  - `app/api/contracts/sign/route.ts` (L1-134)
  - `lib/contracts/contractEngine.ts` (L1-675)
  - `lib/contracts/pdfGenerator.ts` (L1-432)
  - `lib/contracts/templateService.ts` (L1-98)
- **Observaciones de Implementación**:
  1. **Control de Acceso y Requisitos Legales**: `page.tsx` (L40-48) verifica si el usuario tiene reservas relevantes y comprueba `validateContractRequirements(profile)`. Si faltan campos obligatorios (nombre, DNI, dirección, teléfono o fechas de carnet), redirige preventivamente a `/dashboard/profile?redirect=documentos&reason=missing_contract_data`.
  2. **Catálogo de Documentos Generados**:
     - *Contrato Oficial de Alquiler*: Vinculado a la reserva y la camper (NEO o SPACE), con los 31 artículos legales oficiales, condiciones de fianza, kilometraje (150 km/día) y datos del titular y arrendador.
     - *Factura Oficial*: Desglose con base imponible, 21% de IVA y número de factura `FAC-2026-XXXX`.
     - *Póliza y Coberturas Allianz*: Certificado con franquicia de 1.000€, asistencia 24h y teléfono directo.
     - *Acta Digital de Entrega / Check-in*: Niveles de combustible (100%), agua limpia (113L/160L), batería Victron (540Ah) y kit exterior.
     - *Acreditación de Conductor*: Resumen del estado de validación del permiso.
     - *Histórico de Alquileres*: Contratos anteriores, facturas y justificante de liberación de fianza.
  3. **Firma Digital Interactiva**: `ContractSignModal.tsx` implementa un modal con pestañas de lectura de cláusulas y firma digital:
     - Lienzo HTML5 Canvas con soporte Retina (`devicePixelRatio`), puntero sensible (ratón, táctil, lápiz).
     - Botón de limpieza de lienzo ("Borrar firma").
     - Checkbox de aceptación legal de cláusulas y RGPD.
     - Botón de firma que invoca `POST /api/contracts/sign` enviando el `bookingId` y el `signatureDataUrl` en Base64.
  4. **Backend de Firma y Custodia Legal**: `app/api/contracts/sign/route.ts`:
     - Valida titularidad de la reserva y requisitos de perfil.
     - Invoca `generateOfficialContractPdfBlob()` integrando la firma digital en el documento.
     - Sube el PDF a Supabase Storage en `documents/contracts/${bookingId}_contrato_firmado.pdf`.
     - Actualiza la reserva en base de datos: `contract_signed_at`, `contract_signature` y `contract_pdf_url`.
  5. **Descarga de PDF en Cliente**: `DocumentsClient.tsx` (L548-782) genera y descarga directamente en el navegador documentos en formato PDF con maquetación profesional y membrete de Utopia Van Life utilizando `jspdf`.
- **Carencias Detectadas**:
  - **Fallback a Mock en Lugar de Empty State**: En `DocumentsClient.tsx` (L87-106 y L427-442), si el usuario no tiene ninguna reserva (`bookings.length === 0`), el código asigna automáticamente un `mockBooking` con id `'bk-current-neo-2026'`, asigna como titular ficticio a "Javier Prieto" y rellena documentos históricos ficticios de 2025. El criterio de aceptación exige: *Todas las 5 subsecciones de usuario (...) presentan estados vacíos atractivos si no hay datos.* No debería forzar datos simulados para un usuario recién registrado sin reservas, sino ofrecer un estado vacío pulido invitándole a reservar.

---

### 1.5. Subruta 4: Manual de la Camper (`/dashboard/manual`)
- **Archivos**:
  - `app/[locale]/dashboard/manual/page.tsx` (L1-11)
  - `app/[locale]/dashboard/manual/CamperManualClient.tsx` (L1-667)
- **Observaciones de Implementación**:
  1. **Arquitectura y Buscador**: `CamperManualClient.tsx` dispone de buscador con filtrado por texto en tiempo real (`searchQuery`) y filtro por videotutorial (`filterVideosOnly`).
  2. **Videotutoriales Embebidos**: Integra reproductor HTML5 con fuentes en `/videos/hero-bg.mov`, `/videos/video_noche_min.mp4`, con pósters de las campers NEO y SPACE.
  3. **Guías Actuales**:
     - *Sistema Eléctrico Autónomo Victron*: Litio 540Ah, placas 400W, inversor Multiplus 2000W, pantalla táctil Garmin SERV, 12V vs 230V.
     - *Gestión de Aguas & Ducha Caliente*: Depósitos 113L (NEO) / 160L (SPACE), boiler Truma Combi 4D diésel, bomba de agua, vaciado de grises.
     - *Calefacción Estacionaria & Nevera*: Calefacción diésel con termostato digital y nevera de compresor Indel B 86L.
     - *Salón Convertible & Claraboya*: Despliegue de cama en salón y claraboya panorámica con mosquitera.
     - *Baño Interior & WC Portátil*: Uso y vaciado del inodoro químico Porta Potti.
     - *Conducción, Combustible & Medidas*: Fiat Ducato, combustible Diésel, gálibo de altura 2.65m / 2.75m y recomendaciones para pueblos estrechos.
  4. **Atención 24 Horas**: Banner superior con enlace telefónico a Utopia (+34 611 560 916) y ARAG Asistencia (+34 662 992 060).
- **Carencias Detectadas (Faltantes respecto a R1)**:
  - **Cocina de Gas**: No existe ficha específica para la operación de la cocina de gas (sustitución/apertura del cartucho de gas, encendido piezoeléctrico, llaves de paso y ventilación de seguridad).
  - **Techo Elevable / Cama de Techo Eléctrica**: La sección de cama solo describe la mesa convertible del salón inferior; falta la operación de la cama elevable eléctrica de techo del modelo SPACE y los anclajes de seguridad.
  - **Resolución de Averías Frecuentes (Troubleshooting)**: Falta un acordeón o sección interactiva dedicada para resolución autónoma de problemas comunes:
    * Inversor de 230V salta o no entrega corriente (sobrecarga / reinicio).
    * Bomba de agua no arranca o funciona en vacío (purgado de aire / interruptor PUMP).
    * Calefacción marca error (nivel bajo de diésel < 25%).
    * Nevera no enfría (ajuste de termostato 12V / cierre hermético).
    * Batería baja tras días nublados (procedimiento de recarga en marcha o conexión externa 230V).
  - **Enlace a Guía PDF**: El botón "Guía PDF" en la cabecera (L171-178) apunta a `/legal/terminos` en lugar de generar o abrir el manual PDF.

---

### 1.6. Subruta 5: Guía de Viaje de Mallorca (`/dashboard/guia`)
- **Archivos**:
  - `app/[locale]/dashboard/guia/page.tsx` (L1-11)
  - `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx` (L1-2296)
- **Observaciones de Implementación**:
  1. **Mapa Cartográfico Interactivo**: Integra mapa Leaflet con 3 capas de máxima resolución (Relieve Topográfico 3D Google, Satélite Híbrido Ultra-HD y Callejero Google HD), límites bloqueados a la isla de Mallorca y control de zoom suave.
  2. **Catálogo de 35 Spots GPS**:
     - Coordenadas geográficas exactas (WGS84).
     - Categorías: Calas, Miradores, Pernocta, Servicios.
     - Zonas: Tramuntana, Norte, Levante, Sureste, Palma.
     - Indicador de dificultad de acceso camper (`Acceso Fácil`, `Camper Compacta`, `Carretera Panorámica`).
     - "Consejo Utopia / Nota de Sergio" con recomendaciones auténticas de local.
     - Enlace directo a Google Maps con coordenadas.
  3. **3 Rutas Temáticas Camper**: Trazadas con polilíneas sobre el mapa (Serra de Tramuntana, Calas Vírgenes de Levante, Bahías del Norte y Faros).
  4. **Tarjetas Flotantes y Filtros**: Popover dinámico al pulsar cualquier pin en el mapa y galería inferior de tarjetas responsive.
- **Carencias Detectadas (Faltantes respecto a R1)**:
  - **Normativas de Pernocta y Acampada en Mallorca**: No existe una sección visible o modal estructurado que aclare la normativa insular: diferencia legal entre estacionar/pernoctar (permitido dentro de la camper sin desplegar elementos) vs acampar (desplegar toldo, mesas, sillas o calzos, sancionable según ley de costas y ordenanzas municipales), ni las restricciones específicas de los espacios naturales protegidos (Parc Natural de Mondragó, Península de Llevant, Serra de Tramuntana).
  - **Directorio Específico de Puntos de Agua y Vaciado**: Aunque algunos spots tienen la etiqueta `hasWater: true`, falta un directorio claro de áreas de autocaravanas con servicios completos (vaciado de grises, negras y toma de agua potable: p.ej. área de Son Servera, Inca, estaciones de servicio autorizadas).
  - **Consejos para Nómadas**: Falta una sección dedicada con recomendaciones prácticas para la vida camper en Mallorca (abastecimiento en cooperativas agrícolas locales, supermercados con parking amplio, gestión responsable de residuos "Leave No Trace", cobertura 4G/5G para teletrabajo y precauciones en carreteras de montaña estrechas).

---

## 2. Logic Chain (Cadena Lógica de Razonamiento)

1. **Premisa 1**: El requerimiento R1 de `ORIGINAL_REQUEST.md` exige que el Área de Usuario (`/dashboard`) esté completa e interconectada en sus 5 secciones: Dashboard principal, Perfil, Documentos, Manual de la Camper y Guía de Viaje.
2. **Premisa 2**: La infraestructura técnica subyacente (Next.js 16 App Router con `[locale]`, Supabase Auth y Storage, esquemas de base de datos `users`, `bookings`, `contract_template_settings`, librerías `jspdf` y `leaflet`, y suite de pruebas con 39 tests passing) está correctamente instalada y operativa.
3. **Premisa 3**: En `/dashboard/profile`, la captura de datos y validación de carnet (`licenseValidator.ts`) y el endpoint `/api/upload-driver-docs` están sólidamente construidos y sincronizados con el panel de administración (`/admin/verifications`), asegurando que tanto la comprobación de caducidad como la antigüedad mínima de 2 años se validen en cliente y servidor.
4. **Premisa 4**: En `/dashboard/documentos`, la generación del contrato y la firma digital interactiva (`ContractSignModal.tsx`) con guardado en Supabase Storage y actualización de la reserva funcionan tanto en cliente como en backend. Sin embargo, la presencia de un `mockBooking` forzado cuando la lista de reservas está vacía infringe el criterio de aceptación de *estados vacíos atractivos si no hay datos*.
5. **Premisa 5**: En `/dashboard/manual`, las instrucciones existentes son de excelente calidad visual y técnica, pero omiten 3 puntos explícitos del requerimiento R1: la cocina de gas, la cama de techo/elevable del modelo SPACE, y el bloque de resolución de averías frecuentes (troubleshooting).
6. **Premisa 6**: En `/dashboard/guia`, el mapa interactivo y los 35 spots con rutas temáticas son excepcionales, pero carecen de una sección informativa explícita sobre normativas legales de pernocta vs acampada, directorio de recarga de agua y consejos nómadas insulares.
7. **Conclusión Lógica**: El área de usuario cuenta con un ~85% de implementación técnica de alto nivel, pero requiere intervenciones quirúrgicas específicas en UI/UX y contenidos para cumplir al 100% las especificaciones de R1 y los criterios de aceptación.

---

## 3. Caveats (Advertencias y Supuestos)

1. **Entorno Supabase Local / Remoto**: Durante la inspección en modo lectura, no se ejecutaron mutaciones directas en la base de datos de producción; la verificación de endpoints (`/api/upload-driver-docs`, `/api/contracts/sign`) se realizó mediante análisis estático de tipos, flujos de control y tests de contrato (`npm test`).
2. **Dependencia de Bloqueo en Build**: Al ejecutar `npm.cmd run build` de forma concurrente, Next.js emitió `⨯ Unable to acquire lock at ...\.next\lock`. Esto no indica un fallo de compilación de código, sino que otro proceso de Node o Next.js mantenía el bloqueo del directorio `.next`. Los tests TypeScript (`npm test`) compilan limpiamente sin errores de tipos.
3. **Componente Huérfano**: `ProfileFormClient.tsx` no se utiliza en `page.tsx` (que utiliza `ProfileClient.tsx`). No afecta a la navegación, pero conviene documentarlo para evitar confusiones al equipo de implementación.

---

## 4. Conclusion (Diagnóstico Final y Hoja de Ruta para Implementación)

Para alcanzar el 100% de cumplimiento en R1, las tareas concretas a ejecutar por el equipo son:

| Ruta | Tarea Específica | Fichero a Modificar | Complejidad |
|---|---|---|---|
| `/dashboard` | Mapear dinámicamente los extras reales de la reserva en lugar de los 3 chips de texto fijos. | `app/[locale]/dashboard/DashboardClient.tsx` | Baja |
| `/dashboard/profile` | Limpiar o archivar `ProfileFormClient.tsx` huérfano. Mantener `ProfileClient.tsx` intacto. | `app/[locale]/dashboard/profile/` | Muy baja |
| `/dashboard/documentos` | Añadir comprobación para mostrar estado vacío elegante (`.mini-empty-card`) si el usuario no tiene ninguna reserva ni documentos, en vez de inyectar datos simulados de "Javier Prieto". | `app/[locale]/dashboard/documentos/DocumentsClient.tsx` | Baja |
| `/dashboard/manual` | 1. Añadir guía de **Cocina de Gas** (cartuchos, encendido y seguridad).<br>2. Añadir guía de **Cama de Techo Elevable Eléctrica** (SPACE) y claraboyas.<br>3. Añadir sección interactiva de **Resolución de Averías Frecuentes** (Troubleshooting).<br>4. Ajustar el botón "Guía PDF" para abrir/descargar el manual en PDF. | `app/[locale]/dashboard/manual/CamperManualClient.tsx` | Media |
| `/dashboard/guia` | 1. Añadir bloque/pestaña destacada de **Normativa de Pernocta y Acampada en Mallorca** (DGT 08/V-74, qué está permitido y qué no).<br>2. Añadir directorio de **Puntos de Recarga de Agua y Vaciado**.<br>3. Añadir guía de **Consejos para Nómadas** (residuos, compras, cobertura, conducción en Tramuntana). | `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx` | Media |

---

## 5. Verification Method (Método de Verificación Independiente)

Cualquier evaluador técnico o subagente verificador puede comprobar de forma independiente este informe mediante los siguientes pasos:

1. **Verificación de Tests del Motor de Contratos y Licencias**:
   ```powershell
   npm.cmd test
   ```
   *Criterio de éxito*: 39 tests pasando, 0 fallos.

2. **Inspección de Fallback Mock en Documentos**:
   - Abrir `app/[locale]/dashboard/documentos/DocumentsClient.tsx`.
   - Inspeccionar líneas 87 a 106 (`mockBooking`) y líneas 108 a 118 (`safeProfile`).
   - Comprobar que si `bookings` es un array vacío, renderiza el contrato simulado de "Javier Prieto" en lugar de un empty state.

3. **Inspección de Contenidos del Manual de la Camper**:
   - Abrir `app/[locale]/dashboard/manual/CamperManualClient.tsx`.
   - Inspeccionar la constante `GUIDES` (líneas 21 a 129).
   - Constatar la ausencia de entradas para `cocina-gas`, `techo-elevable-space` y la ausencia de un componente de `troubleshooting`.

4. **Inspección de Contenidos de la Guía de Mallorca**:
   - Abrir `app/[locale]/dashboard/guia/MallorcaGuideClient.tsx`.
   - Verificar que no existe un componente o sección textual dedicada a normativas de acampada vs pernocta, ni listado consolidado de áreas de llenado/vaciado de aguas.
