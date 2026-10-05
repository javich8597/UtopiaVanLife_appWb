-- Entrega y devolución de la camper (prueba documental compartida admin ↔ cliente)
-- y documentación del vehículo (ficha técnica, permiso de circulación).

CREATE TABLE IF NOT EXISTS public.handovers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('pickup', 'return')),
    license_checked boolean NOT NULL DEFAULT false,
    km integer,
    fuel_level text,
    dashboard_photo_path text,
    exterior_video_path text,
    interior_video_path text,
    damage_photo_paths text[] NOT NULL DEFAULT '{}',
    checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text,
    customer_signature text,
    admin_id uuid REFERENCES auth.users(id),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (booking_id, kind)
);

CREATE TABLE IF NOT EXISTS public.camper_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    camper_id uuid NOT NULL REFERENCES public.campers(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('ficha_tecnica', 'permiso_circulacion')),
    file_path text NOT NULL,
    file_name text,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (camper_id, kind)
);

ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camper_documents ENABLE ROW LEVEL SECURITY;

-- Admin: rol en public.users (no editable por el usuario)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
$$;

-- El cliente ve la entrega/devolución de sus reservas; el admin, todas
CREATE POLICY "handovers_select_owner_or_admin" ON public.handovers
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()
        )
    );
CREATE POLICY "handovers_write_admin" ON public.handovers
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- El cliente ve los documentos de la camper que tiene reservada; el admin, todos
CREATE POLICY "camper_documents_select" ON public.camper_documents
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.camper_id = camper_documents.camper_id
              AND b.user_id = auth.uid()
              AND b.status IN ('confirmed', 'active', 'completed')
        )
    );
CREATE POLICY "camper_documents_write_admin" ON public.camper_documents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Almacenamiento privado (las URLs se firman en el servidor)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('handovers', 'handovers', false, 52428800)  -- 50 MB por archivo
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vehicle-docs', 'vehicle-docs', false, 10485760)  -- 10 MB por archivo
ON CONFLICT (id) DO NOTHING;
