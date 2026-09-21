# Temporadas, Suplementos & Descuentos por Larga Estancia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir y desacoplar la sección de Temporadas & Tarifas Base en `/admin/settings` en dos tarjetas modulares independientes: 1) Temporadas & Suplementos con periodos de fechas discontinuos y simulador de precios para NEO/SPACE, y 2) Descuentos por Larga Estancia con tramos editables de días y porcentajes.

**Architecture:** 
- En base de datos (Supabase), se crean las tablas `seasons_v2` (categorías canónicas Alta, Media, Baja con suplementos y noches mínimas), `season_periods` (rangos de fechas no continuados con validación anti-solapamiento) y `duration_discounts` (tramos dinámicos de días y porcentajes). Se sincroniza la columna `base_price_per_night` en `campers`.
- En el motor de cálculo (`lib/pricing/engine.ts`), el precio por noche pasa a ser `Base Camper + Suplemento Temporada`, y los descuentos aplican el tramo más alto alcanzado a la tarifa de alquiler.
- En la UI (`/admin/settings`), se sustituye la tabla actual por dos clientes reactivos: `SeasonsSupplementClient.tsx` y `DurationDiscountsClient.tsx`, con feedback instantáneo por toasts.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase PostgreSQL con RLS (`is_admin()`), Lucide React, Node.js Test Runner (`node:test`).

---

### Task 1: Database Migration & Schema Setup (Supabase)

**Files:**
- Test/Run: Execute SQL via MCP Supabase `execute_sql`

- [ ] **Step 1: Execute SQL migration in Supabase**

```sql
-- 1. Añadir base_price_per_night a campers si no existe
ALTER TABLE public.campers 
ADD COLUMN IF NOT EXISTS base_price_per_night NUMERIC NOT NULL DEFAULT 120.00;

UPDATE public.campers SET base_price_per_night = 110.00 WHERE slug = 'neo';
UPDATE public.campers SET base_price_per_night = 135.00 WHERE slug = 'space';

-- 2. Crear seasons_v2
CREATE TABLE IF NOT EXISTS public.seasons_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
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
    is_default = EXCLUDED.is_default,
    color_badge = EXCLUDED.color_badge;

-- 3. Crear season_periods
CREATE TABLE IF NOT EXISTS public.season_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons_v2(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_season_periods_dates ON public.season_periods (start_date, end_date);

-- 4. Migrar periodos históricos existentes a season_periods
DO $$
DECLARE
    v_alta_id UUID;
    v_media_id UUID;
BEGIN
    SELECT id INTO v_alta_id FROM public.seasons_v2 WHERE code = 'alta';
    SELECT id INTO v_media_id FROM public.seasons_v2 WHERE code = 'media';

    IF NOT EXISTS (SELECT 1 FROM public.season_periods) THEN
        -- Periodos de Alta
        INSERT INTO public.season_periods (season_id, start_date, end_date, label)
        SELECT v_alta_id, start_date, end_date, name
        FROM public.seasons
        WHERE name ILIKE '%alta%';

        -- Periodos de Media
        INSERT INTO public.season_periods (season_id, start_date, end_date, label)
        SELECT v_media_id, start_date, end_date, name
        FROM public.seasons
        WHERE name ILIKE '%media%';
    END IF;
END $$;

-- 5. Crear duration_discounts
CREATE TABLE IF NOT EXISTS public.duration_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_days INTEGER NOT NULL CHECK (min_days >= 2),
    discount_pct NUMERIC NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.duration_discounts (min_days, discount_pct, is_active)
VALUES 
    (7, 10.00, true),
    (14, 15.00, true),
    (21, 20.00, true)
ON CONFLICT DO NOTHING;

-- 6. Habilitar RLS y políticas en las nuevas tablas
ALTER TABLE public.seasons_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duration_discounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- seasons_v2
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seasons_v2' AND policyname = 'seasons_v2_read_all') THEN
        CREATE POLICY "seasons_v2_read_all" ON public.seasons_v2 FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seasons_v2' AND policyname = 'seasons_v2_admin_write') THEN
        CREATE POLICY "seasons_v2_admin_write" ON public.seasons_v2 FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- season_periods
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'season_periods' AND policyname = 'season_periods_read_all') THEN
        CREATE POLICY "season_periods_read_all" ON public.season_periods FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'season_periods' AND policyname = 'season_periods_admin_write') THEN
        CREATE POLICY "season_periods_admin_write" ON public.season_periods FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- duration_discounts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'duration_discounts' AND policyname = 'duration_discounts_read_all') THEN
        CREATE POLICY "duration_discounts_read_all" ON public.duration_discounts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'duration_discounts' AND policyname = 'duration_discounts_admin_write') THEN
        CREATE POLICY "duration_discounts_admin_write" ON public.duration_discounts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;
END $$;
```

- [ ] **Step 2: Verify migration output**

Run SQL verification query to check table row counts and schema.

---

### Task 2: Pricing Engine & Overlap Validation Logic

**Files:**
- Modify: `lib/pricing/engine.ts`
- Test: `tests/seasonsAndDiscounts.test.ts`

- [ ] **Step 1: Write failing unit tests for new pricing engine & overlap validator**

Create `tests/seasonsAndDiscounts.test.ts` with tests for:
1. `resolveSeasonForDate`: matching date in period vs default Baja.
2. `hasOverlappingPeriods`: detecting overlapping date intervals between periods.
3. `resolveDurationDiscount`: selecting highest active tier (e.g. 7d -> 10%, 14d -> 15%, 21d -> 20%).
4. `calculatePriceWithSupplement`: formula `basePrice + supplement`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`
Expected: FAIL due to missing functions in `lib/pricing/engine.ts`.

- [ ] **Step 3: Implement new types and calculation functions in `lib/pricing/engine.ts`**

Export:
- `SeasonV2`, `SeasonPeriod`, `DurationDiscount` interfaces
- `hasOverlappingPeriods(newPeriod, existingPeriods)`
- `resolveSeasonForDate(date, seasons, periods)`
- `resolveDurationDiscount(totalDays, discounts)`
- Update `calculatePrice` to support camper base price + season supplement, while preserving backward compatibility with legacy `Season[]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add tests/seasonsAndDiscounts.test.ts lib/pricing/engine.ts
git commit -m "feat(pricing): add season supplement calculation and duration discounts logic"
```

---

### Task 3: REST API Endpoints for Seasons, Periods, and Discounts

**Files:**
- Create: `app/api/admin/seasons/route.ts`
- Create: `app/api/admin/season-periods/route.ts`
- Create: `app/api/admin/season-periods/[id]/route.ts`
- Create: `app/api/admin/duration-discounts/route.ts`
- Create: `app/api/admin/duration-discounts/[id]/route.ts`

- [ ] **Step 1: Implement `app/api/admin/seasons/route.ts`**
  - `GET`: Returns the 3 seasons (`seasons_v2`) with their associated `season_periods` and campers list with `base_price_per_night`.
  - `PATCH`: Updates `supplement_per_night` and/or `min_nights` for a season code/id.
- [ ] **Step 2: Implement `app/api/admin/season-periods/route.ts` & `[id]/route.ts`**
  - `POST`: Validates date order (`end_date >= start_date`), checks `hasOverlappingPeriods` against existing periods in database, inserts period.
  - `DELETE`: Deletes specific period by `id`.
- [ ] **Step 3: Implement `app/api/admin/duration-discounts/route.ts` & `[id]/route.ts`**
  - `GET`: Lists all discounts ordered by `min_days ASC`.
  - `POST`: Validates `min_days >= 2` and `0 <= discount_pct <= 100`, inserts tier.
  - `PATCH`: Updates `min_days`, `discount_pct`, or toggles `is_active`.
  - `DELETE`: Deletes tier by `id`.
- [ ] **Step 4: Verify endpoints via automated script**
  Test all endpoints using node test script.
- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seasons/ app/api/admin/season-periods/ app/api/admin/duration-discounts/
git commit -m "feat(api): add admin endpoints for seasons, periods and duration discounts"
```

---

### Task 4: Admin UI Components Rebuild (`/admin/settings`)

**Files:**
- Create: `app/[locale]/admin/settings/SeasonsSupplementClient.tsx`
- Create: `app/[locale]/admin/settings/DurationDiscountsClient.tsx`
- Modify: `app/[locale]/admin/settings/page.tsx`
- Delete: `app/[locale]/admin/settings/SeasonsTableClient.tsx`

- [ ] **Step 1: Build `SeasonsSupplementClient.tsx`**
  - 3 season cards/accordions (Temporada Alta, Media, Baja).
  - Inputs for `supplement_per_night` (+ €/noche) and `min_nights` with instant update & toast feedback.
  - Period manager: shows active periods (start_date to end_date, total days, optional label) with delete button.
  - Inline form to add new date period with date validation and conflict error feedback.
  - Live simulator showing:
    * NEO (Base X €): Baja (X €) | Media (X + sup €) | Alta (X + sup €)
    * SPACE (Base Y €): Baja (Y €) | Media (Y + sup €) | Alta (Y + sup €)
- [ ] **Step 2: Build `DurationDiscountsClient.tsx`**
  - Interactive table of discount tiers.
  - Quick inline inputs or modal for adding new discount tier (`min_days` y `discount_pct`).
  - Active toggle switch.
  - Delete button with confirmation.
  - Toast feedback on change.
- [ ] **Step 3: Update `app/[locale]/admin/settings/page.tsx`**
  - Query `seasons_v2`, `season_periods`, `campers` (base_price_per_night), `duration_discounts`.
  - Render:
    1. Header con metadata.
    2. Catálogo de Extras (`ExtrasTableClient`).
    3. Temporadas & Suplementos (`SeasonsSupplementClient`).
    4. Descuentos por Larga Estancia (`DurationDiscountsClient`).
- [ ] **Step 4: Remove obsolete `SeasonsTableClient.tsx`**
- [ ] **Step 5: Commit**

```bash
git add app/[locale]/admin/settings/
git commit -m "feat(admin): build separate seasons supplements and duration discounts UI"
```

---

### Task 5: Availability & Booking Catalog Integration

**Files:**
- Modify: `app/api/availability/route.ts`
- Modify: `components/booking/PriceCalculator.tsx`

- [ ] **Step 1: Update `/api/availability/route.ts`**
  - Resolve prices using `seasons_v2` and `season_periods`.
  - Camper's price per night in search results matches `camper.base_price_per_night + activeSeason.supplement_per_night`.
- [ ] **Step 2: Update `components/booking/PriceCalculator.tsx`**
  - Read active `duration_discounts` to display discount badges (e.g. "-10% a partir de 7 días", "-15% a partir de 14 días").
- [ ] **Step 3: Commit**

```bash
git add app/api/availability/route.ts components/booking/PriceCalculator.tsx
git commit -m "feat(catalog): integrate season supplements and tiered discounts in booking calculation"
```

---

### Task 6: Full Verification & Quality Assurance

**Files:**
- Test suite: `npm.cmd test`
- Build verification: `npm.cmd run build`

- [ ] **Step 1: Run complete test suite**
  Execute `npm.cmd test` and verify 100% pass rate.
- [ ] **Step 2: Run Next.js production build**
  Execute `npm.cmd run build` and ensure exit code 0.
- [ ] **Step 3: Live database E2E verification script**
  Test end-to-end: adding period, editing supplement, checking live simulated rate, adding discount tier, calculating booking price, and verifying cleanup.
- [ ] **Step 4: Update walkthrough documentation**
