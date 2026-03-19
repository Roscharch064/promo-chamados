import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bug, Lightbulb, ClipboardList, Send, Loader2,
  Sparkles, CheckCircle2, AlertCircle, User, Phone, Building2,
} from "lucide-react";

const MODULOS = [
  "Login", "Cadastros", "Consultas", "Relatórios", "Dashboard",
  "Campanhas", "FGTS", "SIAPE", "INSS", "Celetista", "Transações", "Outro"
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type TipoChamado = "bug" | "melhoria" | "solicitacao";

const TIPO_CONFIG = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500", bg: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" },
  melhoria: { label: "Melhoria", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" },
  solicitacao: { label: "Solicitação", icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800" },
};

interface ClienteData {
  nome: string;
  telefone: string;
  empresa: string;
  rdConversaId?: string;
}

// Tenta ler dados injetados pelo RD Conversas via postMessage ou URL params
function useRDClienteData(): ClienteData {
  const [cliente, setCliente] = useState<ClienteData>({
    nome: "", telefone: "", empresa: "", rdConversaId: "",
  });

  useEffect(() => {
    // 1. Tenta via URL params (quando o RD abre o widget com dados na URL)
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Partial<ClienteData> = {
      nome: params.get("nome") ?? "",
      telefone: params.get("telefone") ?? "",
      empresa: params.get("empresa") ?? "",
      rdConversaId: params.get("conversa_id") ?? "",
    };
    if (fromUrl.nome || fromUrl.telefone) {
      setCliente(fromUrl as ClienteData);
      return;
    }

    // 2. Tenta via postMessage (quando o RD injeta dados via iframe)
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "rd_conversa_dados") {
        setCliente({
          nome: event.data.cliente_nome ?? "",
          telefone: event.data.cliente_telefone ?? "",
          empresa: event.data.cliente_empresa ?? "",
          rdConversaId: event.data.conversa_id ?? "",
        });
      }
    };
    window.addEventListener("message", handler);

    // 3. Solicita dados ao RD (caso esteja em iframe)
    window.parent.postMessage({ type: "rd_widget_ready" }, "*");

    return () => window.removeEventListener("message", handler);
  }, []);

  return cliente;
}

const RDWidget = () => {
  const cliente = useRDClienteData();

  const [tipo, setTipo] = useState<TipoChamado>("bug");
  const [modulo, setModulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [empresaAfetada, setEmpresaAfetada] = useState("");
  const [loginAfetado, setLoginAfetado] = useState("");
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chamadoCriado, setChamadoCriado] = useState<{ jira_key: string; id: string } | null>(null);
  const [chamadoExistente, setChamadoExistente] = useState<any | null>(null);
  const [verificando, setVerificando] = useState(false);

  // Preenche empresa com dados do cliente quando disponíveis
  useEffect(() => {
    if (cliente.empresa && !empresaAfetada) setEmpresaAfetada(cliente.empresa);
    if (cliente.nome && !solicitanteNome) setSolicitanteNome(cliente.nome);
  }, [cliente]);

  // Verifica chamados abertos para este cliente ao carregar
  useEffect(() => {
    const verificar = async () => {
      if (!cliente.telefone && !cliente.empresa) return;
      setVerificando(true);
      try {
        let query = supabase
          .from("chamados")
          .select("id, titulo, status_jira, jira_key, created_at")
          .neq("status_jira", "Concluído")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cliente.empresa) query = query.ilike("empresa_afetada", `%${cliente.empresa}%`);
        else if (cliente.telefone) query = query.eq("cliente_telefone", cliente.telefone);

        const { data } = await query;
        if (data?.length) setChamadoExistente(data[0]);
      } finally {
        setVerificando(false);
      }
    };
    verificar();
  }, [cliente]);

  const handleSubmit = async () => {
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return; }
    if (tipo === "bug" && (!empresaAfetada.trim() || !loginAfetado.trim())) {
      toast.error("Empresa e login afetados são obrigatórios para bugs"); return;
    }
    if (tipo !== "bug" && !solicitanteNome.trim()) {
      toast.error("Nome do solicitante é obrigatório"); return;
    }

    setIsFormatting(true);
    let titulo = `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`;
    let descFormatada = descricao;
    let prioridade = tipo === "bug" ? "High" : "Medium";

    try {
      // Tenta formatar com IA
      const res = await fetch(`${SUPABASE_URL}/functions/v1/format-chamado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao, tipo, modulo,
          empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
          login_afetado: tipo === "bug" ? loginAfetado : undefined,
          solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
        }),
      });
      if (res.ok) {
        const aiData = await res.json();
        titulo = aiData.titulo ?? titulo;
        descFormatada = aiData.descricao_formatada ?? descFormatada;
        prioridade = aiData.prioridade ?? prioridade;
        if (aiData.modulo_inferido && !modulo) setModulo(aiData.modulo_inferido);
      }
    } catch { /* usa fallback */ }
    setIsFormatting(false);

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Cria chamado no banco
      const { data: chamado, error } = await supabase
        .from("chamados")
        .insert({
          tipo,
          titulo,
          descricao: descFormatada,
          modulo: modulo || null,
          relator_nome: session?.user?.email ?? "Suporte",
          aberto_por_email: session?.user?.email ?? null,
          prioridade,
          origem: "rd_conversas",
          cliente_nome: cliente.nome || null,
          cliente_telefone: cliente.telefone || null,
          cliente_empresa: cliente.empresa || null,
          rd_conversa_id: cliente.rdConversaId || null,
          empresa_afetada: tipo === "bug" ? empresaAfetada : null,
          login_afetado: tipo === "bug" ? loginAfetado : null,
          solicitante_nome: tipo !== "bug" ? solicitanteNome : null,
          status_jira: "Aberto",
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Busca credenciais Jira de suporte/gestor
      const { data: usuario } = await supabase
        .from("mapeamento_usuarios")
        .select("jira_email, jira_api_token, nome")
        .in("tipo", ["suporte", "gestor"])
        .eq("ativo", true)
        .not("jira_email", "is", null)
        .not("jira_api_token", "is", null)
        .limit(1)
        .single();

      if (usuario?.jira_email && usuario?.jira_api_token) {
        const { data: jiraData } = await supabase.functions.invoke("create-jira-issue", {
          body: {
            titulo, descricao: descFormatada, tipo,
            relator_nome: usuario.nome,
            jira_email: usuario.jira_email,
            jira_api_token: usuario.jira_api_token,
            modulo: modulo || null,
            empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
            login_afetado: tipo === "bug" ? loginAfetado : undefined,
            solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
          },
        });

        if (jiraData?.jira_key) {
          await supabase.from("chamados").update({ jira_key: jiraData.jira_key }).eq("id", chamado.id);
          setChamadoCriado({ jira_key: jiraData.jira_key, id: chamado.id });
        } else {
          setChamadoCriado({ jira_key: "", id: chamado.id });
        }
      } else {
        setChamadoCriado({ jira_key: "", id: chamado.id });
      }

      // Atualiza rd_conversas se tiver conversa_id
      if (cliente.rdConversaId) {
        await supabase
          .from("rd_conversas")
          .update({ chamado_id: chamado.id, status: "chamado_criado" })
          .eq("rd_conversa_id", cliente.rdConversaId);
      }

      // Notifica o RD que o chamado foi criado
      window.parent.postMessage({
        type: "rd_chamado_criado",
        chamado_id: chamado.id,
        jira_key: chamadoCriado?.jira_key,
      }, "*");

    } catch (err: any) {
      toast.error(`Erro ao criar chamado: ${err?.message ?? "erro desconhecido"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tela de sucesso
  if (chamadoCriado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 max-w-xs"
        >
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Chamado criado!</h2>
          {chamadoCriado.jira_key && (
            <a
              href={`https://datweb.atlassian.net/browse/${chamadoCriado.jira_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-mono hover:underline block"
            >
              {chamadoCriado.jira_key} →
            </a>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setChamadoCriado(null);
              setDescricao("");
              setEmpresaAfetada(cliente.empresa || "");
              setLoginAfetado("");
              setSolicitanteNome(cliente.nome || "");
              setModulo("");
            }}
          >
            Novo chamado
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="space-y-3 max-w-sm mx-auto">

        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">PromoBank</h1>
          <span className="text-xs text-muted-foreground">via RD Conversas</span>
        </div>

        {/* Dados do cliente (lidos do RD) */}
        {(cliente.nome || cliente.telefone || cliente.empresa) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-medium text-primary mb-2">Cliente identificado</p>
              {cliente.nome && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {cliente.nome}
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {cliente.telefone}
                </div>
              )}
              {cliente.empresa && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  {cliente.empresa}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chamado em aberto para este cliente */}
        {verificando && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando chamados em aberto...
          </div>
        )}
        {chamadoExistente && !verificando && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                    Chamado em aberto encontrado
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 line-clamp-2">
                    {chamadoExistente.titulo}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs h-4">
                      {chamadoExistente.status_jira ?? "Aberto"}
                    </Badge>
                    {chamadoExistente.jira_key && (
                      <a
                        href={`https://datweb.atlassian.net/browse/${chamadoExistente.jira_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-mono"
                      >
                        {chamadoExistente.jira_key}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tipo */}
        <div className="grid grid-cols-3 gap-2">
          {(["bug", "melhoria", "solicitacao"] as TipoChamado[]).map((t) => {
            const Icon = TIPO_CONFIG[t].icon;
            const active = tipo === t;
            return (
              <button
                key={t}
                onClick={() => { setTipo(t); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs font-medium
                  ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : TIPO_CONFIG[t].color}`} />
                {TIPO_CONFIG[t].label}
              </button>
            );
          })}
        </div>

        {/* Módulo */}
        <Select value={modulo} onValueChange={setModulo}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Módulo (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {MODULOS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Campos dinâmicos por tipo */}
        <AnimatePresence mode="wait">
          {tipo === "bug" && (
            <motion.div
              key="bug"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="space-y-1">
                <Label className="text-xs">Empresa afetada <span className="text-destructive">*</span></Label>
                <Input
                  className="h-8 text-xs"
                  value={empresaAfetada}
                  onChange={(e) => setEmpresaAfetada(e.target.value)}
                  placeholder="Nome da empresa/franquia"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Login afetado <span className="text-destructive">*</span></Label>
                <Input
                  className="h-8 text-xs"
                  value={loginAfetado}
                  onChange={(e) => setLoginAfetado(e.target.value)}
                  placeholder="Login com problema"
                />
              </div>
            </motion.div>
          )}
          {(tipo === "melhoria" || tipo === "solicitacao") && (
            <motion.div
              key="solicitante"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-1">
                <Label className="text-xs">Solicitante <span className="text-destructive">*</span></Label>
                <Input
                  className="h-8 text-xs"
                  value={solicitanteNome}
                  onChange={(e) => setSolicitanteNome(e.target.value)}
                  placeholder="Nome do solicitante"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Descrição */}
        <div className="space-y-1">
          <Label className="text-xs">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            className="text-xs min-h-[100px] resize-none"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o problema ou solicitação..."
          />
        </div>

        {/* Botão */}
        <Button
          onClick={handleSubmit}
          disabled={isFormatting || isSubmitting || !descricao.trim()}
          className="w-full gap-2"
          size="sm"
        >
          {(isFormatting || isSubmitting) ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isFormatting ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {isFormatting ? "Formatando com IA..." : isSubmitting ? "Criando chamado..." : "Criar Chamado"}
        </Button>
      </div>
    </div>
  );
};

export default RDWidget;
