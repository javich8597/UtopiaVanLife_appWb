-- Migración para almacenar la plantilla configurable del contrato oficial
CREATE TABLE IF NOT EXISTS contract_template_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  version INT DEFAULT 1,
  title TEXT NOT NULL,
  subtitle TEXT,
  lessor JSONB NOT NULL,
  terms JSONB NOT NULL,
  articles JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- RLS policies
ALTER TABLE contract_template_settings ENABLE ROW LEVEL SECURITY;

-- Lectura para usuarios autenticados (necesario para generar contrato al cliente)
CREATE POLICY "Permitir lectura a usuarios autenticados" ON contract_template_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura restringida a administradores (o service role)
CREATE POLICY "Permitir escritura solo a service role / admin" ON contract_template_settings
  FOR ALL
  TO service_role
  USING (true);
