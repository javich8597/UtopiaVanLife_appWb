# Especificación de Diseño: Calendario de Reserva Interactivo & Límite de Viajeros

**Fecha:** 2026-09-12  
**Estado:** Aprobado  
**Objetivo:** Sustituir los selectores de fecha nativos del panel de reserva (`PriceCalculator`) por un calendario interactivo con diseño editorial, elegante y responsive (estilo boutique/Airbnb), integrado de forma colapsable con animaciones suaves, detección de fechas bloqueadas y limitación estricta de viajeros a 3 pasajeros.

---

## 1. Contexto y Requisitos

1. **Estética y Branding Utopia Van Life**:
   - Paleta cromática: Verde bosque (`--forest-green`), tonos arena (`--sand`, `--sand-dark`), blanco roto (`--white-broken`) y crema (`--cream`).
   - Tipografía: Titulares sutiles, números y fechas claros con tipografía sans (`Inter`).
   - Look & feel: Limpio, minimalista, redondeado suave (`--radius-md`, `--radius-lg`) y sombras controladas.
2. **Capacidad Máxima de Viajeros**:
   - Máximo número de viajeros permitido: **3 personas** (la camper más grande de la flota permite hasta 3 plazas).
   - El control de pasajeros en `PriceCalculator` tendrá rango `[1, 3]`.
3. **Comportamiento del Calendario**:
   - Selector tipo cápsula con dos campos: "Llegada" y "Salida".
   - Al pulsar cualquiera de los dos, se despliega suavemente (modo acordeón/desplegable con `framer-motion`) el calendario dentro del mismo panel.
   - Selección intuitiva de rango:
     - 1er clic: Selección de fecha de inicio (Llegada).
     - Hover dinámico: Resalta las noches intermedias entre inicio y el cursor.
     - 2º clic: Selección de fecha de fin (Salida).
     - Si la fecha seleccionada es anterior a la llegada, se reinicia como nueva fecha de llegada.
     - Botón "Limpiar" para reiniciar selección y botón "Cerrar / Listo" para contraer el acordeón.
4. **Gestión de Disponibilidad**:
   - Las fechas pasadas (anteriores a hoy) quedan deshabilitadas.
   - Las fechas reservadas (`confirmed`, `active`) o bloqueadas administrativamente para esa furgoneta se marcan como no disponibles (tachadas/gris suave con cursor bloqueado).
   - No se permite que un rango seleccionado atraviese días intermedios que estén bloqueados.

---

## 2. Arquitectura de Componentes

### 2.1. `components/booking/BookingCalendar.tsx`
Componente cliente reutilizable que renderiza el calendario interactivo:
- **Props**:
  - `startDate`: string en formato `YYYY-MM-DD` | null
  - `endDate`: string en formato `YYYY-MM-DD` | null
  - `onChange`: `(start: string, end: string) => void`
  - `blockedDates`: array de fechas o rangos `{ start: string, end: string }`
  - `minDate`?: fecha mínima seleccionable (por defecto hoy)
- **Lógica interna**:
  - Navegación mensual mes a mes (`<` y `>`).
  - Cálculo de días usando utilidades ligeras con `date-fns` (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `isSameDay`, `isWithinInterval`, `isBefore`, `addMonths`, `subMonths`).
  - Soporte de teclado y accesibilidad aria en botones de días.

### 2.2. `components/booking/PriceCalculator.tsx`
- Reemplazo de los inputs nativos `<input type="date">` por la nueva interfaz interactiva.
- Estados de apertura/cierre para el calendario acordeón con animación suave mediante `framer-motion`.
- Ajuste del selector de viajeros: `Math.min(3, p + 1)`.
- Carga de disponibilidad del camper (vía prop o fetch a API de disponibilidad de la camper).

### 2.3. Endpoint de Disponibilidad (`/api/campers/[slug]/availability` o enriquecimiento en `/api/availability`)
- Endpoint ligero que retorna los intervalos ocupados de una furgoneta específica (`bookings` activos + `blocked_dates`).

---

## 3. Estados de la UI & Microinteracciones

1. **Estado Vacío / Inicial**:
   - Campos de llegada y salida muestran: *"Añadir fecha"*.
2. **Estado Abierto**:
   - Borde de la cápsula de fechas con borde activo `--forest-green`.
   - Despliegue animado hacia abajo con `framer-motion`.
3. **Selección de Rango**:
   - Día de llegada: Círculo con fondo `--forest-green` y texto blanco.
   - Días intermedios: Fondo continuo `--cream` / `rgba(45, 58, 45, 0.08)` con bordes redondeados en los extremos.
   - Día de salida: Círculo con fondo `--forest-green` y texto blanco.
4. **Fechas Bloqueadas**:
   - Gris claro (`var(--gray-400)`), texto tachado sutil y evento de clic inhabilitado (`pointer-events: none`).
5. **Selector de Pasajeros**:
   - Controles `Minus` y `Plus`.
   - Botón `Plus` deshabilitado si `pax === 3`.

---

## 4. Plan de Verificación

1. **Límite de Viajeros**: Probar que no permite incrementar a más de 3 pasajeros y que no baja de 1.
2. **Selección de Fechas**:
   - Probar selección de llegada y posterior salida.
   - Probar cambio de mes con flechas.
   - Probar reelección de fecha si se hace clic en una fecha anterior.
   - Probar limpieza de fechas.
3. **Cálculo de Precio**:
   - Verificar que el desglose de precios (`calculatePrice`), temporadas y extras se recalcula de inmediato al cerrar o completar el rango.
4. **Checkout**:
   - Comprobar que los parámetros `from`, `to` y `pax` (máx 3) se transfieren correctamente a la pantalla de checkout.
