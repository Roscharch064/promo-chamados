import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChamados } from "@/hooks/usePromoBank";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ExternalLink, Pencil, Trash2, ChevronDown, ChevronUp, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS = [
  "Aberto",
  "Em Atendimento",
  "Aguardando Suporte",
  "Aguardando Desenvolvimento",
  "Concluído",
];

const STATUS_COLORS: Record<string, string> = {
  "Aberto": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Em Atendimento": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Aguardando Suporte": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Aguardando Desenvolvimento": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Concluído": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const ListaChamados = () => {
  const { data: chamados, isLoading, refetch, isFetching } = useChamados();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    titulo: string;
    status_jira: string;
    responsavel_nome: string;
  }>({ titulo: "", status_jira: "Aberto", responsavel_nome: "" });

  const openEdit = (c: any) => {
    setEditForm({
      titulo: c.titulo,
      status_jira: c.status_jira ?? "Aberto",
      responsavel_nome: c.responsavel_nome ?? "",
    });
    setEditingId(c.id);
  };

  const handleStatusChange = async (chamadoId: string, novoStatus: string, jiraKey: string | null) => {
    setUpdatingStatusId(chamadoId);
    try {
      const { error: supabaseError } = await supabase
        .from("chamados")
        .update({ status_jira: novoStatus, updated_at: new Date().toISOString() })
        .eq("id", chamadoId);

      if (supabaseError) throw supabaseError;

      if (jiraKey) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/update-jira-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ chamado_id: chamadoId, novo_status: novoStatus }),
        });

        const result = await res.json();

        if (!res.ok) {
          console.warn("Falha ao sincronizar com Jira:", result);
          toast.warning(`Status atualizado no app, mas falhou no Jira: ${result.error ?? "erro desconhecido"}`);
        } else {
          toast.success(`Status atualizado para "${novoStatus}" no app e no Jira ✓`);
        }
      } else {
        toast.success(`Status atualizado para "${novoStatus}"`);
      }

      qc.invalidateQueries({ queryKey: ["chamados"] });
    } catch (err: any) {
      toast.error(`Erro ao atualizar status: ${err?.message ?? "erro desconhecido"}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const chamado = chamados?.find((c) => c.id === editingId);

    if (chamado && chamado.status_jira !== editForm.status_jira) {
      await handleStatusChange(editingId, editForm.status_jira, chamado.jira_key);
    }

    const { error } = await supabase
      .from("chamados")
      .update({
        titulo: editForm.titulo,
        responsavel_nome: editForm.responsavel_nome || null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Chamado atualizado!");
      qc.invalidateQueries({ queryKey: ["chamados"] });
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("chamados").delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir chamado");
    } else {
      toast.success("Chamado excluído!");
      qc.invalidateQueries({ queryKey: ["chamados"] });
    }
    setDeletingId(null);
  };

  const handleManualRefresh = async () => {
    await refetch();
    toast.success("Chamados atualizados!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chamados</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {chamados?.length ?? 0} chamados registrados
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isFetching}
          className="flex items-center gap-2"
          title="Sincronizar com Jira"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {!chamados?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Nenhum chamado ainda</p>
            <p className="text-sm mt-1">Crie o primeiro chamado na aba "Novo Chamado"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chamados.map((c, i) => {
            const isExpanded = expandedId === c.id;
            const comentarios = Array.isArray(c.comentarios) ? c.comentarios : [];
            const isUpdatingStatus = updatingStatusId === c.id;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={
                            c.tipo === "bug" ? "destructive" :
                            c.tipo === "melhoria" ? "default" : "secondary"
                          } className="text-xs">
                            {c.tipo === "bug" ? "Bug" : c.tipo === "melhoria" ? "Melhoria" : "Solicitação"}
                          </Badge>
                          {c.modulo && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {c.modulo}
                            </span>
                          )}

                          {isUpdatingStatus ? (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Atualizando...
                            </span>
                          ) : (
                            <Select
                              value={c.status_jira ?? "Aberto"}
                              onValueChange={(v) => handleStatusChange(c.id, v, c.jira_key)}
                              disabled={isUpdatingStatus}
                            >
                              <SelectTrigger className="h-auto border-0 shadow-none p-0 focus:ring-0 focus:ring-offset-0 bg-transparent w-auto">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[c.status_jira ?? "Aberto"] ?? "bg-muted text-muted-foreground"}`}>
                                  {c.status_jira ?? "Aberto"}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s]}`}>
                                      {s}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <h3 className="font-semibold text-foreground text-sm truncate">{c.titulo}</h3>

                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-1">
                          <span>Relator: {c.relator_nome}</span>
                          {c.responsavel_nome && <span>• Responsável: {c.responsavel_nome}</span>}
                          <span>• {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {c.jira_key && (
                          <a
                            href={`https://datweb.atlassian.net/browse/${c.jira_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-mono"
                          >
                            {c.jira_key}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            title="Ver detalhes"
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(c)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(c.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-border space-y-3"
                      >
                        {c.descricao && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                              {c.descricao}
                            </p>
                          </div>
                        )}

                        {comentarios.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Comentários ({comentarios.length})
                            </p>
                            <div className="space-y-2">
                              {comentarios.map((com: any, ci: number) => (
                                <div key={ci} className="bg-muted/50 p-3 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-foreground">{com.autor}</span>
                                    <span className="text-xs text-muted-foreground">{com.data}</span>
                                  </div>
                                  <p className="text-sm text-foreground">{com.texto}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {comentarios.length === 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Sem comentários ainda. Os comentários do Jira aparecerão aqui após sincronização.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={editForm.titulo}
                onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status_jira}
                onValueChange={(v) => setEditForm({ ...editForm, status_jira: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={editForm.responsavel_nome}
                onChange={(e) => setEditForm({ ...editForm, responsavel_nome: e.target.value })}
                placeholder="Nome do responsável pelo chamado"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O chamado será removido do sistema,
              mas a issue no Jira permanecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ListaChamados;
