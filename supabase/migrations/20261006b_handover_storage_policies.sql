-- Permisos de Storage para las carpetas privadas de entregas y documentación del vehículo.
-- Con la clave service role no hacen falta, pero así funciona también con la sesión del admin
-- (y el cliente puede leer los archivos de sus propias reservas).

CREATE POLICY "handovers_admin_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'handovers' AND public.is_admin())
    WITH CHECK (bucket_id = 'handovers' AND public.is_admin());

-- Ruta: {booking_id}/{pickup|return}/archivo
CREATE POLICY "handovers_owner_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'handovers' AND EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id::text = split_part(name, '/', 1) AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "vehicle_docs_admin_all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'vehicle-docs' AND public.is_admin())
    WITH CHECK (bucket_id = 'vehicle-docs' AND public.is_admin());

-- Ruta: {camper_id}/archivo — el cliente con reserva confirmada o en curso de esa camper
CREATE POLICY "vehicle_docs_customer_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'vehicle-docs' AND EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.camper_id::text = split_part(name, '/', 1)
              AND b.user_id = auth.uid()
              AND b.status IN ('confirmed', 'active')
        )
    );
