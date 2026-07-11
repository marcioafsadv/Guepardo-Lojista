-- Adiciona colunas para controle de recebimento de pedidos de integrações na tabela stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS ifood_receiving_orders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ninenine_receiving_orders BOOLEAN DEFAULT true;

-- Comentários explicativos sobre as colunas
COMMENT ON COLUMN public.stores.ifood_receiving_orders IS 'Indica se a loja está ativa para receber pedidos integrados do iFood';
COMMENT ON COLUMN public.stores.ninenine_receiving_orders IS 'Indica se a loja está ativa para receber pedidos integrados da 99Food';
