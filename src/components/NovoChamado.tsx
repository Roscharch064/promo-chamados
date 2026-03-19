import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChamado, useUsuarios } from "@/hooks/usePromoBank";
import { Sparkles, Loader2, Send, Bug, Lightbulb, ClipboardList, Paperclip, X, FileText, Image, Film, Sheet } from "lucide-react";
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
  bug: { label: "Bug", icon: Bug, color: "text-red-500", descPlaceholder: "Descreva o problema encontrado com o máximo de detalhes..." },
  melhoria: { label: "Melhoria", icon: Lightbulb, color: "text-yellow-500", descPlaceholder: "Descreva a melhoria que deseja ver no sistema..." },
  solicitacao: { label: "Solicitação", icon: ClipboardList, color: "text-blue-500", descPlaceholder: "Descreva o que está sendo solicitado..." },
};

const FILE_ICONS: Record<string, any> = {
  image: Image,
  video: Film,
  pdf: FileText,
  excel: Sheet,
  word: FileText,
  default: FileText,
};

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return FILE_ICONS.image;
  if (type.startsWith("video/")) return FILE_ICONS.video;
  if (type === "application/pdf") return FILE_ICONS.pdf;
  if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv") return FILE_ICONS.excel;
  if (type.includes("word") || type.includes("document")) return FILE_ICONS.word;
  return FILE_ICONS.default;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Evidencia {
  file: File;
  preview?: string;
  uploading?: boolean;
  error?: string;
}

const NovoChamado = ({ onSuccess }: NovoChamadoProps) => {
  const [tipo, setTipo] = useState<TipoChamado>("bug");
  const [modulo, setModulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [relatorId, setRelatorId] = useState("");
  const [empresaAfetada, setEmpresaAfetada] = useState("");
  const [loginAfetado, setLoginAfetado] = useState("");
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{ titulo: string; descricaoFormatada: string; prioridade: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createChamado = useCreateChamado();
  const { data: usuarios } = useUsuarios();

  const handleTipoChange = (novoTipo: TipoChamado) => {
    setTipo(novoTipo);
    setAiResult(null);
    setEmpresaAfetada("");
    setLoginAfetado("");
    setSolicitanteNome("");
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    const novos: Evidencia[] = [];

    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} é muito grande (máx 100 MB)`);
        return;
      }
      const evidencia: Evidencia = { file };
      if (file.type.startsWith("image/")) {
        evidencia.preview = URL.createObjectURL(file);
      }
      novos.push(evidencia);
    });

    setEvidencias(prev => [...prev, ...novos]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeEvidencia = (index: number) => {
    setEvidencias(prev => {
      const nova = [...prev];
      if (nova[index].preview) URL.revokeObjectURL(nova[index].preview!);
      nova.splice(index, 1);
      return nova;
    });
  };

  const validarCampos = (): boolean => {
    if (!relatorId) { toast.error("Selecione quem está relatando o chamado"); return false; }
    if (!descricao.trim()) { toast.error("Preencha a descrição"); return false; }
    if (tipo === "bug") {
      if (!empresaAfetada.trim()) { toast.error("Informe a empresa afetada"); return false; }
      if (!loginAfetado.trim()) { toast.error("Informe o login afetado"); return false; }
    }
    if ((tipo === "melhoria" || tipo === "solicitacao") && !solicitanteNome.trim()) {
      toast.error("Informe o nome do solicitante"); return false;
    }
    return true;
  };

  const handleAIFormat = async () => {
    if (!validarCampos()) return;
    setIsProcessing(true);
    try {
      // Passa os nomes dos arquivos selecionados para a IA incluir na seção de evidências
      // As URLs reais virão após o upload — por agora a IA recebe os nomes como placeholder
      const evidenciasParaIA = evidencias.map(ev => ({
        nome: ev.file.name,
        url: "#pendente-upload",
        tipo: ev.file.type,
      }));

      const { data, error } = await supabase.functions.invoke("format-chamado", {
        body: {
          descricao, tipo, modulo,
          empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
          login_afetado: tipo === "bug" ? loginAfetado : undefined,
          solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
          evidencias: evidenciasParaIA.length > 0 ? evidenciasParaIA : undefined,
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
    } catch {
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

  const uploadEvidencias = async (chamadoId: string): Promise<Array<{ nome: string; url: string; tipo: string; tamanho: number }>> => {
    const resultados = [];
    for (let i = 0; i < evidencias.length; i++) {
      const ev = evidencias[i];
      setEvidencias(prev => prev.map((e, idx) => idx === i ? { ...e, uploading: true } : e));
      try {
        const ext = ev.file.name.split(".").pop();
        const path = `${chamadoId}/${Date.now()}_${ev.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("evidencias").upload(path, ev.file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
        resultados.push({
          nome: ev.file.name,
          url: urlData.publicUrl,
          tipo: ev.file.type,
          tamanho: ev.file.size,
          path,
        });
        setEvidencias(prev => prev.map((e, idx) => idx === i ? { ...e, uploading: false } : e));
      } catch (err: any) {
        setEvidencias(prev => prev.map((e, idx) => idx === i ? { ...e, uploading: false, error: err.message } : e));
        toast.error(`Erro ao enviar ${ev.file.name}`);
      }
    }
    return resultados;
  };

  const handleSubmit = async () => {
    const relator = usuarios?.find(u => u.id === relatorId);
    if (!relator) { toast.error("Selecione o relator"); return; }

    const titulo = aiResult?.titulo ?? `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`;
    const descFormatada = aiResult?.descricaoFormatada ?? descricao;
    const prioridade = aiResult?.prioridade ?? "Medium";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const emailLogado = session?.user?.email ?? null;

      // 1. Faz upload das evidências primeiro para ter as URLs
      let evidenciasData: any[] = [];
      const chamadoTemp = await createChamado.mutateAsync({
        tipo,
        titulo: `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`, // título provisório
        descricao,
        modulo: modulo || null,
        relator_nome: relator.nome,
        relator_account_id: relator.account_id_jira,
        aberto_por_email: emailLogado,
        prioridade: "Medium",
        origem: "app_direto",
        empresa_afetada: tipo === "bug" ? empresaAfetada || null : null,
        login_afetado: tipo === "bug" ? loginAfetado || null : null,
        solicitante_nome: tipo !== "bug" ? solicitanteNome || null : null,
      } as any);

      if (evidencias.length > 0) {
        toast.info("Enviando evidências...");
        evidenciasData = await uploadEvidencias(chamadoTemp.id);
        if (evidenciasData.length > 0) {
          await supabase.from("chamados").update({ evidencias: evidenciasData }).eq("id", chamadoTemp.id);
        }
      }

      // 2. Formata com IA passando as evidências já com URLs
      const titulo = aiResult?.titulo ?? `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`;
      const prioridade = aiResult?.prioridade ?? "Medium";

      // Substitui os placeholders "#pendente-upload" pelas URLs reais das evidências
      let descFormatada = aiResult?.descricaoFormatada ?? descricao;
      if (evidenciasData.length > 0) {
        evidenciasData.forEach((ev: any) => {
          descFormatada = descFormatada.replace(
            `[${ev.nome}](#pendente-upload)`,
            `[${ev.nome}](${ev.url})`
          );
        });
        // Fallback: se não encontrou placeholder, adiciona seção no final
        if (descFormatada.includes("#pendente-upload")) {
          const linksEvidencias = evidenciasData.map((ev: any) => `- [${ev.nome}](${ev.url})`).join("\n");
          descFormatada = descFormatada.replace(/#pendente-upload/g, evidenciasData[0]?.url ?? "#");
        }
      }

      // 3. Atualiza o chamado com título e descrição finais
      await supabase.from("chamados").update({
        titulo,
        descricao: descFormatada,
        prioridade,
        status_jira: "Aberto",
      }).eq("id", chamadoTemp.id);

      const chamado = { ...chamadoTemp, id: chamadoTemp.id };

      // Cria issue no Jira
      if (relator.jira_email && relator.jira_api_token) {
        try {
          const { data: jiraData, error: jiraError } = await supabase.functions.invoke("create-jira-issue", {
            body: {
              titulo, descricao: descFormatada, tipo,
              relator_nome: relator.nome,
              relator_account_id: relator.account_id_jira,
              jira_email: relator.jira_email,
              jira_api_token: relator.jira_api_token,
              modulo: modulo || null,
              empresa_afetada: tipo === "bug" ? empresaAfetada : undefined,
              login_afetado: tipo === "bug" ? loginAfetado : undefined,
              solicitante_nome: tipo !== "bug" ? solicitanteNome : undefined,
              // Passa as evidências já uploadadas para serem adicionadas como comentário no Jira
              evidencias: evidenciasData.length > 0 ? evidenciasData : undefined,
            },
          });
          if (jiraError) throw jiraError;
          if (jiraData?.jira_key) {
            await supabase.from("chamados").update({ jira_key: jiraData.jira_key, status_jira: "Aberto" }).eq("id", chamado.id);
            toast.success(`Chamado criado! Issue ${jiraData.jira_key} aberta no Jira${evidenciasData.length > 0 ? ` com ${evidenciasData.length} evidência(s)` : ""}.`);
          }
        } catch {
          toast.warning("Chamado criado, mas houve erro ao abrir issue no Jira");
        }
      } else {
        toast.success(`Chamado criado${evidenciasData.length > 0 ? ` com ${evidenciasData.length} evidência(s)` : ""}!`);
      }

      // Reset
      setDescricao(""); setAiResult(null); setModulo(""); setRelatorId("");
      setEmpresaAfetada(""); setLoginAfetado(""); setSolicitanteNome("");
      setEvidencias([]);
      onSuccess?.();
    } catch {
      toast.error("Erro ao criar chamado");
    }
  };

  const TipoIcon = TIPO_CONFIG[tipo].icon;
  const isDragging = false;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Novo Chamado</h2>
        <p className="text-muted-foreground text-sm mt-1">Preencha os campos e a IA formatará automaticamente para o Jira</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["bug", "melhoria", "solicitacao"] as TipoChamado[]).map(t => {
                  const Icon = TIPO_CONFIG[t].icon;
                  return (
                    <button key={t} onClick={() => handleTipoChange(t)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium
                        ${tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
                      <Icon className={`h-4 w-4 ${tipo === t ? "text-primary" : TIPO_CONFIG[t].color}`} />
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
                <SelectContent>{MODULOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Relator */}
            <div className="space-y-2">
              <Label>Relator</Label>
              <Select value={relatorId} onValueChange={setRelatorId}>
                <SelectTrigger><SelectValue placeholder="Quem está relatando?" /></SelectTrigger>
                <SelectContent>{usuarios?.map(u => <SelectItem key={u.id} value={u.id}>{u.nome} ({u.tipo})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Campos dinâmicos */}
            <AnimatePresence mode="wait">
              {tipo === "bug" && (
                <motion.div key="bug" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Empresa afetada <span className="text-destructive">*</span></Label>
                    <Input value={empresaAfetada} onChange={e => setEmpresaAfetada(e.target.value)} placeholder="Nome da empresa/franquia" />
                  </div>
                  <div className="space-y-2">
                    <Label>Login afetado <span className="text-destructive">*</span></Label>
                    <Input value={loginAfetado} onChange={e => setLoginAfetado(e.target.value)} placeholder="Login/usuário com problema" />
                  </div>
                </motion.div>
              )}
              {(tipo === "melhoria" || tipo === "solicitacao") && (
                <motion.div key="sol" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="space-y-2">
                    <Label>Solicitante <span className="text-destructive">*</span></Label>
                    <Input value={solicitanteNome} onChange={e => setSolicitanteNome(e.target.value)} placeholder="Nome de quem está solicitando" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição <span className="text-destructive">*</span></Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder={TIPO_CONFIG[tipo].descPlaceholder} className="min-h-[120px] resize-none" />
            </div>

            {/* Evidências */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Evidências
                <span className="text-xs text-muted-foreground font-normal">(fotos, vídeos, docs, planilhas — máx 100 MB cada)</span>
              </Label>

              {/* Zona de drop */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Paperclip className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Arraste arquivos aqui ou <span className="text-primary font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Imagens, vídeos, PDF, Word, Excel, CSV
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Lista de arquivos */}
              {evidencias.length > 0 && (
                <div className="space-y-2">
                  {evidencias.map((ev, i) => {
                    const Icon = getFileIcon(ev.file.type);
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        {ev.preview ? (
                          <img src={ev.preview} alt={ev.file.name} className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{ev.file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(ev.file.size)}</p>
                          {ev.error && <p className="text-xs text-destructive">{ev.error}</p>}
                        </div>
                        {ev.uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        ) : (
                          <button onClick={() => removeEvidencia(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleAIFormat} disabled={isProcessing || !descricao.trim()} className="w-full gap-2">
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
                  <Input value={aiResult.titulo} onChange={e => setAiResult({ ...aiResult, titulo: e.target.value })} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Prioridade</Label>
                  <p className="text-sm font-medium text-foreground">{aiResult.prioridade}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Descrição Formatada</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                    {aiResult.descricaoFormatada}
                  </p>
                </div>
                {evidencias.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    <Paperclip className="h-3.5 w-3.5" />
                    {evidencias.length} evidência(s) serão anexadas
                  </div>
                )}
                <Button onClick={handleSubmit} disabled={createChamado.isPending} className="w-full gap-2">
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
