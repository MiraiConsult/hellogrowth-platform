-- ============================================================
-- Migration: Campos extras de cadastro de cliente no painel admin
--   * users.city, users.state, users.niche, users.niche_data
--   * client_niches (catálogo de nichos com flag has_clinic_fields)
--   * client_contacts (múltiplos contatos por cliente)
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS niche_data JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.client_niches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  has_clinic_fields BOOLEAN DEFAULT false,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.client_niches (name, slug, has_clinic_fields, position) VALUES
  ('Clínica Odontológica', 'clinica_odontologica', true, 0),
  ('Clínica Médica', 'clinica_medica', false, 1),
  ('Estética', 'estetica', false, 2),
  ('Pet Shop', 'pet_shop', false, 3),
  ('Restaurante', 'restaurante', false, 4),
  ('Academia', 'academia', false, 5),
  ('Salão de Beleza', 'salao_beleza', false, 6),
  ('Advocacia', 'advocacia', false, 7),
  ('Imobiliária', 'imobiliaria', false, 8),
  ('Outros', 'outros', false, 99)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  notes       TEXT,
  is_primary  BOOLEAN     DEFAULT false,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_contacts_user ON public.client_contacts(user_id);
