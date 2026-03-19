import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Chamado = Tables<"chamados">;
export type ChamadoInsert = TablesInsert<"chamados">;
export type Usuario = Tables<"mapeamento_usuarios">;
export type UsuarioInsert = TablesInsert<"mapeamento_usuarios">;

export function useChamados() {
  return useQuery({
    queryKey: ["chamados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // atualiza automaticamente a cada 5 minutos
    refetchIntervalInBackground: false, // pausa quando a aba não está ativa
  });
}

export function useCreateChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chamado: ChamadoInsert) => {
      const { data, error } = await supabase
        .from("chamados")
        .insert(chamado)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chamados"] }),
  });
}

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mapeamento_usuarios")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (usuario: UsuarioInsert) => {
      const { data, error } = await supabase
        .from("mapeamento_usuarios")
        .insert(usuario)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
