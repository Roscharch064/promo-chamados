import { Moon, Sun, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const AppHeader = () => {
  const { theme, toggleTheme } = useTheme();
  const { signOut, session, tipoUsuario } = useAuth();
  const [tokenExpirado, setTokenExpirado] = useState(false);
  const [renovando, setRenovando] = useState(false);

  const nomeExibido =
    session?.user?.user_metadata?.nome ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "";

  const tipoLabel: Record<string, string> = {
    gestor: "Gestor",
    suporte: "Suporte",
    franqueado: "Franqueado",
  };

  // Verifica se o token Jira está expirado
  useEffect(() => {
    if (!session?.user?.email) return;

    const verificarToken = async () => {
      const { data } = await supabase
        .from("mapeamento_usuarios")
        .select("jira_api_token, jira_token_expires_at")
        .eq("email", session.user.email)
        .single();

      if (!data?.jira_api_token) {
        setTokenExpirado(true);
        return;
      }

      if (data.jira_token_expires_at) {
        const expira = new Date(data.jira_token_expires_at);
        const agora = new Date();
        setTokenExpirado(expira <= agora);
      }
    };

    verificarToken();
    // Verifica a cada 5 minutos
    const interval = setInterval(verificarToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.email]);

  const renovarToken = async () => {
    setRenovando(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/atlassian-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      toast.error("Erro ao iniciar renovação. Tente novamente.");
      setRenovando(false);
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 max-w-6xl flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">PromoBank</h1>
          <p className="text-xs text-muted-foreground">Sistema de Chamados</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Aviso de token expirado */}
          {tokenExpirado && (
            <Button
              variant="outline"
              size="sm"
              onClick={renovarToken}
              disabled={renovando}
              className="gap-1.5 h-8 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              title="Token Jira expirado — clique para renovar"
            >
              {renovando ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {renovando ? "Renovando..." : "Renovar Jira"}
              </span>
            </Button>
          )}

          {session && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-foreground capitalize">
                {nomeExibido}
              </span>
              {tipoUsuario && (
                <span className="text-xs text-muted-foreground">
                  {tipoLabel[tipoUsuario] ?? tipoUsuario}
                </span>
              )}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Alternar tema">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
