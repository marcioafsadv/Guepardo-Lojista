-- =====================================================================
-- GUEPARDO LOJISTA: Adiciona colunas de Aceite Eletrônico de Contrato
-- Execução: Rodar no Editor SQL do Supabase (Banco de Dados Primário)
-- =====================================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS contract_accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_ip_address    TEXT,
  ADD COLUMN IF NOT EXISTS contract_user_agent    TEXT,
  ADD COLUMN IF NOT EXISTS contract_version       TEXT DEFAULT 'v1.0-2026-07',
  ADD COLUMN IF NOT EXISTS contract_pdf_url       TEXT;

-- Comentários descritivos para auditoria
COMMENT ON COLUMN public.stores.contract_accepted_at  IS 'Timestamp exato (com fuso horário) do aceite eletrônico do contrato';
COMMENT ON COLUMN public.stores.contract_ip_address   IS 'Endereço IP do dispositivo do lojista no momento do aceite';
COMMENT ON COLUMN public.stores.contract_user_agent   IS 'User-Agent do navegador/dispositivo no momento do aceite';
COMMENT ON COLUMN public.stores.contract_version      IS 'Versão do template do contrato aceito (ex: v1.0-2026-07)';
COMMENT ON COLUMN public.stores.contract_pdf_url      IS 'URL pública do PDF do contrato assinado armazenado no Supabase Storage';
