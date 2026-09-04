# Contrato de Alquiler Automático, Firma Digital y Generación de PDF: Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el rellenado automático del contrato oficial de alquiler de campers de Utopia Van Life, la validación estricta de datos del cliente con redirección inteligente, el modal de firma digital táctil/ratón en `/dashboard/documentos`, y la generación/custodia de un PDF oficial multipágina sellado.

**Architecture:** Arquitectura modular basada en Next.js App Router, Supabase Auth/Postgres/Storage y `jspdf`. La validación de integridad ocurre tanto en servidor (`page.tsx`) como en API (`/api/contracts/sign`). El motor de contratos (`contractEngine.ts`) suministra los textos íntegros del documento `docs/Contract/CONTRATO ALQUILER.md` y `pdfGenerator.ts` se encarga de maquetar el PDF multipágina con encabezados, paginación dinámica y el bloque formal de doble firma.

**Tech Stack:** Next.js 15 (React 19), TypeScript, Supabase (Database, Auth, Storage), jsPDF, Lucide React, Tailwind / CSS Modules.

---

### Task 1: Motor del Contrato & Validación Legal Estricta

**Files:**
- Modify: `lib/contracts/contractEngine.ts`
- Test: `tests/contracts/contractEngine.test.ts`

- [ ] **Step 1: Escribir los tests unitarios de validación y generación de datos**

```typescript
// tests/contracts/contractEngine.test.ts
import { describe, it, expect } from 'vitest'
import { validateContractRequirements, generateContractData } from '@/lib/contracts/contractEngine'

describe('contractEngine', () => {
  it('detects incomplete profile data', () => {
    const invalidProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '', // Missing
      phone: '+34600112233'
    }
    const result = validateContractRequirements(invalidProfile)
    expect(result.isValid).toBe(false)
    expect(result.missingFields).toContain('dni_nie')
  })

  it('detects expired or novel license (< 2 years)', () => {
    const novelProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: new Date().toISOString(), // 0 years
      driver_license_expiry_date: '2030-01-01'
    }
    const result = validateContractRequirements(novelProfile)
    expect(result.isValid).toBe(false)
    expect(result.issues).toContain('license_too_novel')
  })

  it('validates complete and correct profile', () => {
    const validProfile = {
      full_name: 'Juan Pérez',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: '2015-01-01',
      driver_license_expiry_date: '2030-01-01'
    }
    const result = validateContractRequirements(validProfile)
    expect(result.isValid).toBe(true)
    expect(result.missingFields).toHaveLength(0)
  })

  it('generates official Utopia Van Life legal data and full 17 articles', () => {
    const dummyBooking = {
      id: 'book-abc-123',
      start_date: '2026-10-03',
      end_date: '2026-10-05',
      total_price: 450,
      camper: { slug: 'neo', name: 'Nomade NEO' }
    }
    const dummyProfile = {
      full_name: 'Laura Gómez',
      dni_nie: '87654321X',
      phone: '+34611223344',
      address: 'Av. Diagonal 100, Barcelona',
      driver_license_id: 'B-87654321',
      driver_license_issue_date: '2018-05-10',
      driver_license_expiry_date: '2028-05-10'
    }
    const data = generateContractData(dummyBooking, dummyProfile)
    expect(data.lessor.companyName).toBe('UTOPIA VAN LIFE SL')
    expect(data.lessor.cif).toBe('B24902637')
    expect(data.lessor.representative).toBe('ROBERTO ESTEBANEZ BLANCO')
    expect(data.pricing.depositAmount).toBe(1000)
    expect(data.articles.length).toBeGreaterThanOrEqual(17)
  })
})
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `npx vitest run tests/contracts/contractEngine.test.ts`  
Expected: FAIL con `validateContractRequirements is not defined`.

- [ ] **Step 3: Implementar la validación y los 17 artículos completos de `CONTRATO ALQUILER.md` en `contractEngine.ts`**

Actualizar `lib/contracts/contractEngine.ts` con:
- `validateContractRequirements(profile)` comprobando `full_name`, `dni_nie`, `phone`, `address`, `driver_license_id`, `driver_license_issue_date` y `driver_license_expiry_date`.
- Los datos oficiales del Arrendador: CIF `B24902637`, domicilio social en San Sebastián de los Reyes, representante `ROBERTO ESTEBANEZ BLANCO`.
- La lista completa y estructurada de los 17 artículos de `docs/Contract/CONTRATO ALQUILER.md`:
  - Objeto y duración
  - Precio y Fianza (1.000 €)
  - Cancelaciones (30 días 100%, 29-15 días 50%, <14 días 0%)
  - Conductores autorizados (25 años, carnet B con 2 años)
  - Usos prohibidos (playas, dunas, pistas forestales, fiestas)
  - Entrega con video/checklist
  - Devolución y limpieza
  - Coberturas y franquicia
  - Infracciones de tráfico
  - RGPD completo

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run tests/contracts/contractEngine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/contracts/contractEngine.ts tests/contracts/contractEngine.test.ts
git commit -m "feat(contracts): add strict profile validation and official Utopia contract articles"
```

---

### Task 2: Redirección Inteligente y Banner de Perfil Incompleto

**Files:**
- Modify: `app/[locale]/dashboard/documentos/page.tsx`
- Modify: `app/[locale]/dashboard/profile/ProfileClient.tsx`

- [ ] **Step 1: Actualizar `app/[locale]/dashboard/documentos/page.tsx` con verificación previa**

En `DocumentsPage`:
```typescript
import { validateContractRequirements } from '@/lib/contracts/contractEngine'
// ...
const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'active') || []
if (activeBookings.length > 0) {
  const validation = validateContractRequirements(profile)
  if (!validation.isValid) {
    redirect({ href: '/dashboard/profile?redirect=documentos&reason=missing_contract_data', locale })
    return null
  }
}
```

- [ ] **Step 2: Añadir el banner explicativo en `ProfileClient.tsx`**

En `app/[locale]/dashboard/profile/ProfileClient.tsx`:
- Detectar `useSearchParams` (`reason === 'missing_contract_data'`).
- Renderizar un banner visible de aviso en la parte superior con icono de alerta:
  *«Para formalizar y firmar el contrato de tu reserva, es necesario completar tus datos de conductor (DNI/NIE, teléfono, dirección y fechas de expedición/caducidad de carnet en vigor).»*

- [ ] **Step 3: Verificar manualmente en navegador**
- Entrar con un perfil incompleto en `/es/dashboard/documentos` y comprobar la redirección hacia `/es/dashboard/profile` con el banner.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/dashboard/documentos/page.tsx app/[locale]/dashboard/profile/ProfileClient.tsx
git commit -m "feat(dashboard): add automatic redirect to profile when contract data is missing"
```

---

### Task 3: Motor de Generación de PDF Multipágina Oficial (`pdfGenerator.ts`)

**Files:**
- Create: `lib/contracts/pdfGenerator.ts`
- Test: `tests/contracts/pdfGenerator.test.ts`

- [ ] **Step 1: Escribir el test para el generador de PDF multipágina**

```typescript
// tests/contracts/pdfGenerator.test.ts
import { describe, it, expect } from 'vitest'
import { generateOfficialContractPdfBlob } from '@/lib/contracts/pdfGenerator'
import { generateContractData } from '@/lib/contracts/contractEngine'

describe('pdfGenerator', () => {
  it('generates a multipage PDF blob containing contract clauses and signatures', async () => {
    const dummyBooking = {
      id: 'book-test-123',
      start_date: '2026-10-03',
      end_date: '2026-10-05',
      total_price: 450,
      camper: { slug: 'neo', name: 'Nomade NEO' }
    }
    const dummyProfile = {
      full_name: 'Carlos Ruiz',
      dni_nie: '12345678Z',
      phone: '+34600112233',
      address: 'Calle Mayor 1, Madrid',
      driver_license_id: 'B-12345678',
      driver_license_issue_date: '2015-01-01',
      driver_license_expiry_date: '2030-01-01'
    }
    const contractData = generateContractData(dummyBooking, dummyProfile)
    const signatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const { doc, blob } = await generateOfficialContractPdfBlob(contractData, signatureDataUrl)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(4)
    expect(blob.size).toBeGreaterThan(10000)
  })
})
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Run: `npx vitest run tests/contracts/pdfGenerator.test.ts`  
Expected: FAIL con `generateOfficialContractPdfBlob is not defined`.

- [ ] **Step 3: Implementar `generateOfficialContractPdfBlob` en `lib/contracts/pdfGenerator.ts`**

Maquetar el PDF con `jspdf`:
- Cabecera en todas las páginas: Banda verde bosque `#1A2B21`, logo/texto «UTOPIA VAN LIFE», referencia y fecha.
- Paginación automática en el pie: `Página X de Y` y `Utopia Van Life S.L. · CIF B24902637`.
- **Página 1:** Carátula formal con tablas estilizadas de datos del Arrendador, Arrendatario, Segundo Conductor, Camper, Matrícula, Fechas y Horas, Importe Total y Fianza de 1.000 €.
- **Páginas siguientes:** Flujo continuo de los 17 artículos con cálculo de altura de texto (`splitTextToSize`) y saltos de página inteligentes (`addPage()`) sin cortar párrafos a la mitad.
- **Página de Cierre:** Cláusula RGPD completa y Bloque de Firmas:
  - Izquierda: Arrendador (`UTOPIA VAN LIFE S.L.`, Roberto Estébanez Blanco, sello oficial y fecha).
  - Derecha: Arrendatario (Nombre del cliente, DNI, fecha de firma e incrustación de la firma en `addImage` del canvas).

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run tests/contracts/pdfGenerator.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/contracts/pdfGenerator.ts tests/contracts/pdfGenerator.test.ts
git commit -m "feat(contracts): implement multipage official contract PDF generator with double signature"
```

---

### Task 4: Endpoint API de Firma y Custodia en Supabase (`/api/contracts/sign`)

**Files:**
- Create: `app/api/contracts/sign/route.ts`

- [ ] **Step 1: Crear el endpoint de firma en `app/api/contracts/sign/route.ts`**

El endpoint debe:
1. Autenticar al usuario (`createServerClient().auth.getUser()`).
2. Obtener `bookingId` y `signatureDataUrl` del cuerpo JSON.
3. Verificar que la reserva exista, pertenezca al usuario y no esté cancelada.
4. Obtener el perfil del usuario y validar los datos obligatorios con `validateContractRequirements(profile)`.
5. Llamar a `generateOfficialContractPdfBlob(contractData, signatureDataUrl)` para producir el PDF firmado.
6. Subir el PDF resultante a Supabase Storage: bucket `documents`, ruta `contracts/${bookingId}_contrato_firmado.pdf`.
7. Actualizar la tabla `bookings`:
   - `contract_signed_at`: `new Date().toISOString()`.
   - `contract_signature`: `signatureDataUrl`.
   - `contract_pdf_url`: URL pública o ruta del archivo en Storage.
8. Retornar `{ success: true, pdfUrl, signedAt }`.

- [ ] **Step 2: Commit**

```bash
git add app/api/contracts/sign/route.ts
git commit -m "feat(api): create contract signature and storage endpoint"
```

---

### Task 5: Modal de Lectura y Firma Digital (`ContractSignModal.tsx`)

**Files:**
- Create: `app/[locale]/dashboard/documentos/ContractSignModal.tsx`

- [ ] **Step 1: Crear `ContractSignModal.tsx` con canvas interactivo**

Funcionalidades del componente:
- **Pestaña 1:** Lectura completa del contrato con diseño estilizado y datos autocompletados resaltados.
- **Pestaña 2:** Firma digital.
  - Canvas HTML5 responsive (con escalado de densidad de píxeles `window.devicePixelRatio` para trazo nítido en pantallas retina/móviles).
  - Escucha de eventos `pointerdown`, `pointermove`, `pointerup` para soporte simultáneo de ratón, puntero táctil de smartphone y tablet / stylus.
  - Botón *"Borrar trazo"*.
  - Validación de canvas no vacío (`hasDrawn`).
  - Checkbox legal obligatorio: *«He leído y acepto expresamente todas las cláusulas del contrato de alquiler y las condiciones generales de Utopia Van Life S.L.»*.
  - Botón de envío *"Confirmar y Firmar Contrato"* con spinner de carga.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/dashboard/documentos/ContractSignModal.tsx
git commit -m "feat(documentos): add interactive digital signature modal and canvas"
```

---

### Task 6: Integración en la Interfaz de Cliente (`DocumentsClient.tsx`)

**Files:**
- Modify: `app/[locale]/dashboard/documentos/DocumentsClient.tsx`

- [ ] **Step 1: Integrar el estado del contrato en `DocumentsClient.tsx`**
- Comprobar si `nextBooking.contract_signed_at` existe.
- Si está firmado:
  - Mostrar badge verde *"✓ Contrato Oficial Firmado"*.
  - Mostrar fecha y hora exacta de la firma.
  - Botón *"Descargar PDF Oficial Firmado"* que descarga directamente el PDF de alta fidelidad.
- Si está pendiente de firma:
  - Mostrar badge amarillo/naranja *"Pendiente de firma"*.
  - Botón principal *"Leer y Firmar Contrato"* que abre `ContractSignModal`.
  - Botón secundario *"Ver Borrador"*.
- Al completarse la firma desde el modal, actualizar el estado local sin recargar la página.

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/dashboard/documentos/DocumentsClient.tsx
git commit -m "feat(documentos): integrate contract signing and live status updates in DocumentsClient"
```

---

### Task 7: Verificación Integral End-to-End

**Files:**
- Test y comprobación en navegador

- [ ] **Step 1: Probar el flujo completo con perfil incompleto**
  - Entrar a `/dashboard/documentos` $\rightarrow$ Verificar redirección a `/dashboard/profile` con banner.
- [ ] **Step 2: Completar perfil y volver a documentos**
  - Introducir DNI, dirección, teléfono y carnet vigente $\rightarrow$ Entrar a `/dashboard/documentos` sin redirección.
- [ ] **Step 3: Abrir modal y probar firma interactiva**
  - Probar lectura del contrato y autocompletado de datos.
  - Probar dibujo en canvas táctil/ratón, botón de borrar y checkbox legal.
  - Pulsar *"Confirmar y Firmar"* $\rightarrow$ Verificar respuesta satisfactoria de la API.
- [ ] **Step 4: Descargar y verificar el PDF oficial**
  - Descargar el PDF y verificar que contiene todas las páginas con los 17 artículos, paginación, sello oficial de Utopia Van Life y la firma trazada del cliente.
- [ ] **Step 5: Ejecutar suite de pruebas unitarias y linters**

Run: `npm run build` o `npx vitest run`  
Expected: 0 errores.
