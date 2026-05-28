-- Migração para suporte ao Asaas
-- Execute este script no SQL Editor do seu painel Supabase

-- 1. Adicionar coluna external_id na tabela wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- 2. (Opcional) Garantir que as colunas de PIX existam (caso não existam)
-- ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
-- ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;

-- 3. Comentário para facilitar identificação
COMMENT ON COLUMN wallet_transactions.external_id IS 'ID externo da transação (Asaas, MercadoPago, etc)';
