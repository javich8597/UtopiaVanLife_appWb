# Diseño Técnico: Contrato de Alquiler Automático, Firma Digital y Generación de PDF

**Fecha:** 2026-09-03  
**Proyecto:** Utopia Van Life Web App  
**Ruta afectada:** `/es/dashboard/documentos` (`http://localhost:3000/es/dashboard/documentos`)  
**Documento base:** `docs/Contract/CONTRATO ALQUILER.md`

---

## 1. Objetivos y Alcance

1. **Rellenado Automático Fidedigno:** El contrato oficial de alquiler de campers debe autocompletarse con los datos reales del usuario (nombre, DNI/NIE, teléfono, dirección, carnet de conducir con antigüedad) y de la reserva (camper asignada, matrícula, fechas y horas de recogida/devolución, precio total y fianza de 1.000 €).
2. **Validación Estricta y Redirección:** Si el cliente no ha completado los datos obligatorios o el carnet no cumple las condiciones legales (mínimo 2 años de antigüedad o caducado), se le redirige automáticamente a `/dashboard/profile` con una advertencia explicativa para completar el perfil antes de poder entrar a la gestión del contrato.
3. **Firma Digital Interactiva:** En la sección de documentos del dashboard, el cliente podrá revisar el contrato y firmarlo mediante un modal interactivo con un canvas táctil/ratón y aceptación de términos.
4. **Generación de PDF Oficial Multipágina:** Generación de un PDF oficial completo que contenga la carátula de las partes, los 17 artículos del contrato legal (`CONTRATO ALQUILER.md`), la cláusula de RGPD y el bloque de firmas con el sello oficial de Utopia Van Life S.L. (Roberto Estébanez Blanco) y la firma trazada por el cliente.
5. **Custodia en Supabase:** El PDF firmado y los metadatos de la firma se almacenan en Supabase (tabla `bookings` y bucket de Storage `documents`) para descarga y consulta permanente por parte del cliente y del administrador.

---

## 2. Validación de Datos y Redirección de Perfil

### Reglas de Validación
- `full_name`: Cadena no vacía.
- `dni_nie`: Formato válido de DNI/NIE/Pasaporte.
- `phone`: Teléfono de contacto registrado.
- `address`: Dirección de residencia completa.
- `driver_license_id`: Número de carnet de conducir.
- `driver_license_issue_date`: Fecha de expedición con antigüedad mínima de 2 años respecto a la fecha actual.
- `driver_license_expiry_date`: Fecha de caducidad posterior a la fecha actual (carnet en vigor).

### Comportamiento de Redirección
- Si el usuario accede a `/dashboard/documentos` y cuenta con una reserva activa o confirmada pero incumple alguna de las reglas de validación anteriores:
  - Se ejecuta una redirección automática a `/dashboard/profile?redirect=documentos&reason=missing_contract_data`.
  - En la página de perfil se muestra un banner superior:  
    *«Para poder generar y firmar el contrato oficial de tu reserva, es necesario que completes los datos obligatorios de conductor y domicilio.»*

---

## 3. Estructura y Fuentes de Datos del Contrato

El motor `lib/contracts/contractEngine.ts` suministra los datos estructurados:

1. **Arrendador:**
   - Razón Social: `UTOPIA VAN LIFE SL`
   - CIF: `B24902637`
   - Domicilio Social: `C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2, CP.: 28703 San Sebastián de los Reyes, Madrid, España`
   - Actividad: Arrendamiento de vehículos vivienda sin conductor en la isla de Mallorca.
   - Representante: `ROBERTO ESTEBANEZ BLANCO`
2. **Arrendatario:**
   - Nombre completo, DNI/NIE/Pasaporte, fecha de carnet de conducir y antigüedad en años, dirección postal, teléfono e email.
3. **Otros Ocupantes / Segundo Conductor:**
   - Si `has_second_driver` está habilitado en el perfil: nombre, DNI y carnet de conducir.
4. **Vehículo:**
   - Modelo: `FIAT DUCATO` (`Nomade NEO` o `Nomade SPACE`).
   - Matrícula: Asignada dinámicamente desde la base de datos de la camper (`camper.plate_number`) con respaldos predeterminados por modelo.
5. **Duración y Lugar:**
   - Fecha y hora de inicio del alquiler (Check-in a partir de la hora fijada).
   - Fecha y hora de finalización del alquiler (Check-out antes de la hora fijada).
   - Lugar: Palma de Mallorca (Base Utopia Son Oms / Aeropuerto PMI).
6. **Precio y Fianza:**
   - Precio total de la reserva (IVA incluido).
   - Fianza: **1.000 €** (depósito mediante tarjeta bancaria antes de la entrega).
7. **Artículos Legales Íntegros (Capítulos I a XIV):**
   - Art. 1: Identificación del Arrendador.
   - Art. 2 y 3: Proceso de reserva, precio, condiciones de cancelación y cambio de fechas.
   - Art. 4 y 5: Conductores autorizados (25 años, carnet B con 2 años), usos permitidos y prohibidos.
   - Art. 6, 7 y 8: Entrega con checklist y video pericial, fianza de 1.000 €, devolución y combustible.
   - Art. 9: Kilometraje (150 km/día acumulables en la isla de Mallorca).
   - Art. 10 y 11: Seguro a todo riesgo con franquicia, exclusiones y responsabilidades por multas/infracciones.
   - Art. 12: Prohibición de fumar, mascotas (salvo autorización) y eventos festivos.
   - Art. 13 y 14: Averías mecánicas, asistencia 24h y resolución contractual anticipada.
   - Art. 15, 16 y 17: Legislación aplicable, jurisdicción (Juzgados de Palma de Mallorca) y tratamiento de datos personales conforme al RGPD.

---

## 4. Componentes y Flujo de Usuario

### 4.1. Vista de Documentos (`app/[locale]/dashboard/documentos/DocumentsClient.tsx`)
- Renderiza la tarjeta de estado del contrato vinculada a la reserva más próxima del usuario:
  - **Estado Pendiente:** Botón destacado *"Leer y Firmar Contrato"* (abre el modal de firma) y botón *"Ver Borrador"*.
  - **Estado Firmado:** Etiqueta verde *"✓ Contrato Oficial Firmado"*, fecha/hora de formalización y botón *"Descargar PDF Firmado"*.

### 4.2. Modal de Lectura y Firma (`ContractSignModal.tsx`)
- **Pestaña 1 (Lectura del Contrato):** Vista renderizada con diseño Utopia Van Life que permite leer el documento completo con todos los campos sustituidos en tiempo real.
- **Pestaña 2 (Firma Digital):**
  - Canvas HTML5 con captura de trazos táctiles (touch events) y de puntero/ratón (pointer events).
  - Botón de limpieza de firma (*"Borrar trazo"*).
  - Casilla de aceptación explícita de condiciones.
  - Botón *"Confirmar y Firmar Contrato"*, que envía el payload al endpoint API.

### 4.3. Endpoint de Firma (`/api/contracts/sign/route.ts`)
- Valida la sesión del usuario.
- Valida que la reserva pertenezca al usuario y no esté cancelada.
- Valida que los datos del perfil y la firma base64 sean válidos.
- Genera el archivo PDF oficial multipágina sellado.
- Sube el PDF a Supabase Storage (`documents/contracts/${bookingId}_contrato.pdf`).
- Actualiza la reserva en la base de datos:
  - `contract_signed_at` = fecha y hora ISO actual.
  - `contract_signature` = imagen PNG base64.
  - `contract_pdf_url` = URL pública o firmada del PDF generado.
- Devuelve `{ success: true, pdfUrl, signedAt }`.

### 4.4. Motor de PDF Multipágina (`lib/contracts/pdfGenerator.ts`)
- Utiliza `jspdf` configurado con márgenes, encabezados de Utopia Van Life, paginación dinámica (*Página X de Y*), tipografía estructurada y salto de página controlado.
- Incluye:
  1. Carátula con resumen ejecutivo, identificación de las partes, vehículo, fechas y precios.
  2. Todos los artículos legales con saltos de página limpios para evitar cortes de texto.
  3. Cláusula RGPD completa.
  4. Bloque final de doble firma con:
     - Sello oficial y firma de Roberto Estébanez Blanco (Utopia Van Life S.L.).
     - Firma vectorial/rasterizada del cliente capturada desde el canvas.
     - Fecha oficial de emisión y referencia única.

---

## 5. Plan de Verificación

1. **Verificación de Validación y Redirección:**
   - Crear un caso de usuario con perfil incompleto (sin DNI o carnet) -> verificar que `/dashboard/documentos` redirige a `/dashboard/profile` con alerta.
   - Completar los datos de perfil -> verificar que `/dashboard/documentos` permite acceder a la gestión del contrato sin redirección.
2. **Verificación del Autocompletado:**
   - Comprobar que los datos del cliente, la camper, las fechas de reserva, la fianza de 1.000 € y los extras contratados coinciden exactamente con la reserva.
3. **Verificación del Canvas de Firma:**
   - Probar dibujo con ratón y con toques táctiles móviles.
   - Probar el botón de borrar trazo.
   - Intentar enviar sin dibujar nada -> verificar que bloquea el envío.
4. **Verificación del PDF Generado:**
   - Generar el PDF y revisar que:
     - El texto de los 17 artículos no tiene saltos de página cortados o superposiciones.
     - Contiene la firma y sello de Utopia Van Life y la firma del cliente.
     - Se descarga correctamente en el navegador y se visualiza en visores PDF estándar.
5. **Verificación de Almacenamiento:**
   - Comprobar que en la base de datos se guarda `contract_signed_at` y que el archivo PDF queda alojado en Supabase Storage.
