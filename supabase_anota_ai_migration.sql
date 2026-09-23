-- Migração SQL: Adiciona suporte a integração oficial com Anota AI na tabela public.stores

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS anotaai_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS anotaai_receiving_orders BOOLEAN DEFAULT TRUE;

-- Índice para busca rápida de lojas via token recebido no Webhook da Anota AI
CREATE INDEX IF NOT EXISTS idx_stores_anotaai_token ON public.stores(anotaai_token);

COMMENT ON COLUMN public.stores.anotaai_token IS 'Token / Chave de integração do estabelecimento na Anota AI (pageToken)';
COMMENT ON COLUMN public.stores.anotaai_receiving_orders IS 'Flag que indica se a loja está habilitada para receber pedidos automáticos da Anota AI';
