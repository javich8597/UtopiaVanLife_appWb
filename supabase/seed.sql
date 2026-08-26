-- Insert campers
INSERT INTO public.campers (slug, name, description_es, description_en, thumbnail_url, images, specs, deposit_amount, is_active)
VALUES
('neo', 'NEO', 
 'NEO es la camper más polivalente de nuestra flota. Diseñada para viajar y dormir hasta 3 personas con la máxima comodidad. Su distribución inteligente aprovecha cada centímetro para ofrecerte un salón amplio, cocina completa y ducha interior, haciéndote sentir como en casa en cualquier rincón de Mallorca.',
 'NEO is the most versatile camper in our fleet. Designed for up to 3 people to travel and sleep with maximum comfort. Its smart layout makes the most of every inch to offer you a spacious living room, fully equipped kitchen, and indoor shower.',
 '/images/campers/neo/neo-ext.png',
 ARRAY['/images/campers/neo/neo-ext.png', '/images/campers/neo/neo-interior.png'],
 '{"beds": 3, "seats": 3, "length_m": 5.4, "year": 2024}'::jsonb,
 500, true),
('space', 'SPACE', 
 'SPACE representa la máxima amplitud y libertad de movimiento. Pensada para quienes buscan una experiencia espaciosa y sin limitaciones. Cuenta con un diseño interior optimizado que permite viajar a 4 personas y dormir hasta 3, ideal para familias o grupos de amigos.',
 'SPACE represents the ultimate spaciousness and freedom of movement. Designed for those seeking a spacious and limitless experience. It features an optimized interior design that accommodates up to 4 travelers and sleeps 3.',
 '/images/campers/space/space-ext.png',
 ARRAY['/images/campers/space/space-ext.png', '/images/campers/space/space-interior.png'],
 '{"beds": 3, "seats": 4, "length_m": 6.0, "year": 2024}'::jsonb,
 600, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert seasons (dates are for 2025 and 2026)
INSERT INTO public.seasons (name, start_date, end_date)
VALUES
('Temporada Baja 2025', '2025-01-01', '2025-03-31'),
('Temporada Media Primavera 2025', '2025-04-01', '2025-06-14'),
('Temporada Alta Verano 2025', '2025-06-15', '2025-09-15'),
('Temporada Media Otono 2025', '2025-09-16', '2025-10-31'),
('Temporada Baja Invierno 2025', '2025-11-01', '2025-12-31')
ON CONFLICT DO NOTHING;

-- Link camper pricing dynamically
INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 80, 5
FROM public.campers c, public.seasons s
WHERE c.slug = 'neo' AND s.name LIKE 'Temporada Baja%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 110, 8
FROM public.campers c, public.seasons s
WHERE c.slug = 'neo' AND s.name LIKE 'Temporada Media%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 150, 10
FROM public.campers c, public.seasons s
WHERE c.slug = 'neo' AND s.name LIKE 'Temporada Alta%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 95, 5
FROM public.campers c, public.seasons s
WHERE c.slug = 'space' AND s.name LIKE 'Temporada Baja%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 135, 8
FROM public.campers c, public.seasons s
WHERE c.slug = 'space' AND s.name LIKE 'Temporada Media%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

INSERT INTO public.camper_pricing (camper_id, season_id, price_per_night, discount_7days_pct)
SELECT c.id, s.id, 180, 10
FROM public.campers c, public.seasons s
WHERE c.slug = 'space' AND s.name LIKE 'Temporada Alta%'
ON CONFLICT (camper_id, season_id) DO NOTHING;

-- Insert extras
INSERT INTO public.extras (name_es, name_en, description_es, description_en, price, price_type, is_active)
VALUES
('Limpieza y Desinfección', 'Cleaning & Disinfection', 'Servicio de limpieza y preparación obligatoria de la camper.', 'Mandatory cleaning and preparation service for the camper.', 75, 'per_rental', true),
('Kit Snorkel', 'Snorkel Kit', 'Gafas y tubo para explorar las calas de Mallorca.', 'Goggles and tube to explore the coves of Mallorca.', 25, 'per_rental', true),
('Silla de Camping Extra', 'Extra Camping Chair', 'Silla plegable para exterior.', 'Folding outdoor chair.', 15, 'per_rental', true),
('Mesa de Camping', 'Camping Table', 'Mesa plegable para exterior.', 'Folding outdoor table.', 20, 'per_rental', true),
('Wi-Fi Portátil', 'Portable Wi-Fi', 'Conexión a internet ilimitada 4G.', 'Unlimited 4G internet connection.', 5, 'per_day', true)
ON CONFLICT DO NOTHING;
