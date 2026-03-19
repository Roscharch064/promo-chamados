import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChamado, useUsuarios } from "@/hooks/usePromoBank";
import { Sparkles, Loader2, Send, Bug, Lightbulb, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MODULOS = [
  "Login", "Cadastros", "Consultas", "Relatórios", "Dashboard",
  "Campanhas", "FGTS", "SIAPE", "INSS", "Celetista", "Transações", "Outro"
];

interface NovoChamadoProps {
  onSuccess?: () => void;
}

type TipoChamado = "bug" | "melhoria" | "solicitacao";

const TIPO_CONFIG = {
  bug: {
    label: "Bug",
    icon: Bug,
    color: "text-red-500",
    descPlaceholder: "Descreva o problema encontrado com o máximo de detalhes...",
  },
  melhoria: {
    label: "Melhoria",
    icon: Lightbulb,
    color: "text-yellow-500",
    descPlaceholder: "Descreva a melhoria que deseja ver no sistema...",
  },
  solicitacao: {
    label: "Solicitação",
    icon: ClipboardList,
    color: "text-blue-500",
    descPlaceholder: "Descreva o que está sendo solicitado...",
  },
};

const NovoChamado = ({ onSuccess }: NovoChamadoProps) => {
  const [tipo, setTipo] = useState<TipoChamado>("bug");
  const [modulo, setModulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [relatorId, setRelatorId] = useState("");

  // Campos específicos por tipo
  const [empresaAfetada, setEmpresaAfetada] = useState("");
  const [loginAfetado, setLoginAfetado] = useState("");
  const [solicitanteNome, setSolicitanteNome] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    titulo: string;
    descricaoFormatada: string;
    prioridade: string;
  } | null>(null);

  const createChamado = useCreateChamado();
  const { data: usuarios } = useUsuarios();

  const handleTipoChange = (novoTipo: TipoChamado) => {
    setTipo(novoTipo);
    setAiResult(null);
    setEmpresaAfetada("");
    setLoginAfetado("");
    setSolicitanteNome("");
  };

  const validarCampos = (): boolean => {
    if (!relatorId) { toast.error("Selecione quem está relatando o chamado"); return false; }
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return false; }
    if (tipo === "bug") {
      if (!empresaAfetada.trim()) { toast.error("Informe a empresa afetada"); return false; }
      if (!loginAfetado.trim()) { toast.error("Informe o login afetado"); return false; }
    }
    if (tipo === "melhoria" || tipo === "solicitacao") {
      if (!solicitanteNome.trim()) { toast.error("Informe o nome do solicitante"); return false; }
    }
    return true;
  };

  const handleAIFormat = async () => {
    if (!validarCampos()) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("format-chamado", {
        body: {
          descricao,
          tipo,
          modulo,
          empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
          login_afetado: tipo === "bug" ? loginAfetado : undefined,
          solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
        },
      });
      if (error) throw error;
      setAiResult({
        titulo: data.titulo,
        descricaoFormatada: data.descricao_formatada || descricao,
        prioridade: data.prioridade || "Medium",
      });
      if (data.modulo_inferido && !modulo) setModulo(data.modulo_inferido);
      toast.success("Chamado formatado pela IA!");
    } catch (err) {
      console.error(err);
      setAiResult({
        titulo: `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`,
        descricaoFormatada: descricao,
        prioridade: tipo === "bug" ? "High" : "Medium",
      });
      toast.info("Formatação local aplicada (IA indisponível)");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const relator = usuarios?.find((u) => u.id === relatorId);
    if (!relator) { toast.error("Selecione o relator"); return; }

    const titulo = aiResult?.titulo ?? `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`;
    const descFormatada = aiResult?.descricaoFormatada ?? descricao;
    const prioridade = aiResult?.prioridade ?? "Medium";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const emailLogado = session?.user?.email ?? relator.email ?? null;

      const chamado = await createChamado.mutateAsync({
        tipo,
        titulo,
        descricao: descFormatada,
        modulo: modulo || null,
        relator_nome: relator.nome,
        relator_account_id: relator.account_id_jira,
        aberto_por_email: emailLogado,
        prioridade,
        origem: "app_direto",
        empresa_afetada: tipo === "bug" ? empresaAfetada || null : null,
        login_afetado: tipo === "bug" ? loginAfetado || null : null,
        solicitante_nome: tipo !== "bug" ? solicitanteNome || null : null,
      } as any);

      if (relator.jira_email && relator.jira_api_token) {
        try {
          const { data: jiraData, error: jiraError } = await supabase.functions.invoke("create-jira-issue", {
            body: {
              titulo,
              descricao: descFormatada,
              tipo,
              relator_nome: relator.nome,
              relator_account_id: relator.account_id_jira,
              jira_email: relator.jira_email,
              jira_api_token: relator.jira_api_token,
              modulo: modulo || null,
              empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
              login_afetado: tipo === "bug" ? loginAfetado : undefined,
              solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
            },
          });

          if (jiraError) throw jiraError;

          if (jiraData?.jira_key) {
            await supabase
              .from("chamados")
              .update({ jira_key: jiraData.jira_key, status_jira: "Aberto" })
              .eq("id", chamado.id);
            toast.success(`Chamado criado e issue ${jiraData.jira_key} aberta no Jira!`);
          }
        } catch (jiraErr) {
          console.error("Erro ao criar issue no Jira:", jiraErr);
          toast.warning("Chamado criado, mas houve erro ao abrir issue no Jira");
        }
      } else {
        toast.success("Chamado criado!");
      }

      // Reset
      setDescricao("");
      setAiResult(null);
      setModulo("");
      setRelatorId("");
      setEmpresaAfetada("");
      setLoginAfetado("");
      setSolicitanteNome("");
      onSuccess?.();
    } catch {
      toast.error("Erro ao criar chamado");
    }
  };

  const TipoIcon = TIPO_CONFIG[tipo].icon;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Novo Chamado</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha os campos e a IA formatará automaticamente para o Jira
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Tipo — botões visuais */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["bug", "melhoria", "solicitacao"] as TipoChamado[]).map((t) => {
                  const Icon = TIPO_CONFIG[t].icon;
                  const active = tipo === t;
                  return (
                    <button
                      key={t}
                      onClick={() => handleTipoChange(t)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium
                        ${active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-primary" : TIPO_CONFIG[t].color}`} />
                      {TIPO_CONFIG[t].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Módulo */}
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={modulo} onValueChange={setModulo}>
                <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                <SelectContent>
                  {MODULOS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Relator */}
            <div className="space-y-2">
              <Label>Relator</Label>
              <Select value={relatorId} onValueChange={setRelatorId}>
                <SelectTrigger><SelectValue placeholder="Quem está relatando?" /></SelectTrigger>
                <SelectContent>
                  {usuarios?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} ({u.tipo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos dinâmicos por tipo */}
            <AnimatePresence mode="wait">
              {tipo === "bug" && (
                <motion.div
                  key="bug-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label>
                      Empresa afetada <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={empresaAfetada}
                      onChange={(e) => setEmpresaAfetada(e.target.value)}
                      placeholder="Nome da empresa/franquia afetada"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Login afetado <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={loginAfetado}
                      onChange={(e) => setLoginAfetado(e.target.value)}
                      placeholder="Login/usuário com problema"
                    />
                  </div>
                </motion.div>
              )}

              {(tipo === "melhoria" || tipo === "solicitacao") && (
                <motion.div
                  key="solicitante-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="space-y-2">
                    <Label>
                      Solicitante <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={solicitanteNome}
                      onChange={(e) => setSolicitanteNome(e.target.value)}
                      placeholder="Nome de quem está solicitando"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição <span className="text-destructive">*</span></Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={TIPO_CONFIG[tipo].descPlaceholder}
                className="min-h-[130px] resize-none"
              />
            </div>

            <Button
              onClick={handleAIFormat}
              disabled={isProcessing || !descricao.trim()}
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isProcessing ? "Processando com IA..." : "Formatar com IA"}
            </Button>
          </CardContent>
        </Card>

        {/* Prévia */}
        <Card className={aiResult ? "border-primary/50 shadow-lg" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Prévia do Chamado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiResult ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Título</Label>
                  <Input
                    value={aiResult.titulo}
                    onChange={(e) => setAiResult({ ...aiResult, titulo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Prioridade</Label>
                  <p className="text-sm font-medium text-foreground">{aiResult.prioridade}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Descrição Formatada</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg max-h-64 overflow-y-auto">
                    {aiResult.descricaoFormatada}
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={createChamado.isPending}
                  className="w-full gap-2"
                >
                  {createChamado.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Criar Chamado
                </Button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <TipoIcon className={`h-10 w-10 mb-3 opacity-30 ${TIPO_CONFIG[tipo].color}`} />
                <p className="text-sm text-center">
                  Preencha os campos e clique em<br />"Formatar com IA" para visualizar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default NovoChamado;
