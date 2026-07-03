/*
# Create Catalog Tables for Maintenance Dashboard

1. New Tables
- `cat_tipo_servicios` — Types of maintenance services
- `cat_talleres` — Workshops
- `cat_estatus` — Status values
- `cat_motivos` — Reasons/motives
- `cat_plantas` — Plants
- `cat_kpi_params` — KPI parameters

Each table has:
- id (uuid, primary key)
- nombre (text, not null)
- activo (boolean, default true)
- created_at (timestamp)

2. Security
- Enable RLS on all tables
- Allow anon + authenticated CRUD (single-tenant, shared data)
*/

CREATE TABLE IF NOT EXISTS cat_tipo_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_talleres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_estatus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_motivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cat_kpi_params (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  valor text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE cat_tipo_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_estatus ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_motivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_kpi_params ENABLE ROW LEVEL SECURITY;

-- Policies for cat_tipo_servicios
DROP POLICY IF EXISTS "anon_select_tipo_servicios" ON cat_tipo_servicios;
CREATE POLICY "anon_select_tipo_servicios" ON cat_tipo_servicios FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tipo_servicios" ON cat_tipo_servicios;
CREATE POLICY "anon_insert_tipo_servicios" ON cat_tipo_servicios FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tipo_servicios" ON cat_tipo_servicios;
CREATE POLICY "anon_update_tipo_servicios" ON cat_tipo_servicios FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tipo_servicios" ON cat_tipo_servicios;
CREATE POLICY "anon_delete_tipo_servicios" ON cat_tipo_servicios FOR DELETE TO anon, authenticated USING (true);

-- Policies for cat_talleres
DROP POLICY IF EXISTS "anon_select_talleres" ON cat_talleres;
CREATE POLICY "anon_select_talleres" ON cat_talleres FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_talleres" ON cat_talleres;
CREATE POLICY "anon_insert_talleres" ON cat_talleres FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_talleres" ON cat_talleres;
CREATE POLICY "anon_update_talleres" ON cat_talleres FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_talleres" ON cat_talleres;
CREATE POLICY "anon_delete_talleres" ON cat_talleres FOR DELETE TO anon, authenticated USING (true);

-- Policies for cat_estatus
DROP POLICY IF EXISTS "anon_select_estatus" ON cat_estatus;
CREATE POLICY "anon_select_estatus" ON cat_estatus FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_estatus" ON cat_estatus;
CREATE POLICY "anon_insert_estatus" ON cat_estatus FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_estatus" ON cat_estatus;
CREATE POLICY "anon_update_estatus" ON cat_estatus FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_estatus" ON cat_estatus;
CREATE POLICY "anon_delete_estatus" ON cat_estatus FOR DELETE TO anon, authenticated USING (true);

-- Policies for cat_motivos
DROP POLICY IF EXISTS "anon_select_motivos" ON cat_motivos;
CREATE POLICY "anon_select_motivos" ON cat_motivos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_motivos" ON cat_motivos;
CREATE POLICY "anon_insert_motivos" ON cat_motivos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_motivos" ON cat_motivos;
CREATE POLICY "anon_update_motivos" ON cat_motivos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_motivos" ON cat_motivos;
CREATE POLICY "anon_delete_motivos" ON cat_motivos FOR DELETE TO anon, authenticated USING (true);

-- Policies for cat_plantas
DROP POLICY IF EXISTS "anon_select_plantas" ON cat_plantas;
CREATE POLICY "anon_select_plantas" ON cat_plantas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_plantas" ON cat_plantas;
CREATE POLICY "anon_insert_plantas" ON cat_plantas FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_plantas" ON cat_plantas;
CREATE POLICY "anon_update_plantas" ON cat_plantas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_plantas" ON cat_plantas;
CREATE POLICY "anon_delete_plantas" ON cat_plantas FOR DELETE TO anon, authenticated USING (true);

-- Policies for cat_kpi_params
DROP POLICY IF EXISTS "anon_select_kpi_params" ON cat_kpi_params;
CREATE POLICY "anon_select_kpi_params" ON cat_kpi_params FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_kpi_params" ON cat_kpi_params;
CREATE POLICY "anon_insert_kpi_params" ON cat_kpi_params FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kpi_params" ON cat_kpi_params;
CREATE POLICY "anon_update_kpi_params" ON cat_kpi_params FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_kpi_params" ON cat_kpi_params;
CREATE POLICY "anon_delete_kpi_params" ON cat_kpi_params FOR DELETE TO anon, authenticated USING (true);