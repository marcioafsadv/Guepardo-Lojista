-- Adiciona colunas para controle da integração na tabela de entregas (deliveries)
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50) DEFAULT NULL, -- 'IFOOD' ou NULL
ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_metadata JSONB DEFAULT NULL;

-- Índice para busca rápida por ID do pedido externo
CREATE INDEX IF NOT EXISTS idx_deliveries_external_order ON public.deliveries(external_source, external_order_id);

-- Adiciona coluna de merchant_id do iFood na tabela stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS ifood_merchant_id VARCHAR(100) DEFAULT NULL;

-- Índice para busca rápida de lojas por ID do iFood
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_ifood_merchant ON public.stores(ifood_merchant_id);

