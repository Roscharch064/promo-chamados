
-- Enum for user types
CREATE TYPE public.tipo_usuario AS ENUM ('franqueado', 'suporte', 'gestor');

-- Enum for ticket origin
CREATE TYPE public.origem_chamado AS ENUM ('app_direto', 'rd_conversas');

-- Enum for ticket type
CREATE TYPE public.tipo_chamado AS ENUM ('bug', 'melhoria', 'solicitacao');

-- User mapping table (~17 users: franchisees + support)
CREATE TABLE public.mapeamento_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo tipo_usuario NOT NULL,
  telefone_whatsapp TEXT,
  email TEXT NOT NULL,
  account_id_jira TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets table
CREATE TABLE public.chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_key TEXT,
  tipo tipo_chamado NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  relator_nome TEXT NOT NULL,
  relator_account_id TEXT,
  aberto_por_email TEXT,
  rd_conversa_id TEXT,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_empresa TEXT,
  status_jira TEXT DEFAULT 'Aberto',
  origem origem_chamado NOT NULL DEFAULT 'app_direto',
  modulo TEXT,
  prioridade TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mapeamento_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users full access (internal team app)
CREATE POLICY "Authenticated users can read mapeamento" ON public.mapeamento_usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert mapeamento" ON public.mapeamento_usuarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update mapeamento" ON public.mapeamento_usuarios
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete mapeamento" ON public.mapeamento_usuarios
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read chamados" ON public.chamados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert chamados" ON public.chamados
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update chamados" ON public.chamados
  FOR UPDATE TO authenticated USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_mapeamento_updated_at
  BEFORE UPDATE ON public.mapeamento_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
