import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

const AppHeader = () => {
  const { theme, toggleTheme } = useTheme();
  const { signOut, session, tipoUsuario } = useAuth();

  // Pega o nome do user_metadata (salvo pelo atlassian-callback) ou fallback para email
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

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 max-w-6xl flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">PromoBank</h1>
          <p className="text-xs text-muted-foreground">Sistema de Chamados</p>
        </div>
        <div className="flex items-center gap-2">
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
