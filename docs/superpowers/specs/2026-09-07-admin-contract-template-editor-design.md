# Especificación de Diseño: Editor de Plantilla de Contrato PDF en el Panel Admin

**Fecha:** 7 de septiembre de 2026  
**Módulo:** Backoffice Admin (`/admin/contrato`)  
**Proyecto:** Utopia Van Life Web App  

---

## 1. Resumen Ejecutivo
El sistema de gestión de alquileres de Utopia Van Life genera automáticamente contratos oficiales de arrendamiento sin conductor en formato PDF multipágina con sellado eIDAS y firma digital. 

Este diseño define la creación de un nuevo módulo en el panel de administración (`/admin/contrato`) que permite al administrador visualizar, revisar y editar el contenido de la plantilla maestra del contrato (los 31 artículos, parámetros económicos, penalizaciones y datos corporativos) con una vista previa interactiva en tiempo real del PDF resultante.

---

## 2. Objetivos y Alcance
1. **Edición Completa por Secciones:** El administrador podrá modificar directamente:
   - Tarifas y penalizaciones operativas (fianza, kilometraje diario, coste por km extra, tabaco, pérdida de llaves, limpieza, etc.).
   - Datos corporativos y de representación legal (representante legal, email de contacto, teléfono).
   - Títulos y redacción de cualquiera de los 31 artículos distribuidos en los 10 capítulos.
2. **Previsualización en Tiempo Real (Split-Screen):** Pantalla dividida al 50% donde la columna derecha muestra en vivo el PDF generado con datos de demostración a medida que se introducen cambios.
3. **Persistencia Centralizada y Sobrescritura Segura:** Almacenamiento en base de datos Supabase en la tabla `contract_template_settings` con carga inmediata en el flujo de reserva de los clientes.
4. **Respaldo de Fábrica (1-Click Factory Reset):** Opción permanente de restaurar los textos oficiales íntegros basados en `docs/Contract/CONTRATO ALQUILER.md`.

---

## 3. Arquitectura de Datos y Modelo de Base de Datos

### 3.1 Tabla en Supabase: `contract_template_settings`
```sql
CREATE TABLE IF NOT EXISTS public.contract_template_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_contract',
  lessor_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  rgpd_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by TEXT
);
```

### 3.2 Esquema de los campos JSONB
* **`lessor_override`**:
  ```json
  {
    "companyName": "UTOPIA VAN LIFE S.L.",
    "cif": "B24902637",
    "address": "C\\ Cristo de los remedios, nº2, Planta 0, Puerta 2",
    "city": "28703 San Sebastián de los Reyes, Madrid, España",
    "phone": "611 560 916",
    "email": "info@utopiavanlife.com",
    "representative": "ROBERTO ESTEBANEZ BLANCO"
  }
  ```
* **`terms_override`**:
  ```json
  {
    "depositAmount": 1000,
    "includedKmPerDay": 150,
    "extraKmPrice": 0.25,
    "unlimitedKmDayPrice": 20,
    "smokePenalty": 300,
    "keyPenalty": 400,
    "documentPenalty": 200,
    "fuelServiceCharge": 40,
    "cleaningBasic": 50,
    "cleaningIntensive": 150,
    "cleaningWc": 200,
    "delayBaseCharge": 50,
    "delayPerHour": 25,
    "waterFuelContaminationPenalty": 2000,
    "heightLimitMeters": 2.80
  }
  ```
* **`articles`**: Array de 31 objetos con la interfaz `ContractArticle`:
  `{ number: number, title: string, chapter: string, content: string[] }`

---

## 4. Endpoints de la API (`/api/admin/contract-template`)

1. **`GET /api/admin/contract-template`**
   - **Autenticación:** Requiere sesión de administrador activa (`isAdminUser`).
   - **Comportamiento:** Consulta la tabla `contract_template_settings`. Si no existe registro, devuelve la plantilla base oficial de fábrica generada por `contractEngine.ts`.
   - **Respuesta:** `{ success: true, data: ContractTemplateData, isDefault: boolean }`

2. **`POST /api/admin/contract-template`**
   - **Autenticación:** Requiere sesión de administrador activa.
   - **Cuerpo:** `{ lessor: ..., terms: ..., articles: ..., rgpd: ... }`
   - **Validaciones:**
     - Comprobación de tipos numéricos positivos en tarifas.
     - Comprobación de que existan los artículos y no estén vacíos.
   - **Comportamiento:** Upsert en la tabla `contract_template_settings` con `updated_by = user.email` y `updated_at = NOW()`.
   - **Respuesta:** `{ success: true, message: 'Plantilla guardada con éxito' }`

3. **`POST /api/admin/contract-template/reset`**
   - **Autenticación:** Requiere sesión de administrador activa.
   - **Comportamiento:** Elimina el registro personalizado en la base de datos o lo reemplaza por los 31 artículos de fábrica.
   - **Respuesta:** `{ success: true, data: DefaultContractTemplateData }`

4. **`POST /api/admin/contract-template/preview`**
   - **Autenticación:** Requiere sesión de administrador activa.
   - **Cuerpo:** Datos del formulario en edición.
   - **Comportamiento:** Genera un PDF binario al vuelo utilizando `generateOfficialContractPdfBlob` con datos de muestra mock y devuelve el buffer con cabeceras `Content-Type: application/pdf`.

---

## 5. Diseño de Interfaz de Usuario (`app/[locale]/admin/contrato/page.tsx`)

### 5.1 Navegación en el Menú Lateral
Se actualiza `AdminNavClient.tsx` agregando:
```tsx
{ label: 'Plantilla Contrato', href: '/admin/contrato', icon: FileText, exact: false }
```

### 5.2 Estructura Split-Screen
* **Contenedor Principal:**
  - `display: flex`, altura completa adaptable.
* **Panel Izquierdo: Editor (50% de ancho):**
  - **Barra de Acciones Superior:**
    - Indicador de estado: *"Borrador con cambios sin guardar"* o *"Plantilla activa en vigor"*.
    - Botón **"Guardar Plantilla"** (verde primario `#059669`).
    - Botón **"Restaurar de Fábrica"** (secundario con diálogo de confirmación).
    - Botón **"Refrescar Vista Previa"** (con auto-actualización debounced).
  - **Selector de Pestañas del Editor:**
    1. **Tarifas y Penalizaciones:** Inputs numéricos directos para fianza (1.000 €), km/día (150), coste km extra (0,25 €), tabaco (300 €), llaves (400 €), combustible (40 €), limpieza (50/150/200 €).
    2. **Empresa y Contacto:** Inputs para representante legal, CIF, dirección, teléfono y correo electrónico.
    3. **Articulado Legal (31 Artículos):** Acordeones agrupados por los 10 Capítulos. Cada artículo permite editar su título y párrafos de contenido.
* **Panel Derecho: Visor de PDF (50% de ancho):**
  - `<iframe src="blob:..." width="100%" height="100%" />` que renderiza el PDF real de 7 páginas.
  - Botón flotante para descargar el PDF de muestra.
  - Indicador de carga cuando se está regenerando el PDF tras una modificación.

---

## 6. Integración con el Flujo de Clientes y Reservas

* En `app/[locale]/dashboard/documentos/page.tsx` y `app/api/contracts/sign/route.ts`:
  - Se llamará a una función servidora `getActiveContractTemplate()`.
  - Esta función lee la plantilla guardada de la base de datos (con caché en memoria / revalidación en Next.js) o devuelve la de fábrica.
  - La función `generateContractData(booking, profile, camperOverride, templateOverride)` utilizará las cláusulas y tarifas de la plantilla activa para que el cliente firme el contrato con las modificaciones vigentes fijadas por el administrador.

---

## 7. Plan de Pruebas y Verificación

1. **Pruebas Unitarias (`tests/contracts/templateEngine.test.ts`):**
   - Validación de carga de plantilla de fábrica vs plantilla personalizada.
   - Prueba de inyección de tarifas personalizadas en el PDF.
   - Prueba de persistencia y restauración a valores por defecto.
2. **Pruebas en el Navegador (`chrome-devtools-mcp`):**
   - Acceder como admin a `http://localhost:3000/es/admin/contrato`.
   - Modificar una tarifa (ej. km extra de 0,25 a 0,35 €) o añadir una coletilla a un artículo.
   - Verificar que el visor de PDF de la derecha se actualiza al vuelo reflejando el cambio exacto.
   - Pulsar *"Guardar Plantilla"* y verificar persistencia tras recargar.
   - Comprobar que en el panel del cliente (`/es/dashboard/documentos`) el contrato muestra la plantilla actualizada.
   - Probar el botón de *"Restaurar de Fábrica"* y certificar que devuelve exactamente los 31 artículos originales de `docs/Contract/CONTRATO ALQUILER.md`.
