import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const ERRO_MAP: Record<string, string> = {
  acesso_negado: "Seu email não está cadastrado no sistema. Solicite acesso ao administrador.",
  token_exchange_failed: "Falha ao autenticar com a Atlassian. Tente novamente.",
  user_fetch_failed: "Não foi possível obter seus dados da Atlassian. Tente novamente.",
  auth_failed: "Erro ao criar sessão. Contate o administrador.",
  link_failed: "Erro ao gerar link de acesso. Tente novamente.",
  missing_code: "Código de autorização ausente. Tente novamente.",
  unexpected: "Erro inesperado. Tente novamente.",
};

const Login = () => {
  const { session, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAtlassianLoading, setIsAtlassianLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    const emailParam = searchParams.get("email");
    if (error) {
      const msg = ERRO_MAP[error] ?? `Erro: ${error}`;
      const full = emailParam ? `${msg} (${emailParam})` : msg;
      toast.error(full, { duration: 6000 });
    }
  }, [searchParams]);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Email ou senha incorretos");
    }
    setIsLoading(false);
  };

  const handleAtlassianLogin = async () => {
    setIsAtlassianLoading(true);
    try {
      // POST (não GET) — a edge function só aceita POST
      const res = await fetch(`${SUPABASE_URL}/functions/v1/atlassian-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Não foi possível iniciar login com Atlassian");
        setIsAtlassianLoading(false);
      }
    } catch {
      toast.error("Erro ao conectar com Atlassian");
      setIsAtlassianLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">PromoBank</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Chamados</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-center">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Botão Atlassian */}
            <Button
              variant="outline"
              onClick={handleAtlassianLogin}
              disabled={isAtlassianLoading}
              className="w-full gap-2 border-2"
            >
              {isAtlassianLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.53 2.11a.61.61 0 0 0-.49-.11.62.62 0 0 0-.4.28L5.16 11.5a.63.63 0 0 0 .08.74l5.48 5.48a.63.63 0 0 0 .88 0l7.24-7.24a.63.63 0 0 0 0-.88L11.53 2.11z" fill="#2684FF"/>
                  <path d="M11.6 13.47 8.13 9.99a14.4 14.4 0 0 0-2.97 7.51.63.63 0 0 0 .63.63h6.89a.63.63 0 0 0 .63-.7 8.13 8.13 0 0 0-1.71-3.96z" fill="url(#atlassian-grad)"/>
                  <defs>
                    <linearGradient id="atlassian-grad" x1="12.06" y1="13.2" x2="7.56" y2="18.13" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0052CC"/>
                      <stop offset="1" stopColor="#2684FF"/>
                    </linearGradient>
                  </defs>
                </svg>
              )}
              {isAtlassianLoading ? "Redirecionando..." : "Entrar com Atlassian"}
            </Button>

            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Login email/senha */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
