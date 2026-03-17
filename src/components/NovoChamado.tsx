import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChamado, useUsuarios } from "@/hooks/usePromoBank";
import { Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChamado, useUsuarios } from "@/hooks/usePromoBank";
import { Sparkles, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const MODULOS = [
  "Login", "Cadastros", "Consultas", "Relatórios", "Dashboard",
  "Campanhas", "FGTS", "Pagamentos", "Configurações", "Outro"
];

interface NovoChamadoProps {
  onSuccess?: () => void;
}

const NovoChamado = ({ onSuccess }: NovoChamadoProps) => {
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"bug" | "melhoria" | "solicitacao">("bug");
  const [modulo, setModulo] = useState("");
  const [relatorId, setRelatorId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    titulo: string;
    descricaoFormatada: string;
    prioridade: string;
  } | null>(null);

  const createChamado = useCreateChamado();
  const { data: usuarios } = useUsuarios();

  const franqueados = usuarios?.filter((u) => u.tipo === "franqueado") ?? [];

  const handleAIFormat = async () => {
    if (!descricao.trim()) {
      toast.error("Descreva o problema antes de formatar com IA");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("format-chamado", {
        body: { descricao, tipo, modulo },
      });
      if (error) throw error;
      setAiResult({
        titulo: data.titulo,
        descricaoFormatada: data.descricao_formatada || descricao,
        prioridade: data.prioridade || "Medium",
      });
      if (data.modulo_inferido && !modulo) {
        setModulo(data.modulo_inferido);
      }
      toast.success("Chamado formatado pela IA!");
    } catch (err) {
      console.error(err);
      // Fallback: format locally
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
    if (!relator) {
      toast.error("Selecione quem está relatando o chamado");
      return;
    }

    const titulo = aiResult?.titulo ?? `[${modulo || "Geral"}]: ${descricao.slice(0, 70)}`;

    try {
      await createChamado.mutateAsync({
        tipo,
        titulo,
        descricao: aiResult?.descricaoFormatada ?? descricao,
        modulo: modulo || null,
        relator_nome: relator.nome,
        relator_account_id: relator.account_id_jira,
        prioridade: aiResult?.prioridade ?? "Medium",
        origem: "app_direto",
      });
      toast.success("Chamado criado com sucesso!");
      setDescricao("");
      setAiResult(null);
      setModulo("");
      setRelatorId("");
      onSuccess?.();
    } catch {
      toast.error("Erro ao criar chamado");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Novo Chamado
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Descreva o problema e a IA formatará automaticamente
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug</SelectItem>
                  <SelectItem value="melhoria">💡 Melhoria</SelectItem>
                  <SelectItem value="solicitacao">📋 Solicitação</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-2">
              <Label>Relator</Label>
              <Select value={relatorId} onValueChange={setRelatorId}>
                <SelectTrigger><SelectValue placeholder="Quem está relatando?" /></SelectTrigger>
                <SelectContent>
                  {franqueados.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome} ({f.tipo})</SelectItem>
                  ))}
                  {usuarios?.filter(u => u.tipo !== "franqueado").map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} ({u.tipo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Problema</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className="min-h-[150px] resize-none"
              />
            </div>

            <Button onClick={handleAIFormat} disabled={isProcessing || !descricao.trim()} className="w-full gap-2">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isProcessing ? "Processando com IA..." : "Formatar com IA"}
            </Button>
          </CardContent>
        </Card>

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
                  <Input value={aiResult.titulo} onChange={(e) => setAiResult({ ...aiResult, titulo: e.target.value })} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Prioridade</Label>
                  <p className="text-sm font-medium text-foreground">{aiResult.prioridade}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Descrição Formatada</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
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
                <Sparkles className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm text-center">
                  Preencha a descrição e clique em<br />"Formatar com IA" para visualizar
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
