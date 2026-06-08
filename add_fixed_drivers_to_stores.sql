-- Execute este script no SQL Editor do Supabase para adicionar o suporte a múltiplos entregadores fixos

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS active_fixed_drivers JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN public.stores.active_fixed_drivers IS 'Lista de IDs e metadados de entregadores fixos ativos no turno (Guepardo Open)';
