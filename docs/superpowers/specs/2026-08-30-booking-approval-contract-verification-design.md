# Especificación de Diseño: Flujo de Aprobación de Reservas, Contratos Dinámicos (NEO / SPACE) y Verificación de Documentación

**Fecha**: 30 de Agosto de 2026  
**Proyecto**: Utopia Van Life (Mallorca)  
**Estado**: Validado / Listo para Planificación  

---

## 1. Visión General y Objetivos

El objetivo de esta funcionalidad es implementar un flujo integral y seguro de alquiler de furgonetas camper en Utopia Van Life:
1. **Control de Disponibilidad y Aprobación**: El usuario reserva y paga, pero la reserva queda en estado `pending_approval` para que el Administrador valide fechas y evite cualquier conflicto de overbooking o disponibilidad antes de la confirmación final.
2. **Onboarding y Recogida de Datos del Conductor**: Tras el pago (o posteriormente desde su panel privado), el usuario introduce sus datos personales completos y sube la documentación requerida por ambas caras (DNI/Pasaporte y Carnet de conducir).
3. **Generación Automática de Contrato Legal**: El sistema detecta dinámicamente si el modelo alquilado es **NEO** o **SPACE**, auto-rellena todos los datos del arrendatario, fechas, horas, precios, fianza y especificaciones técnicas del vehículo en una plantilla legal oficial, lista para firma y descarga en PDF.
4. **Validación Automática de Carnet**: Comprobación en frontend y backend de la vigencia del carnet y aviso visual si el conductor tiene menos de 2 años de antigüedad o carnet próximo a caducar.

---

## 2. Arquitectura del Flujo de Usuario y Estados

```
[Checkout: Pago CaixaBank / Bizum / TPV] 
         │
         ▼
[Estado: pending_approval]
         │
         ├───> [Pantalla Post-Pago / Onboarding]
         │        ├── Opción A: Rellenar Datos y Subir 4 Fotos (DNI + Carnet)
         │        └── Opción B: "Completar más tarde" (Ir a Dashboard)
         │
         ▼
[Dashboard de Usuario]
   └── Banner de alerta si falta documentación
   └── Formulario accesible en /dashboard/documentos
         │
         ▼
[Panel Administrador: /admin/bookings & /admin/verifications]
   ├── Visualización de datos de la reserva y 4 fotos de documentos
   ├── Badge de estado de carnet (Válido / ⚠️ Novel <2 años / ⚠️ Caducado)
   │
   ├── Acción 1: "Aceptar y Confirmar Reserva"
   │       └── Pasa estado a 'confirmed'
   │       └── Genera contrato auto-rellenado (NEO vs SPACE)
   │       └── Notifica al usuario
   │
   └── Acción 2: "Rechazar / Reembolsar"
           └── Pasa estado a 'cancelled'
           └── Tramita devolución / reembolso (CaixaBank / Bizum)
```

---

## 3. Modelo de Datos y Esquema

### 3.1. Campos del Usuario / Conductor (`users` / `user_metadata`)
- `full_name`: Nombre y Apellidos completos.
- `dni_nie`: DNI / NIE / Pasaporte / Documento Europeo.
- `driver_license_id`: Número de carnet de conducir.
- `driver_license_issue_date`: Fecha de expedición del carnet.
- `driver_license_expiry_date`: Fecha de expiración / caducidad del carnet.
- `address`: Dirección completa (calle, número, código postal, ciudad, país).
- `phone`: Número de teléfono con prefijo.
- `email`: Correo electrónico.
- `verification_status`: `'not_submitted'` | `'pending'` | `'verified'` | `'rejected'`.

### 3.2. Archivos de Documentación (Supabase Storage: bucket `documents`)
- `dni_front`: Foto anverso del DNI/Pasaporte.
- `dni_back`: Foto reverso del DNI/Pasaporte.
- `license_front`: Foto anverso del Carnet de conducir.
- `license_back`: Foto reverso del Carnet de conducir.

### 3.3. Detección de Modelo y Datos del Contrato (`campers`)
- **NEO**:
  - `model_name`: Nomade NEO
  - `vehicle_type`: Fiat Ducato L2H2 (5.41m longitud)
  - `capacity`: 2-3 Plazas homologadas
  - `specs`: Salón trasero convertible, cocina completa, baño compacto interior con ducha, panel solar 200W, batería litio 150Ah, depósito 90L.
- **SPACE**:
  - `model_name`: Nomade SPACE
  - `vehicle_type`: Fiat Ducato L3H2 (5.99m longitud)
  - `capacity`: 4 Plazas homologadas
  - `specs`: Doble cama de matrimonio trasera, salón XL con asientos giratorios, cocina premium, cabina de baño cerrada, panel solar 400W, batería litio 200Ah, depósito 120L.
- **Condiciones comunes**:
  - Fianza / Franquicia estándar: 1.000,00 €.
  - Asistencia en carretera 24/7 en Mallorca.
  - Kilometraje ilimitado en la isla de Mallorca.

---

## 4. Componentes y Vistas a Implementar / Modificar

### 4.1. Pantalla de Éxito y Asistente Post-Pago (`/checkout/success`)
- **Vista interactiva**:
  - Encabezado de confirmación de reserva pendiente de aprobación.
  - Asistente de 2 pasos:
    - **Paso 1**: Formulario con campos personales y de carnet con validación de fechas (expedición < 2 años muestra advertencia informativa).
    - **Paso 2**: Dropzone de 4 ranuras (DNI frontal, DNI trasero, Carnet frontal, Carnet trasero) con vista previa inmediata.
  - Acciones:
    - Botón primario: *"Guardar y Enviar Documentación"*.
    - Botón secundario: *"Completar más tarde (Ir a mi panel)"*.

### 4.2. Módulo de Documentación en Panel de Usuario (`/dashboard/documentos`)
- Si faltan datos o fotos: Banner destacado con botón de *"Subir Documentación Pendiente"*.
- Si la reserva ha sido aprobada por el admin:
  - Generador de Contrato dinámico auto-rellenado con visualizador HTML/PDF.
  - Módulo de firma digital del cliente (checkbox legal + nombre completo o trazo digital).
  - Botón de descarga en PDF y versión para imprimir.

### 4.3. Panel de Administración (`/admin/bookings` y `/admin/verifications`)
- Lista de reservas filtrables con badge `Pendiente de Aprobación`.
- Modal/Drawer de detalle de reserva:
  - Resumen de cliente, fechas, horas, camper (NEO / SPACE) y desglose económico.
  - Visor modal de las 4 imágenes de documentos.
  - Indicador de conductor:
    - 🟢 *Carnet Válido (>2 años de antigüedad)*.
    - 🟡 *Aviso: Conductor novel (<2 años de antigüedad)*.
    - 🔴 *Aviso: Carnet caducado o próximo a expirar*.
  - Botones de acción:
    - **"Aceptar y Confirmar Reserva"**: actualiza a `confirmed`, genera el contrato y notifica al cliente.
    - **"Rechazar Reserva y Reembolsar"**: ejecuta la API de reembolso y cancela la reserva.

---

## 5. Plantilla Legal y Motor de Contratos

La plantilla de contrato de arrendamiento de vehículo sin conductor para Utopia Van Life contendrá:
1. **Encabezado y Partes Intervinientes**: Arrendador (Utopia Van Life S.L., CIF, Palma de Mallorca) y Arrendatario (datos del usuario auto-rellenados).
2. **Objeto del Contrato**: Vehículo identificado (NEO o SPACE con matrícula, chasis, longitud y plazas).
3. **Periodo de Alquiler**: Fechas y horas exactas de inicio (Check-in) y fin (Check-out).
4. **Precio y Depósito de Garantía**: Desglose de importe total, extras y fianza de 1.000 €.
5. **Condiciones de Uso**: Ámbito territorial (Mallorca), prohibición de subarriendo, política de combustible (lleno-lleno) y estado de limpieza.
6. **Seguro y Franquicia**: Cobertura a todo riesgo con franquicia y condiciones de depósito.
7. **Firma de las Partes**: Arrendador y Arrendatario.

---

## 6. Plan de Pruebas y Criterios de Aceptación (TDD)

1. **Test de Detección de Modelo**:
   - Verificar que al pasar una reserva con `camper.slug === 'neo'` se inyectan las especificaciones técnicas de NEO.
   - Verificar que al pasar `camper.slug === 'space'` se inyectan las de SPACE.
2. **Test de Validación de Carnet**:
   - Validar carnet en vigor con > 2 años -> estado válido sin advertencias.
   - Validar carnet con < 2 años -> advertencia `conductor_novel`.
   - Validar carnet con fecha de caducidad pasada -> error `carnet_caducado`.
3. **Test de Transición de Estados**:
   - Reserva pasa de `pending_approval` a `confirmed` al ejecutar la acción de confirmación por el admin.
   - Contrato se marca como disponible únicamente tras confirmación.
4. **Test de Integridad de Datos del Contrato**:
   - Verificar que el contrato contiene todos los campos obligatorios del arrendatario sin campos nulos o vacíos.
