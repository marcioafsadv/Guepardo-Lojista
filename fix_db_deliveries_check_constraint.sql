-- ══════════════════════════════════════════════════════════════════════
-- MIGRATION: ATUALIZAÇÃO DA RESTRIÇÃO DE STATUS DA TABELA DELIVERIES
-- ══════════════════════════════════════════════════════════════════════
-- Execute este script no SQL Editor do seu console Supabase (https://supabase.com)
-- para permitir que o App do Entregador e o Webhook do iFood salvem os status corretos.

-- 1. Remover a restrição (constraint) de status antiga
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

-- 2. Criar a nova restrição contendo todos os 13 status do fluxo de trabalho completo
ALTER TABLE public.deliveries 
ADD CONSTRAINT deliveries_status_check 
CHECK (status IN (
    'created',
    'pending',
    'scheduled',
    'accepted',
    'to_store',
    'arrived_pickup',
    'picking_up',
    'ready_for_pickup',
    'in_transit',
    'arrived_at_customer',
    'returning',
    'completed',
    'cancelled'
));

COMMENT ON CONSTRAINT deliveries_status_check ON public.deliveries IS 'Restringe os status possíveis de uma entrega do Guepardo.';
