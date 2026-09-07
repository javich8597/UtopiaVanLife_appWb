# Editor de Plantilla de Contrato PDF en el Panel Admin - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proporcionar al administrador de Utopia Van Life una sección dedicada en el panel de control (`/admin/contrato`) con pantalla dividida (Split-Screen) para editar las tarifas, penalizaciones, datos de contacto y los 31 artículos de la plantilla del contrato oficial con una vista previa en vivo en PDF y persistencia centralizada en Supabase con respaldo de fábrica en 1 clic.

**Architecture:** 
- Almacenamiento en tabla `contract_template_settings` en Supabase con esquema JSONB para máxima flexibilidad y fallback automático a los 31 artículos originales de `lib/contracts/contractEngine.ts`.
- Endpoints REST `/api/admin/contract-template` (GET, POST, reset) y `/api/admin/contract-template/preview` para generación de PDF al vuelo en memoria.
- Interfaz split-screen en `app/[locale]/admin/contrato/` con editor por acordeones (Tarifas, Empresa, Articulado) a la izquierda y visor PDF reactivo debounced a la derecha.
- Integración transparente en el flujo de clientes para que todas las nuevas descargas y firmas usen la plantilla activa fijada por el admin.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL), jsPDF, Lucide React, Node.js test runner (`tsx`).

---

### Task 1: Modelo de Tipos y Migración de Base de Datos para Plantillas
**Files:**
- Create: `lib/contracts/templateTypes.ts`
- Create: `supabase/migrations/20260907_contract_template_settings.sql`
- Test: `tests/contracts/templateTypes.test.ts`

- [ ] **Step 1: Escribir el test para validar tipos y estructura de plantilla**
- [ ] **Step 2: Ejecutar test para verificar que falla antes de crear los tipos**
- [ ] **Step 3: Crear `lib/contracts/templateTypes.ts` y el archivo de migración SQL**
- [ ] **Step 4: Ejecutar test y verificar que pasa**
- [ ] **Step 5: Commit de Task 1**

---

### Task 2: Servicio de Plantilla con Fallback y Restauración de Fábrica
**Files:**
- Create: `lib/contracts/templateService.ts`
- Test: `tests/contracts/templateService.test.ts`
- Modify: `lib/contracts/contractEngine.ts`

- [ ] **Step 1: Escribir tests unitarios para `templateService` (get, save, reset, fallback)**
- [ ] **Step 2: Ejecutar test para verificar que falla**
- [ ] **Step 3: Implementar `templateService.ts` con persistencia en Supabase y fallback a los 31 artículos**
- [ ] **Step 4: Ejecutar test y comprobar que pasa 100%**
- [ ] **Step 5: Commit de Task 2**

---

### Task 3: Endpoints API de Administración para Plantillas
**Files:**
- Create: `app/api/admin/contract-template/route.ts`
- Create: `app/api/admin/contract-template/reset/route.ts`
- Create: `app/api/admin/contract-template/preview/route.ts`
- Test: `tests/contracts/templateApi.test.ts`

- [ ] **Step 1: Escribir tests de integración para los endpoints API**
- [ ] **Step 2: Ejecutar test y verificar fallo inicial**
- [ ] **Step 3: Implementar endpoints GET/POST de plantilla, reset y previsualización PDF al vuelo**
- [ ] **Step 4: Ejecutar test y verificar respuesta HTTP 200 y validación de permisos admin**
- [ ] **Step 5: Commit de Task 3**

---

### Task 4: Inyección de Plantilla Activa en el Flujo de Reserva y Clientes
**Files:**
- Modify: `lib/contracts/contractEngine.ts`
- Modify: `app/[locale]/dashboard/documentos/page.tsx`
- Modify: `app/api/contracts/sign/route.ts`
- Test: `tests/contracts/contractEngine.test.ts`

- [ ] **Step 1: Escribir test comprobando que `generateContractData` acepta override de plantilla activa**
- [ ] **Step 2: Ejecutar test para verificar el fallo**
- [ ] **Step 3: Actualizar `contractEngine.ts`, la API de firma y la página de documentos para inyectar la plantilla activa**
- [ ] **Step 4: Ejecutar tests y confirmar que pasan**
- [ ] **Step 5: Commit de Task 4**

---

### Task 5: Enlace de Navegación en el Menú de Administración
**Files:**
- Modify: `app/[locale]/admin/AdminNavClient.tsx`

- [ ] **Step 1: Añadir la ruta `/admin/contrato` con icono `FileText` en `navItems`**
- [ ] **Step 2: Verificar renderizado del menú lateral**
- [ ] **Step 3: Commit de Task 5**

---

### Task 6: Interfaz Split-Screen de Edición y Visor PDF en Vivo
**Files:**
- Create: `app/[locale]/admin/contrato/page.tsx`
- Create: `app/[locale]/admin/contrato/ContractTemplateClient.tsx`
- Create: `app/[locale]/admin/contrato/contractEditor.css`

- [ ] **Step 1: Crear layout split-screen (50% editor, 50% visor PDF)**
- [ ] **Step 2: Implementar acordeones de edición: Tarifas y Penalizaciones, Datos Corporativos y 31 Artículos**
- [ ] **Step 3: Implementar visor dinámico con refresco reactivo debounced, indicador de cambios y botón de restaurar fábrica**
- [ ] **Step 4: Commit de Task 6**

---

### Task 7: Verificación Integral Automatizada y en Navegador
**Files:**
- Test: `tests/contracts/*.test.ts`
- Manual / Browser: `http://localhost:3000/es/admin/contrato`

- [ ] **Step 1: Ejecutar suite completa de tests de contratos (`npm test`)**
- [ ] **Step 2: Ejecutar `npm run build` para asegurar compilación limpia sin errores de tipo**
- [ ] **Step 3: Probar en navegador la edición de cláusulas, previsualización en vivo, guardado y restauración**
- [ ] **Step 4: Documentar resultados en `walkthrough.md`**
- [ ] **Step 5: Commit final y push a GitHub**
