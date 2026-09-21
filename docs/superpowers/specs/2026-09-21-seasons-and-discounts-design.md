# Especificación de Diseño: Reestructuración de Temporadas, Suplementos & Descuentos por Larga Estancia

**Fecha:** 21 de Septiembre de 2026  
**Estado:** Propuesta de Diseño Validada tras Entrevista Técnica (`/grill-me`)  
**Proyecto:** Utopia Van Life (`UtopiaVanLife_appWb`)

---

## 1. Resumen Ejecutivo y Objetivos

La actual sección de "Temporadas & Tarifas Base" en `/admin/settings` almacena fechas fijas anuales con precios absolutos globales por temporada y un único descuento fijo a 7 días. Esta estructura presenta tres limitaciones:
1. No contempla que cada camper tiene un precio base propio (ej. NEO a 110 €/noche y SPACE a 135 €/noche).
2. Dificulta asignar múltiples periodos de fechas no continuos a una misma temporada (ej. Semana Santa y Verano pertenecientes a Temporada Alta).
3. No permite configurar una escala de descuentos por duración (ej. 7+ días 10%, 14+ días 15%, 21+ días 20%).

### Objetivos Principales:
1. **Separar en 2 tablas/tarjetas independientes en `/admin/settings`**:
   - Tarjeta 1: **Temporadas & Suplementos por Noche** (Alta, Media, Baja) con gestión de múltiples periodos de fechas y simulador en vivo de precios para NEO y SPACE.
   - Tarjeta 2: **Descuentos por Larga Estancia** (Tramos editables de días y porcentajes).
2. **Modelo de Tarifa Base + Suplemento**:
   - El precio base del vehículo se gestiona en la ficha de cada camper (`campers.base_price_per_night`).
   - Cada temporada aplica un suplemento: `Precio Noche = Base Camper + Suplemento Temporada`.
   - Temporada Baja actúa como tarifa base por defecto (+0 € o configurable) para cualquier fecha del año no asignada a Alta o Media.
3. **Validación estricta de solapamiento**: Las fechas añadidas no pueden colisionar entre temporadas.
4. **Motor de precios y reserva (`lib/pricing/engine.ts`)**: Adaptado para calcular noches por temporada con la nueva fórmula y aplicar el tramo de descuento más alto alcanzado sobre la tarifa de alquiler del vehículo.

---

## 2. Arquitectura de Datos (Supabase / PostgreSQL)

### 2.1 Tabla `campers` (Actualización de Schema)
Añadimos la columna `base_price_per_night` si no existe:
```sql
ALTER TABLE public.campers 
ADD COLUMN IF NOT EXISTS base_price_per_night NUMERIC NOT NULL DEFAULT 120.00;

-- Sincronizar valores actuales
UPDATE public.campers SET base_price_per_night = 110.00 WHERE slug = 'neo';
UPDATE public.campers SET base_price_per_night = 135.00 WHERE slug = 'space';
```

### 2.2 Tabla `seasons` (Categorías Canónicas de Temporada)
Reestructuramos `seasons` para representar las 3 temporadas permanentes:
```sql
CREATE TABLE IF NOT EXISTS public.seasons_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'baja', 'media', 'alta'
    name TEXT NOT NULL,         -- 'Temporada Baja', 'Temporada Media', 'Temporada Alta'
    supplement_per_night NUMERIC NOT NULL DEFAULT 0.00,
    min_nights INTEGER NOT NULL DEFAULT 3,
    is_default BOOLEAN NOT NULL DEFAULT false,
    color_badge TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Semilla de temporadas canónicas
INSERT INTO public.seasons_v2 (code, name, supplement_per_night, min_nights, is_default, color_badge)
VALUES
    ('baja', 'Temporada Baja', 0.00, 3, true, '#64748b'),
    ('media', 'Temporada Media', 15.00, 4, false, '#2563eb'),
    ('alta', 'Temporada Alta', 40.00, 5, false, '#dc2626')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    supplement_per_night = EXCLUDED.supplement_per_night,
    min_nights = EXCLUDED.min_nights,
    is_default = EXCLUDED.is_default;
```

### 2.3 Tabla `season_periods` (Rangos de Fechas Flexibles)
Permite asociar múltiples rangos no continuados a cada temporada:
```sql
CREATE TABLE IF NOT EXISTS public.season_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons_v2(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT, -- Ej: 'Semana Santa 2026', 'Verano 2026', 'Puente del Pilar'
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_season_periods_dates ON public.season_periods (start_date, end_date);
```

### 2.4 Tabla `duration_discounts` (Tramos de Descuento por Larga Estancia)
```sql
CREATE TABLE IF NOT EXISTS public.duration_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_days INTEGER NOT NULL CHECK (min_days >= 2),
    discount_pct NUMERIC NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Semilla por defecto
INSERT INTO public.duration_discounts (min_days, discount_pct, is_active)
VALUES 
    (7, 10.00, true),
    (14, 15.00, true),
    (21, 20.00, true)
ON CONFLICT DO NOTHING;
```

### 2.5 Políticas de Seguridad (RLS)
- Lectura pública (`SELECT`) permitida para todas las tablas (`seasons_v2`, `season_periods`, `duration_discounts`).
- Escritura completa (`ALL`) restringida a administradores mediante la función `is_admin()`.

---

## 3. Lógica del Motor de Precios (`lib/pricing/engine.ts`)

### 3.1 Resolución de Precio por Noche
Para cada fecha del viaje `currentDate`:
1. Buscar si coincide con algún `season_periods` activo (`start_date <= currentDate <= end_date`).
2. Si coincide: tomar la temporada vinculada (`Alta` o `Media`).
3. Si no coincide con ningún periodo: tomar la temporada por defecto (`Temporada Baja`).
4. Tarifa de la noche para la camper:
   $$\text{Precio Noche} = \text{Camper Base Price} + \text{Suplemento Temporada}$$
5. Noches mínimas para la reserva: calculadas como el valor de `min_nights` de la temporada activa en la fecha de recogida.

### 3.2 Aplicación de Descuento por Duración
1. Calcular el total de días de alquiler `totalDays`.
2. Buscar en `duration_discounts` los tramos donde `is_active = true` y `totalDays >= min_days`.
3. Seleccionar el tramo con el mayor porcentaje de descuento alcanzado.
4. Descuento aplicado:
   $$\text{Descuento} = \text{Base Alquiler Camper} \times \left(\frac{\text{Porcentaje Descuento}}{100}\right)$$
   *(Los extras seleccionados y la fianza quedan íntegramente exentos de descuento).*

---

## 4. Diseño del Panel de Administración (`/admin/settings`)

El panel se organiza en dos secciones principales apiladas a ancho completo:

### Tarjeta 1: Temporadas & Suplementos por Noche
- **Cabecera**: Título explicativo, badge de estado y botón global o inline de guardado.
- **Bloques por Temporada**:
  - **Temporada Alta (Badged Red)**:
    - Input de suplemento: `+ [ 40 ] € / noche`.
    - Input de noches mínimas: `[ 5 ] noches`.
    - Lista de periodos de fechas asociados con visualización de días y etiquetas.
    - Selector de fecha inicio y fin para añadir nuevo periodo. Botón de borrado rápido por periodo.
  - **Temporada Media (Badged Blue)**:
    - Input de suplemento: `+ [ 15 ] € / noche`.
    - Input de noches mínimas: `[ 4 ] noches`.
    - Lista de periodos asociados + selector para nuevos periodos.
  - **Temporada Baja (Badged Slate - Tarifa Base)**:
    - Suplemento: `+ [ 0 ] € / noche` (o personalizable).
    - Noches mínimas: `[ 3 ] noches`.
    - Mensaje informativo: *"Aplica de forma predeterminada a todas las fechas del año no asignadas a Temporada Media o Alta."*
- **Simulador de Precios en Vivo (NEO & SPACE)**:
  - Tarjeta de cálculo inmediato que muestra la tarifa final por noche resultante:
    - **NEO (Base 110 €)**: Baja 110 € | Media 125 € | Alta 150 €
    - **SPACE (Base 135 €)**: Baja 135 € | Media 150 € | Alta 175 €
  - Se actualiza en tiempo real al tipear en los inputs de suplementos.

### Tarjeta 2: Descuentos por Larga Estancia
- **Cabecera**: Indicador del impacto de descuentos en el motor de reservas y botón "+ Añadir Tramo".
- **Tabla Interactiva**:
  - Columna 1: **Estancia Mínima** (ej. "A partir de 7 días").
  - Columna 2: **Descuento Aplicado** (ej. "10 %").
  - Columna 3: **Estado** (Toggle Activo / Inactivo).
  - Columna 4: **Acciones** (Editar valor / Eliminar tramo con confirmación).
- **Formulario / Modal para Añadir Tramo**:
  - Validación de días mínimos > 1 y porcentaje entre 1% y 100%.

---

## 5. Endpoints de API REST

1. `/api/admin/seasons`:
   - `GET`: Obtiene las 3 temporadas con sus suplementos, noches mínimas y lista de `season_periods`.
   - `PATCH`: Actualiza suplementos y noches mínimas de una temporada.
2. `/api/admin/season-periods`:
   - `POST`: Crea un nuevo periodo de fechas para una temporada tras validar que no solapa con ningún otro periodo existente.
   - `DELETE`: Elimina un periodo específico por su ID.
3. `/api/admin/duration-discounts`:
   - `GET`: Obtiene todos los tramos de descuento ordenados por días ascendente.
   - `POST`: Crea un nuevo tramo de descuento.
   - `PATCH`: Modifica días, porcentaje o estado de un tramo.
   - `DELETE`: Elimina un tramo de descuento.

---

## 6. Plan de Validación y Pruebas

1. **Pruebas Unitarias (`node:test`)**:
   - Validación del cálculo `Camper Base + Suplemento` para distintas fechas.
   - Verificación de la no colisión de periodos y detección de solapamiento.
   - Verificación de la selección del tramo de descuento más alto para 3, 7, 14 y 21 días.
2. **Pruebas de Integración con Base de Datos**:
   - Creación, actualización y borrado de periodos en `season_periods`.
   - Modificación de suplementos y verificación de lectura inmediata en `/api/availability` y simulador.
3. **Verificación de Regresión**:
   - Confirmar que las 99 pruebas existentes se mantengan en 100% pasando.
   - Compilación limpia de Next.js (`npm.cmd run build`) con código de salida 0.
