-- Execute este script no SQL Editor do Supabase para adicionar o suporte a entregadores híbridos fixos
-- e a função RPC para liberá-los creditando a diária de R$ 50,00.

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS active_hybrid_drivers JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.stores.active_hybrid_drivers IS 'Lista de IDs de entregadores híbridos fixos ativos no turno';

-- RPC FUNCTION PARA LIBERAÇÃO DE ENTREGADOR HÍBRIDO (GUEPARDO HÍBRIDO)
CREATE OR REPLACE FUNCTION public.release_hybrid_driver(
  p_store_id UUID,
  p_courier_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões administrativas (bypassa RLS)
AS $$
DECLARE
  v_current_hybrid JSONB;
  v_updated_hybrid JSONB;
  v_random_tx_id TEXT;
  v_today_str TEXT;
  v_today_date DATE;
BEGIN
  -- 1. Busca os entregadores híbridos ativos na loja
  SELECT active_hybrid_drivers INTO v_current_hybrid
  FROM public.stores
  WHERE id = p_store_id;

  -- 2. Remove o ID do entregador do array JSONB
  SELECT jsonb_agg(elem) INTO v_updated_hybrid
  FROM jsonb_array_elements(COALESCE(v_current_hybrid, '[]'::jsonb)) AS elem
  WHERE elem #>> '{}' <> p_courier_id::text;

  IF v_updated_hybrid IS NULL THEN
    v_updated_hybrid := '[]'::jsonb;
  END IF;

  -- 3. Atualiza os dados da loja
  UPDATE public.stores
  SET active_hybrid_drivers = v_updated_hybrid
  WHERE id = p_store_id;

  -- 4. Insere a transação de diária na carteira do entregador
  v_random_tx_id := 'tx-' || substring(md5(random()::text) from 1 for 9);
  v_today_str := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  
  INSERT INTO public.transactions (
    id,
    user_id,
    amount,
    type,
    status,
    week_id,
    details,
    date,
    time
  ) VALUES (
    v_random_tx_id,
    p_courier_id,
    p_amount,
    'Diária Turno Híbrido',
    'COMPLETED',
    'current',
    jsonb_build_object(
      'duration', 'Turno Híbrido',
      'stops', 0,
      'timeline', jsonb_build_array(
        jsonb_build_object('time', v_today_str, 'description', 'Turno Híbrido Ativado', 'status', 'done'),
        jsonb_build_object('time', v_today_str, 'description', 'Turno Híbrido Encerrado e Pago', 'status', 'done')
      )
    ),
    (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    (now() AT TIME ZONE 'America/Sao_Paulo')::time
  );

  -- 5. Atualiza as estatísticas diárias do entregador (ganhos de hoje)
  v_today_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  INSERT INTO public.daily_stats (user_id, date, earnings)
  VALUES (p_courier_id, v_today_date, p_amount)
  ON CONFLICT (user_id, date) DO UPDATE
  SET earnings = public.daily_stats.earnings + EXCLUDED.earnings;

END;
$$;
