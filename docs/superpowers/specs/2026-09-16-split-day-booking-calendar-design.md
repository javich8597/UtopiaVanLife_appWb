# Especificación de Diseño: Calendario de Reservas por Medios Días (Estilo Holo-Van) & Estancias Mínimas Dinámicas

**Fecha:** 2026-09-16  
**Estado:** Aprobado por el usuario  
**Referencia de Diseño:** Sistema Split-Day de [Holo-Van](https://www.holo-van.it/en/prenota)  

---

## 1. Resumen Ejecutivo y Objetivos

El objetivo de este desarrollo es transformar el calendario de reservas de UtopiaVanLife (`BookingCalendar.tsx` y `PriceCalculator.tsx`) para adoptar el modelo de **reservas por medios días (turnos de Mañana y Tarde)**, estándar de la industria de alquiler de campers de alta rotación (referencia Holo-Van).

### Beneficios clave:
1. **Rotación en el mismo día:** Permite que un cliente devuelva la furgoneta por la mañana (12:00h) y otro cliente la recoja esa misma tarde (15:00h), maximizando la ocupación de la flota sin perder días enteros por limpieza o preparación.
2. **Visualización editorial con corte diagonal:** Días parcialmente ocupados se visualizan con un corte diagonal limpio en tonos de la paleta Utopia (`--forest-green`, `--sand-dark`, `--cream`).
3. **Selectores de hora reactivos:** Controles inferiores de `Hora de Recogida` (09:00–12:00h / 15:00–19:00h) y `Hora de Devolución` (09:00–12:00h / 15:00–19:00h) que se adaptan y deshabilitan automáticamente según la disponibilidad del día.
4. **Cálculo proporcional de medios días:** Cada medio día matinal de entrada o vespertino de salida suma exactamente `+0.5` día (50% de la tarifa por noche de la temporada).
5. **Estancia mínima por temporada configurable:** Mínimo 3 días por defecto y 5 días en temporada alta, editable desde el panel de administración (`/admin/settings`).
6. **Trazabilidad total:** Las horas seleccionadas se transfieren al checkout, se almacenan en Supabase y se plasman en el contrato oficial de alquiler en PDF.

---

## 2. Horarios Operativos y Reglas de Negocio

### 2.1. Franjas Horarias
* **Turno Mañana:** 
  * Recogida matinal: **09:00h a 12:00h** (hora estándar 09:00h)
  * Devolución matinal: **09:00h a 12:00h** (hora estándar 12:00h)
* **Ventana de Mantenimiento & Limpieza:**
  * **12:00h a 15:00h** (3 horas para desinfección, revisión mecánica y puesta a punto).
* **Turno Tarde:**
  * Recogida vespertina: **15:00h a 19:00h** (hora estándar 15:00h)
  * Devolución vespertina: **15:00h a 19:00h** (hora estándar 19:00h)

### 2.2. Cálculo Matemático de Tarifas
Dada una reserva con `startDate` y `endDate`, con $N = \text{días naturales entre ambas fechas}$:

| Caso | Recogida | Devolución | Noches Base | Días Facturados | Fórmula |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A (Estándar)** | Tarde (15:00h) | Mañana (12:00h) | $N$ | **$N$ días** | Suma de tarifas de las $N$ noches intermedias |
| **B (Salida tarde)** | Tarde (15:00h) | Tarde (19:00h) | $N$ | **$N + 0.5$ días** | Tarifa de las $N$ noches $+ 0.5 \times \text{tarifa día fin}$ |
| **C (Entrada temprana)**| Mañana (09:00h) | Mañana (12:00h) | $N$ | **$N + 0.5$ días** | Tarifa de las $N$ noches $+ 0.5 \times \text{tarifa día inicio}$ |
| **D (Días completos)** | Mañana (09:00h) | Tarde (19:00h) | $N$ | **$N + 1.0$ días** | Tarifa $N$ noches $+ 0.5 \times \text{tarifa inicio} + 0.5 \times \text{tarifa fin}$ |

*Descuento por estancia larga:* Si `días_facturados >= 7`, se aplica el descuento porcentual configurado en la temporada correspondiente.

### 2.3. Estancias Mínimas Dinámicas
* Configuración en tabla `seasons`: campo `min_nights INTEGER DEFAULT 3`.
* Temporada estándar: 3 días/noches mínimo.
* Temporada alta (Julio/Agosto): 5 días/noches mínimo.
* Validación: Al seleccionar la fecha de inicio, se evalúa la temporada activa. El calendario no permite confirmar una fecha de fin que no cubra la estancia mínima, informando visualmente al usuario.

---

## 3. Arquitectura y Cambios por Capa

### 3.1. Base de Datos (Supabase)
1. **Tabla `seasons`**:
   * Añadir columna `min_nights` (`INTEGER NOT NULL DEFAULT 3`).
   * Actualizar temporadas existentes: asignar 5 a Temporada Alta y 3 a Baja/Media.
2. **Tabla `bookings`**:
   * Utilizar las columnas existentes `pickup_time` y `dropoff_time`, normalizando valores a `'09:00'`, `'12:00'`, `'15:00'`, `'19:00'`.

### 3.2. Endpoint de Disponibilidad (`/api/campers/[slug]/availability`)
Actualización para devolver los slots ocupados de cada día:
```typescript
export interface BlockedSlot {
    date: string // "YYYY-MM-DD"
    slot: 'morning' | 'afternoon' | 'full'
    reason?: 'booking' | 'blocked'
}
```
* **Lógica:**
  * Si una reserva termina a las 12:00h (mañana): la fecha de fin añade `{ date, slot: 'morning' }`.
  * Si una reserva empieza a las 15:00h (tarde): la fecha de inicio añade `{ date, slot: 'afternoon' }`.
  * Días intermedios entre inicio y fin: añaden `{ date, slot: 'full' }`.
  * Si coinciden una devolución y una salida en el mismo día, se consolida a `full`.

### 3.3. Motor de Precios (`lib/pricing/engine.ts`)
Ampliación de `calculatePrice`:
```typescript
export type DaySlot = 'morning' | 'afternoon'

export function calculatePrice(
    startDate: Date,
    startSlot: DaySlot,
    endDate: Date,
    endSlot: DaySlot,
    seasons: Season[],
    selectedExtras: Extra[],
    depositAmount: number
): PriceBreakdown
```
* Retorna `totalDays` (ej. `3.5`), desglose de noches base y los suplementos de medios días calculados de forma transparente.

### 3.4. Componente de Calendario (`components/booking/BookingCalendar.tsx`)
1. **Renderizado de celdas con gradiente diagonal CSS:**
   * Mañana ocupada:
     ```css
     background: linear-gradient(135deg, rgba(194, 168, 120, 0.45) 50%, transparent 50%);
     ```
     Triángulo superior izquierdo tintado en `--sand-dark`.
   * Tarde ocupada:
     ```css
     background: linear-gradient(135deg, transparent 50%, rgba(194, 168, 120, 0.45) 50%);
     ```
     Triángulo inferior derecho tintado en `--sand-dark`.
   * Día completo bloqueado: botón deshabilitado y número con tachado diagonal.
2. **Selectores inferiores de franja horaria:**
   * `HORA DE RECOGIDA`: Píldoras `Mañana (09–12h)` y `Tarde (15–19h)`. Si la mañana está ocupada, se bloquea `Mañana` y se fuerza `Tarde`.
   * `HORA DE DEVOLUCIÓN`: Píldoras `Mañana (09–12h)` y `Tarde (15–19h)`. Si la tarde está ocupada, se bloquea `Tarde` y se fuerza `Mañana`.
3. **Leyenda visual y aviso de estancia mínima:**
   * Iconos explicativos de mañana y tarde ocupada.
   * Mensaje claro: *"Estancia mínima para estas fechas: X noches"*.

### 3.5. Calculador de Precios y Reserva (`components/booking/PriceCalculator.tsx`)
* Muestra el resumen dinámico de días y horas (ej. `3.5 días · 17 Sep 15:00h → 20 Sep 19:00h`).
* Traspaso hacia `/checkout` con los parámetros `pickup_time` y `dropoff_time`.

### 3.6. Panel de Administración (`app/[locale]/admin/settings/page.tsx`)
* Nueva columna en la tabla de temporadas con input/selector para editar `Mínimo de noches` (`min_nights`).
* Guardado inmediato en la base de datos vía server action o API route.

---

## 4. Plan de Verificación

1. **Pruebas de visualización CSS:**
   * Comprobar que los días con mañana ocupada muestran el triángulo superior izquierdo tintado.
   * Comprobar que los días con tarde ocupada muestran el triángulo inferior derecho tintado.
   * Comprobar que los días completamente ocupados se muestran deshabilitados y tachados.
2. **Pruebas de interacción reactiva:**
   * Clic en día con mañana ocupada $\to$ `HORA DE RECOGIDA` desactiva opción Mañana y selecciona Tarde automáticamente.
   * Clic en día con tarde ocupada como fin $\to$ `HORA DE DEVOLUCIÓN` desactiva opción Tarde y selecciona Mañana automáticamente.
3. **Pruebas de cálculo de tarifas:**
   * Tarde $\to$ Mañana ($N$ noches): verifica $N$ días exactos facturados.
   * Tarde $\to$ Tarde: verifica $N + 0.5$ días facturados.
   * Mañana $\to$ Mañana: verifica $N + 0.5$ días facturados.
   * Mañana $\to$ Tarde: verifica $N + 1.0$ días facturados.
4. **Pruebas de estancia mínima:**
   * En temporada estándar: verificar bloqueo si selección $< 3$ noches.
   * En temporada alta: verificar bloqueo si selección $< 5$ noches.
   * Modificar el valor en `/admin/settings` y verificar que el frontend adopta el nuevo mínimo.
5. **Pruebas de checkout y contrato:**
   * Realizar una reserva de prueba y comprobar que en el panel de administración y en el contrato PDF generado aparecen exactamente las horas seleccionadas (`09:00`, `12:00`, `15:00` o `19:00`).
