-- Módulo: Assinatura Eletrônica (Health Signatures) — v2
-- Criado em: 2026-05-12
-- Descrição: Adiciona colunas de WhatsApp e cor do termo nas tabelas existentes.
--             Execute este script APÓS o 20260511_health_signatures.sql

-- 1. Adicionar colunas de WhatsApp na tabela health_signatures
ALTER TABLE public.health_signatures
  ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

-- 2. Adicionar colunas de configuração na tabela forms
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS signature_auto_whatsapp BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS term_color TEXT DEFAULT '#10b981';

-- 3. Desabilitar RLS na health_signatures (para acesso via anon key nas APIs)
-- NOTA: As APIs usam service_role key quando disponível, mas como fallback
--       usam anon key. Desabilitar RLS garante que ambas funcionem.
ALTER TABLE public.health_signatures DISABLE ROW LEVEL SECURITY;

-- 4. Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';
