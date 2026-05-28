-- ══════════════════════════════════════════════════════════════════════
2: -- MIGRATION: ATUALIZAÇÃO DA RESTRIÇÃO DE STATUS DA TABELA DELIVERIES
3: -- ══════════════════════════════════════════════════════════════════════
4: -- Execute este script no SQL Editor do seu console Supabase (https://supabase.com)
5: -- para permitir que o App do Entregador salve status intermediários e de retorno.
6: 
7: -- 1. Remover a restrição (constraint) de status antiga
8: ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
9: 
10: -- 2. Criar a nova restrição contendo todos os 10 status do fluxo de trabalho
11: ALTER TABLE public.deliveries 
12: ADD CONSTRAINT deliveries_status_check 
13: CHECK (status IN (
14:     'pending',
15:     'accepted',
16:     'arrived_pickup',
17:     'picking_up',
18:     'ready_for_pickup',
19:     'in_transit',
20:     'arrived_at_customer',
21:     'returning',
22:     'completed',
23:     'cancelled'
24: ));
25: 
26: COMMENT ON CONSTRAINT deliveries_status_check ON public.deliveries IS 'Restringe os status possíveis de uma entrega do Guepardo.';
