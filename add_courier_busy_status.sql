-- Acesse o seu painel do Supabase
-- Vá em "SQL Editor" do lado esquerdo (ícone de terminal/código)
-- Clique em "New Query", cole o código abaixo e clique em RUN

-- ============================================================
-- MIGRATION: add_courier_busy_status
-- Adiciona a coluna 'is_busy' na tabela 'profiles' para 
-- suportar o status de entregador ocupado.
-- ============================================================

-- 1. Adiciona a coluna 'is_busy' na tabela 'profiles' caso ela não exista
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT FALSE;

-- 2. Atualiza a descrição/comentário da coluna para documentação
COMMENT ON COLUMN public.profiles.is_busy IS 'Indica se o entregador está ocupado (em atendimento ou marcou como ocupado)';
