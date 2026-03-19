import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type TipoUsuario = "gestor" | "suporte" | "franqueado" | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>(null);

  const fetchTipo = async (email: string | undefined) => {
    if (!email) { setTipoUsuario(null); return; }
    const { data } = await supabase
      .from("mapeamento_usuarios")
      .select("tipo")
      .eq("email", email)
      .single();
    setTipoUsuario((data?.tipo as TipoUsuario) ?? "franqueado");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchTipo(session?.user?.email);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchTipo(session?.user?.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setTipoUsuario(null);
  };

  const isGestor = tipoUsuario === "gestor";
  const isSuporte = tipoUsuario === "suporte";
  const isFranqueado = tipoUsuario === "franqueado";
  const canManageUsers = isGestor;
  const canEditChamados = isGestor || isSuporte;

  return { session, loading, signOut, tipoUsuario, isGestor, isSuporte, isFranqueado, canManageUsers, canEditChamados };
}
