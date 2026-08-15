-- =============================================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE (COMPLETO Y ACTUALIZADO)
-- Módulo: Control de Descarga y Surtida — Decathlon La Flora
-- =============================================================================

-- 1. Tabla de Permanentes / Colaboradores
CREATE TABLE IF NOT EXISTS permanentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Registros de Descarga y Surtida
CREATE TABLE IF NOT EXISTS registros_descarga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permanente_id UUID NOT NULL REFERENCES permanentes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    colaboradores INTEGER NOT NULL CHECK (colaboradores > 0),
    observaciones TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexación para optimizar consultas rápidas
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_descarga(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_registros_permanente ON registros_descarga(permanente_id);

-- 3. Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_registros_descarga_updated_at ON registros_descarga;
CREATE TRIGGER update_registros_descarga_updated_at
    BEFORE UPDATE ON registros_descarga
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Políticas de Seguridad RLS (Row Level Security)
ALTER TABLE permanentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_descarga ENABLE ROW LEVEL SECURITY;

-- Políticas para permanentes
DROP POLICY IF EXISTS "Permitir lectura publica permanentes" ON permanentes;
DROP POLICY IF EXISTS "Permitir insercion publica permanentes" ON permanentes;
DROP POLICY IF EXISTS "Permitir actualizacion publica permanentes" ON permanentes;
DROP POLICY IF EXISTS "Permitir eliminacion publica permanentes" ON permanentes;

CREATE POLICY "Permitir lectura publica permanentes" ON permanentes FOR SELECT USING (true);
CREATE POLICY "Permitir insercion publica permanentes" ON permanentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion publica permanentes" ON permanentes FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminacion publica permanentes" ON permanentes FOR DELETE USING (true);

-- Políticas para registros_descarga
DROP POLICY IF EXISTS "Permitir lectura publica registros" ON registros_descarga;
DROP POLICY IF EXISTS "Permitir insercion publica registros" ON registros_descarga;
DROP POLICY IF EXISTS "Permitir actualizacion publica registros" ON registros_descarga;
DROP POLICY IF EXISTS "Permitir eliminacion publica registros" ON registros_descarga;

CREATE POLICY "Permitir lectura publica registros" ON registros_descarga FOR SELECT USING (true);
CREATE POLICY "Permitir insercion publica registros" ON registros_descarga FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion publica registros" ON registros_descarga FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminacion publica registros" ON registros_descarga FOR DELETE USING (true);
