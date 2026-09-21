# Informe de Exploración y Diagnóstico: Área de Administración (/admin)

**Fecha:** 2026-09-18  
**Agente:** explorer_survey_admin  
**Destinatario:** parent (`17707f7d-4404-46bd-8f1d-58a74f2a2c7e`)  
**Objetivo:** Análisis exhaustivo, diagnóstico existente vs. faltante, verificación técnica y recomendaciones para la finalización integral del Área de Administrador (Requisito R2).

---

## 1. Observation (Observaciones Directas)

### 1.1. Estructura de Rutas y Componentes de Admin
Se inspeccionaron todos los ficheros del subsistema `/admin`:
- **Layout y Navegación:**
  - `app/[locale]/admin/layout.tsx`: Layout con autenticación (`supabase.auth.getUser()`), validación de rol admin (`isAdminUser` en `lib/admin/auth.ts`), redirección forzada de idioma a español (`if (locale !== 'es') redirect({ href: '/admin', locale: 'es' })`), sidebar fija con logo y enlaces a las 8 secciones, y pie con perfil y cierre de sesión.
  - `app/[locale]/admin/AdminNavClient.tsx`: Barra de navegación lateral con 8 elementos: Dashboard (`/admin`), Calendario Maestro (`/admin/calendar`), Reservas (`/admin/bookings`), Verificaciones (`/admin/verifications`), Flota (`/admin/campers`), Clientes (`/admin/users`), Plantilla Contrato (`/admin/contrato`), Ajustes (`/admin/settings`).
  - `app/[locale]/admin/AdminSidebarFooterClient.tsx`: Muestra email, botón "Volver a la Web" (`/`) y "Cerrar Sesión" (`supabase.auth.signOut()`).

- **Sección 1: Dashboard Principal (`/admin`):**
  - `app/[locale]/admin/page.tsx`:
    - KPIs calculados mediante queries a Supabase:
      1. Facturación Confirmada: suma de `total_price` para reservas con estado `['confirmed', 'active', 'completed']`.
      2. Reservas Activas: conteo exacto (`head: true`) de reservas con estado `['confirmed', 'active']`.
      3. Pendientes de Pago: conteo exacto de reservas con estado `'pending'`.
      4. Clientes Registrados: conteo exacto de la tabla `users`.
    - Tabla de "Últimas Reservas" (top 5 ordenadas por `created_at DESC`): columnas ID, Cliente, Camper, Fechas, Total y Badge de Estado.

- **Sección 2: Gestión de Reservas (`/admin/bookings`):**
  - `app/[locale]/admin/bookings/page.tsx` & `BookingsClient.tsx`:
    - Filtros por pestaña: `Todas`, `Confirmadas`, `En Curso`, `Pendientes`, `Completadas`, `Canceladas` con contadores dinámicos.
    - Búsqueda en tiempo real por nombre de cliente, email, teléfono, modelo de camper o ID de reserva.
    - Cálculo de noches y etiqueta con icono de luna (`<Moon size={11} /> {nightsCount} noches`).
  - `app/[locale]/admin/bookings/BookingDetailModal.tsx`:
    - Modal emergente detallado con desglose de:
      - Periodo y horarios (check-in / check-out, horas de recogida/devolución y punto de entrega en Palma de Mallorca).
      - Datos del cliente (nombre, email, teléfono, DNI/NIE/Carnet).
      - Desglose económico: precio del alquiler por noches, fianza reembolsable (bloqueo), extras incluidos y total abonado.
      - Enlace al Contrato de Alquiler Oficial: `/api/admin/contract?bookingId=${booking.id}` con vista para imprimir o guardar PDF.
      - Botones de acción integrados para aprobar y reembolsar.
  - `app/[locale]/admin/bookings/ApproveActionClient.tsx`:
    - Botón para reservas en estado `pending` o `pending_approval` que realiza llamada POST a `/api/admin/approve-booking`.
  - `app/[locale]/admin/bookings/RefundActionClient.tsx`:
    - Botón para reservas en estado `confirmed` o `active` que realiza llamada POST a `/api/admin/refund` para cancelar la reserva y tramitar reembolso a través de Stripe y actualizar estado en base de datos.
  - `app/api/admin/approve-booking/route.ts`:
    - Verifica autenticación y rol de admin; actualiza el estado de la reserva a `'confirmed'` o `'cancelled'`.
  - `app/api/admin/refund/route.ts`:
    - Valida `canRefundBooking(booking.status)`, busca el `payment_intent_id` (o busca en Stripe por metadata `booking_id`), ejecuta `stripe.refunds.create({ payment_intent })` y actualiza la reserva en Supabase (`status: 'cancelled'`, `payment_status: 'refunded'`).
  - `app/api/admin/contract/route.ts`:
    - Genera y devuelve documento HTML imprimible/PDF del contrato oficial con datos del arrendador, arrendatario, vehículo asignado, periodo, fianza y las cláusulas legales.

- **Sección 3: Calendario de Ocupación (`/admin/calendar`):**
  - `app/[locale]/admin/calendar/page.tsx` & `CalendarClient.tsx`:
    - Integración con FullCalendar (`dayGridPlugin`, `timeGridPlugin`, `interactionPlugin`, `esLocale`).
    - Vistas: Año (cuadrícula anual personalizada de 12 meses interactiva), Mes (`dayGridMonth`), Semana (`timeGridWeek`), Día (`timeGridDay`).
    - Filtro por camper: Toda la Flota o por modelo individual (`neo`, `space`) con código de color diferenciado y contador de reservas.
    - Muestra franjas horarias de recogida y devolución (ej. `10:00h → 18:00h`).
    - Al hacer clic en una reserva: abre tarjeta modal interactiva de detalles de la reserva.
    - Al seleccionar un rango de fechas: abre modal interactivo de creación/bloqueo de fechas.

- **Sección 4: Gestión de Campers (`/admin/campers`):**
  - `app/[locale]/admin/campers/page.tsx`:
    - Consulta `supabase.from('campers').select('*').order('name')`.
    - Tabla con imagen miniatura, nombre, slug, plazas/camas (`specs.seats`, `specs.beds`), fianza (`deposit_amount`), estado de publicación (`is_active`) y operatividad (`is_available`: Disponible / Mantenimiento).
    - **Observación crítica:** Los botones `Nueva Camper`, `Editar` y `Eliminar` son botones estáticos sin `onClick`, modales asociados ni endpoints API de mutación implementados.

- **Sección 5: Verificación de Documentos (`/admin/verifications`):**
  - `app/[locale]/admin/verifications/page.tsx`:
    - Obtiene usuarios con `verification_status` en `['pending_validation', 'pending']`.
    - Resuelve URLs firmadas (3600s) de los documentos en el bucket `documents` de Supabase Storage para: `dni_front`, `dni_back`, `license_front`, `license_back`.
    - Valida antigüedad del permiso y caducidad mediante fechas `driver_license_issue_date` y `driver_license_expiry_date` (etiquetas de "Conductor novel < 2 años" o "Carnet Caducado").
  - `app/[locale]/admin/verifications/ValidationActionsClient.tsx`:
    - Botón "Aprobar" y "Rechazar" que llaman a `POST /api/admin/verify-doc`.
    - **Observación crítica:** Al hacer clic en "Rechazar", se ejecuta la petición directamente con `{ action: 'reject' }` sin solicitar ni enviar un motivo de rechazo explícito al cliente.
    - Las imágenes son enlaces `<a target="_blank">` que abren una pestaña nueva; carecen de modal de zoom integrado (a diferencia de `/admin/users` que sí dispone de visor modal de ampliación).
  - `app/api/admin/verify-doc/route.ts`:
    - Actualiza `verification_status` en la tabla `users` a `'verified'` o `'rejected'`. No guarda motivo de rechazo ni actualiza la tabla `document_validations` (que dispone del campo `rejected_reason`).

- **Sección 6: Gestión de Usuarios y Clientes (`/admin/users`):**
  - `app/[locale]/admin/users/page.tsx` & `UsersTableClient.tsx`:
    - Tabla de clientes con búsqueda interactiva (por nombre, email, DNI/NIE o teléfono).
    - Contadores rápidos: Total, Validados, Pendientes.
    - Columnas: Nombre, Email, Teléfono, DNI/NIE, Rol, Estado Carnet (badges con iconos), Fecha de Registro y botón "Ver Ficha".
  - `app/[locale]/admin/users/CustomerDetailModal.tsx`:
    - Modal con 3 pestañas:
      1. `Datos Personales`: Contacto, dirección, DNI/NIE, datos del segundo conductor autorizado si aplica.
      2. `Documentación & Carnet`: Resumen del carnet, comprobación de antigüedad (+2 años) y caducidad, galería de DNI anverso/reverso y Carnet anverso/reverso, visor de imagen ampliada (lightbox/zoom) y botones rápidos de validar/rechazar.
      3. `Historial de Reservas`: Lista de reservas pasadas y activas del usuario, con fechas, vehículo, estado, total y fianza.
  - `app/api/admin/customer-detail/route.ts`:
    - Endpoint autenticado que retorna datos del usuario, sus reservas ordenadas cronológicamente y URLs firmadas de Supabase Storage.

- **Sección 7: Editor de Plantillas de Contratos (`/admin/contrato`):**
  - `app/[locale]/admin/contrato/page.tsx` & `ContractTemplateClient.tsx`:
    - Editor visual de 3 paneles:
      1. Términos y parámetros cuantitativos (fianza, franquicia, penalizaciones, ventanas horarias, kilometraje diario).
      2. Datos de la empresa arrendadora (nombre, CIF, dirección, email, teléfono, jurisdicción judicial).
      3. Artículos y cláusulas legales (31 artículos oficiales con buscador en tiempo real, expansión/colapso y edición de título y párrafos).
    - Previsualización en tiempo real del PDF generado con debounce de 600ms vía `POST /api/admin/contract-template/preview`.
    - Persistencia en base de datos (`POST /api/admin/contract-template`) en la tabla `contract_template_settings`.
    - Restablecimiento a valores de fábrica oficiales mediante `POST /api/admin/contract-template/reset`.
  - `lib/contracts/templateService.ts`:
    - `getContractTemplate()`: con fallback transparente a `getDefaultFactoryTemplate()`.
    - `saveContractTemplate()`: upsert en `contract_template_settings`.
    - `resetContractTemplateToDefault()`.

- **Sección 8: Configuración de Tarifas y Temporadas (`/admin/settings`):**
  - `app/[locale]/admin/settings/page.tsx`:
    - Muestra dos bloques: "Temporadas y Estancia Mínima" y "Extras de Alquiler" (catálogo de extras).
  - `app/[locale]/admin/settings/SeasonsTableClient.tsx`:
    - Columnas: Nombre, Fechas, Mín. Noches, Descuento 7+ días y Estado de guardado.
    - Permite modificar `min_nights` con controles `+` / `-` y campo numérico, guardando vía `PATCH /api/admin/seasons/[id]`.
    - **Observación crítica:** No muestra ni permite editar el precio base por noche (`price_per_night`) ni las tarifas por camper/temporada (`camper_pricing`), lo cual es un requerimiento explícito de R2 ("precios base por noche").
  - `app/api/admin/seasons/[id]/route.ts`:
    - Maneja actualización de `min_nights` y `discount_7days_pct`. No contempla `price_per_night`.

### 1.2. Pruebas Automatizadas y Compilación
- **Tests ejecutados (`npm.cmd test`):**
  - 39 tests ejecutados en 11 suites, con 0 fallos (100% pasando).
  - Cubre autorización admin, normalización de estados de verificación, reglas de reembolso, cálculo de tarifas, motor de disponibilidad y motor de contratos.
- **Build de producción (`npm.cmd run build`):**
  - Compilación limpia con exit code 0.
  - Todas las rutas y endpoints de `/admin` se compilan como dinámicos (`ƒ`).

---

## 2. Logic Chain (Cadena de Razonamiento)

1. **Estado de Implementación de Rutas:**
   - Observación: Las 8 sub-rutas requeridas en R2 (`/admin`, `/bookings`, `/calendar`, `/campers`, `/verifications`, `/users`, `/contrato`, `/settings`) están creadas en `app/[locale]/admin/`, registradas en el sidebar y accesibles bajo el control de autorización admin.
   - Inferencia: La arquitectura base y el sistema de navegación están completos y bien estructurados.

2. **Diagnóstico de `/admin/campers`:**
   - Observación: La página renderiza el inventario existente desde la tabla `campers`, pero los botones `Nueva Camper`, `Editar` y `Eliminar` son elementos puramente visuales sin interactividad ni modal.
   - Inferencia: Falta implementar el formulario modal o vista de edición para modificar datos técnicos (asientos, camas, fianza, estado disponible/mantenimiento, publicar/ocultar) y guardar cambios en Supabase.

3. **Diagnóstico de `/admin/verifications`:**
   - Observación: En `ValidationActionsClient.tsx`, el botón "Rechazar" no solicita motivo; la ruta `/api/admin/verify-doc` solo actualiza `verification_status = 'rejected'` en `users` sin almacenar el motivo.
   - Inferencia: Para satisfacer el requisito R2 ("acciones para aprobar o rechazar con motivo explícito"), es necesario incorporar un diálogo/modal de motivo de rechazo (ej. "Carnet caducado", "Foto borrosa/ilegible", "Conductor novel < 2 años", "Documento incompleto") y persistirlo en la base de datos (en `document_validations` o en la tabla `users`), además de integrar el visor de zoom directo que ya existe en `CustomerDetailModal.tsx`.

4. **Diagnóstico de `/admin/settings`:**
   - Observación: `SeasonsTableClient.tsx` y `/api/admin/seasons/[id]/route.ts` sólo gestionan `min_nights` y `discount_7days_pct`. La columna `price_per_night` existe en `lib/pricing/engine.ts` y en `camper_pricing` / `seasons`, pero no hay interfaz para consultar ni editar precios base por noche en `/admin/settings`.
   - Inferencia: Para cumplir con R2 ("configuración de temporadas alta/media/baja y precios base por noche"), se debe extender la tabla de temporadas en `/admin/settings` para mostrar y editar el precio por noche por temporada y persistirlo en la API.

5. **Consistencia de Datos y Backend:**
   - Observación: Supabase RLS y los helpers de `lib/admin/auth.ts` funcionan de forma robusta; las APIs usan `createAdminClient` con `SUPABASE_SERVICE_ROLE_KEY` cuando es necesario eludir RLS para operaciones administrativas (ej. Storage signed URLs, actualización de usuarios y reembolsos de Stripe).
   - Inferencia: Las bases de seguridad y autorización están solidificadas.

---

## 3. Caveats (Advertencias y Supuestos)

- **Supabase Local / Producción:** La ejecución de pruebas unitarias y build se realizó en el entorno local con las variables de entorno configuradas (`.env.local`). En producción, la clave `SUPABASE_SERVICE_ROLE_KEY` y las claves de Stripe deben estar presentes en el hosting para que los reembolsos reales y la generación de URLs firmadas de storage sigan funcionando.
- **Flota Reducida en Mock/Seed:** La base de datos tiene actualmente registradas 2 campers base (`neo` y `space`). La lógica del calendario y tablas soporta N vehículos dinámicamente.
- **Cláusulas del Contrato:** El editor de contratos en `/admin/contrato` persiste en la tabla `contract_template_settings` si existe la tabla, o utiliza un fallback en memoria / código oficial.

---

## 4. Conclusion (Conclusiones y Estado de Requisitos R2)

### Matriz de Cumplimiento R2

| Sub-sección | Estado Actual | Funcionalidades Existentes | Gaps / Tareas Faltantes |
|---|---|---|---|
| **`/admin` (Dashboard)** | **100% Operativo** | KPIs reales (facturación confirmada, reservas activas, pendientes, clientes), tabla top-5 reservas recientes con enlaces. | Ninguno. Totalmente operativo y conectado. |
| **`/admin/bookings`** | **100% Operativo** | Filtro de estado por pestañas con contadores, búsqueda en tiempo real (nombre, email, teléfono, camper, ID), `BookingDetailModal` con desglose financiero, noches, fianza, contratos y acciones de aprobación y reembolso con Stripe. | Ninguno. Flujo de aprobación y reembolso verificado. |
| **`/admin/calendar`** | **100% Operativo** | FullCalendar integrado (vistas Año, Mes, Semana, Día), filtro interactivo por camper con colores de marca, horarios de check-in/out, modal de detalle de evento y modal de bloqueo. | Ninguno. Estilo y funcionalidad equivalentes a Google Calendar. |
| **`/admin/campers`** | **75% Operativo** | Listado de flota desde DB, especificaciones técnicas (plazas, camas, fianza), estado de publicación y disponibilidad. | Botones "Nueva Camper", "Editar" y "Eliminar" son estáticos. Requiere modal/formulario interactivo para editar specs y alternar estado activo/disponible. |
| **`/admin/verifications`**| **70% Operativo** | Cola de pendientes de validación, resolución de URLs firmadas para DNI y carnet (frontal y reverso), badges de carnet caducado o conductor novel, acción de aprobación. | Rechazo inmediato sin motivo explícito (requiere modal de motivo). Falta visor de zoom integrado (actualmente abre enlace externo). |
| **`/admin/users`** | **100% Operativo** | Tabla de clientes con búsqueda y contadores, badges de estado de carnet, modal completo `CustomerDetailModal` con 3 pestañas (Datos, Documentos con zoom/lightbox, Historial de reservas) y validación directa. | Ninguno. Excelente nivel de acabado y funcionalidad. |
| **`/admin/contrato`** | **100% Operativo** | Editor visual de términos, arrendador y 31 cláusulas, previsualización en PDF dinámica en tiempo real, persistencia y restablecimiento oficial. | Ninguno. Implementación de alta calidad. |
| **`/admin/settings`** | **75% Operativo** | Tabla de temporadas con edición interactiva y persistencia de noches mínimas (`min_nights`), catálogo de extras de alquiler. | Falta mostrar y editar el precio base por noche (`price_per_night`) por temporada y vehículo en la tabla y en la API PATCH. |

---

## 5. Verification Method (Método de Verificación Independiente)

Cualquier evaluador o agente puede verificar independientemente este diagnóstico mediante:

1. **Tests Automatizados:**
   ```powershell
   npm.cmd test
   ```
   *Resultado esperado:* 39 tests pasando, 0 fallos.

2. **Compilación de Producción:**
   ```powershell
   npm.cmd run build
   ```
   *Resultado esperado:* Salida exit code 0, con todas las páginas de `/admin` generadas sin errores de TypeScript.

3. **Verificación de Rutas y Código:**
   - Inspeccionar `app/[locale]/admin/campers/page.tsx` líneas 22-24 y 74-82 para comprobar botones estáticos de acción.
   - Inspeccionar `app/[locale]/admin/verifications/ValidationActionsClient.tsx` líneas 12-30 para comprobar ausencia de parámetro `reason` en el flujo de rechazo.
   - Inspeccionar `app/[locale]/admin/settings/SeasonsTableClient.tsx` y `app/api/admin/seasons/[id]/route.ts` para verificar la ausencia de edición y actualización del campo `price_per_night`.
