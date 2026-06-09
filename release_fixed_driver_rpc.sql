-- ====================================================================
-- GUEPARDO: RPC FUNCTION PARA LIBERAÇÃO DE ENTREGADOR FIXO (GUEPARDO OPEN)
-- ====================================================================
-- Este script cria a função RPC 'release_fixed_driver' com SECURITY DEFINER.
-- Isso permite que a liberação seja realizada de forma atômica e segura a partir 
-- do painel do Lojista, contornando a restrição de RLS da tabela public.transactions.
--
-- Como executar:
-- 1. Acesse o painel do Supabase (https://supabase.com).
-- 2. Vá em 'SQL Editor' no menu lateral esquerdo.
-- 3. Clique em 'New Query' (Nova Consulta).
-- 4. Cole este código abaixo e clique em 'Run' (Executar).

CREATE OR REPLACE FUNCTION public.release_fixed_driver(
  p_store_id UUID,
  p_courier_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões administrativas (bypassa RLS)
AS $$
DECLARE
  v_current_fixed JSONB;
  v_updated_fixed JSONB;
  v_next_is_open BOOLEAN;
  v_random_tx_id TEXT;
  v_today_str TEXT;
  v_today_date DATE;
BEGIN
  -- 1. Busca os entregadores fixos ativos na loja
  SELECT active_fixed_drivers INTO v_current_fixed
  FROM public.stores
  WHERE id = p_store_id;

  -- 2. Remove o ID do entregador do array JSONB
  SELECT jsonb_agg(elem) INTO v_updated_fixed
  FROM jsonb_array_elements(COALESCE(v_current_fixed, '[]'::jsonb)) AS elem
  WHERE elem #>> '{}' <> p_courier_id::text;

  IF v_updated_fixed IS NULL THEN
    v_updated_fixed := '[]'::jsonb;
  END IF;

  v_next_is_open := jsonb_array_length(v_updated_fixed) > 0;

  -- 3. Atualiza os dados da loja
  UPDATE public.stores
  SET active_fixed_drivers = v_updated_fixed,
      is_open_mode = v_next_is_open
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
    'Diária Turno Fixo',
    'COMPLETED',
    'current',
    jsonb_build_object(
      'duration', 'Turno Fixo',
      'stops', 0,
      'timeline', jsonb_build_array(
        jsonb_build_object('time', v_today_str, 'description', 'Turno Fixo Ativado', 'status', 'done'),
        jsonb_build_object('time', v_today_str, 'description', 'Turno Fixo Encerrado e Pago', 'status', 'done')
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
