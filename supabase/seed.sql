-- Insert campers
INSERT INTO public.campers (slug, name, description_es, description_en, thumbnail_url, images, specs, deposit_amount, is_active)
VALUES
('neo', 'NEO', 
 'NEO ofrece más espacio, capacidad y libertad con un maletero de 2.230 litros. Equipada con el sistema eléctrico PRO Victron (540Ah litio, 400W solar, inversor 2000W) y aire acondicionado 12V Dometic. Habitáculo independiente con separación total de cabina para máximo confort e intimidad.',
 'NEO offers more space, capacity and freedom with 2,230L cargo storage. Equipped with Victron PRO electrical system (540Ah lithium, 400W solar, 2000W inverter) and 12V Dometic AC. Completely separated living cabin for ultimate insulation and privacy.',
 '/images/campers/neo/neo-ext.png',
 ARRAY['/images/campers/neo/neo-ext.png', '/images/campers/neo/neo-interior.png'],
 '{"beds": 3, "seats": 3, "length_m": 6.0, "fresh_water_l": 113, "lithium_ah": 540, "solar_w": 400, "ac": "Dometic 12V", "year": 2025}'::jsonb,
 1000, true),
('space', 'SPACE', 
 'SPACE redefine el lujo camper con una distribución abierta de 7m² (Open Concept) y cama elevable eléctrica de techo sobre un salón panorámico en U con mesa 360°. Equipada con 160L de agua limpia, 540Ah de litio Victron, 400W solares, aire acondicionado 12V Dometic y Pack Cine.',
 'SPACE redefines camper luxury with a 7m² open concept layout and an electric drop-down roof bed over a panoramic U-lounge with a 360° table. Equipped with 160L fresh water, 540Ah Victron lithium, 400W solar, 12V Dometic AC, and Cinema Pack.',
 '/images/campers/space/space-ext.png',
 ARRAY['/images/campers/space/space-ext.png', '/images/campers/space/space-interior.png'],
 '{"beds": 3, "seats": 3, "length_m": 6.0, "fresh_water_l": 160, "lithium_ah": 540, "solar_w": 400, "ac": "Dometic 12V", "year": 2025}'::jsonb,
 1000, true)
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
