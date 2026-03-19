import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChamados } from "@/hooks/usePromoBank";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ExternalLink, Pencil, Trash2, ChevronDown, ChevronUp,
  MessageSquare, RefreshCw, User, Search, X, LayoutList, Columns,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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

const STATUS_HEADER_COLORS: Record<string, string> = {
  "Aberto": "border-blue-400 bg-blue-50 dark:bg-blue-950",
  "Em Atendimento": "border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
  "Aguardando Suporte": "border-orange-400 bg-orange-50 dark:bg-orange-950",
  "Aguardando Desenvolvimento": "border-purple-400 bg-purple-50 dark:bg-purple-950",
  "Concluído": "border-green-400 bg-green-50 dark:bg-green-950",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Card compacto reutilizável
const ChamadoCard = ({
  c, onEdit, onDelete, onStatusChange, onSync, canEdit, isSyncing, isUpdatingStatus,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const comentarios = Array.isArray(c.comentarios) ? c.comentarios : [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Badge
                variant={c.tipo === "bug" ? "destructive" : c.tipo === "melhoria" ? "default" : "secondary"}
                className="text-xs h-4 px-1.5"
              >
                {c.tipo === "bug" ? "Bug" : c.tipo === "melhoria" ? "Melhoria" : "Solicitação"}
              </Badge>
              {c.modulo && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {c.modulo}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-foreground line-clamp-2">{c.titulo}</p>
            <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-1">
              <span className="truncate max-w-[120px]">{c.relator_nome}</span>
              {comentarios.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="h-3 w-3" />{comentarios.length}
                </span>
              )}
              <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {c.jira_key && (
              <a
                href={`https://datweb.atlassian.net/browse/${c.jira_key}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline font-mono flex items-center gap-0.5"
              >
                {c.jira_key}<ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            <div className="flex items-center gap-0.5">
              {c.jira_key && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSync(c.id, c.jira_key)} disabled={isSyncing} title="Sincronizar">
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(c)} title="Editar">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(c.id)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expandido */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-border space-y-2"
          >
            {/* Muda status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              {isUpdatingStatus ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                </span>
              ) : (
                <Select value={c.status_jira ?? "Aberto"} onValueChange={(v) => onStatusChange(c.id, v, c.jira_key)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>{s}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {c.responsavel_nome && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" /> {c.responsavel_nome}
              </div>
            )}
            {c.descricao && (
              <p className="text-xs text-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap line-clamp-4">
                {c.descricao}
              </p>
            )}
            {comentarios.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Comentários ({comentarios.length})</p>
                {comentarios.slice(0, 3).map((com: any, ci: number) => (
                  <div key={ci} className="bg-muted/50 p-2 rounded">
                    <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                      <span className="font-medium">{com.autor}</span>
                      <span>{com.data}</span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{com.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

const ListaChamados = () => {
  const { data: chamados, isLoading, refetch, isFetching } = useChamados();
  const { canEditChamados } = useAuth();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const lastSyncRef = useRef<number>(0);
  const [editForm, setEditForm] = useState({ titulo: "", status_jira: "Aberto", responsavel_nome: "" });

  const chamadosFiltrados = useMemo(() => {
    if (!chamados) return [];
    return chamados.filter(c => {
      const matchTexto = !filtroTexto ||
        c.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (c.relator_nome?.toLowerCase().includes(filtroTexto.toLowerCase())) ||
        (c.jira_key?.toLowerCase().includes(filtroTexto.toLowerCase())) ||
        ((c as any).empresa_afetada?.toLowerCase().includes(filtroTexto.toLowerCase()));
      const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
      return matchTexto && matchTipo;
    });
  }, [chamados, filtroTexto, filtroTipo]);

  // Agrupa por status para kanban
  const kanbanColunas = useMemo(() => {
    return STATUS_OPTIONS.map(status => ({
      status,
      chamados: chamadosFiltrados.filter(c => (c.status_jira ?? "Aberto") === status),
    }));
  }, [chamadosFiltrados]);

  const syncJiraIssue = useCallback(async (chamadoId: string, jiraKey: string | null, silent = false) => {
    if (!jiraKey) return;
    setSyncingId(chamadoId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-jira-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ chamado_id: chamadoId }),
      });
      const result = await res.json();
      if (!res.ok) { if (!silent) toast.error(`Falha ao sincronizar: ${result.error ?? "erro"}`); }
      else { qc.invalidateQueries({ queryKey: ["chamados"] }); if (!silent) toast.success("Sincronizado!"); }
    } catch (err: any) { if (!silent) toast.error(`Erro: ${err?.message}`); }
    finally { setSyncingId(null); }
  }, [qc]);

  const syncAllJiraIssues = useCallback(async (silent = true) => {
    if (!chamados?.length) return;
    const comJira = chamados.filter(c => c.jira_key);
    if (!comJira.length) return;
    setIsSyncingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    await Promise.allSettled(
      comJira.map(c => fetch(`${SUPABASE_URL}/functions/v1/sync-jira-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ chamado_id: c.id }),
      }))
    );
    lastSyncRef.current = Date.now();
    qc.invalidateQueries({ queryKey: ["chamados"] });
    setIsSyncingAll(false);
    if (!silent) toast.success("Chamados sincronizados com o Jira!");
  }, [chamados, qc]);

  useEffect(() => {
    const timer = setInterval(() => syncAllJiraIssues(true), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [syncAllJiraIssues]);

  const handleStatusChange = async (chamadoId: string, novoStatus: string, jiraKey: string | null) => {
    setUpdatingStatusId(chamadoId);
    try {
      const { error } = await supabase.from("chamados").update({ status_jira: novoStatus, updated_at: new Date().toISOString() }).eq("id", chamadoId);
      if (error) throw error;
      if (jiraKey) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/update-jira-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          body: JSON.stringify({ chamado_id: chamadoId, novo_status: novoStatus }),
        });
        const result = await res.json();
        if (!res.ok) toast.warning(`Status atualizado no app, mas falhou no Jira: ${result.error ?? "erro"}`);
        else toast.success(`Status atualizado para "${novoStatus}" ✓`);
      } else toast.success(`Status atualizado para "${novoStatus}"`);
      qc.invalidateQueries({ queryKey: ["chamados"] });
    } catch (err: any) { toast.error(`Erro: ${err?.message}`); }
    finally { setUpdatingStatusId(null); }
  };

  const openEdit = (c: any) => {
    setEditForm({ titulo: c.titulo, status_jira: c.status_jira ?? "Aberto", responsavel_nome: c.responsavel_nome ?? "" });
    setEditingId(c.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const chamado = chamados?.find(c => c.id === editingId);
    if (chamado && chamado.status_jira !== editForm.status_jira) {
      await handleStatusChange(editingId, editForm.status_jira, chamado.jira_key);
    }
    const { error } = await supabase.from("chamados").update({ titulo: editForm.titulo, responsavel_nome: editForm.responsavel_nome || null }).eq("id", editingId);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Chamado atualizado!"); qc.invalidateQueries({ queryKey: ["chamados"] }); setEditingId(null); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("chamados").delete().eq("id", deletingId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Chamado excluído!"); qc.invalidateQueries({ queryKey: ["chamados"] }); }
    setDeletingId(null);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  const temFiltro = filtroTexto || filtroTipo !== "todos";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chamados</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {chamadosFiltrados.length} de {chamados?.length ?? 0} chamados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Alternador de modo */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "lista" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode("lista")}
              title="Modo lista"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8 px-3"
              onClick={() => setViewMode("kanban")}
              title="Modo kanban"
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => syncAllJiraIssues(false)} disabled={isSyncingAll} className="gap-1.5 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
            {isSyncingAll ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Buscar título, relator, chave Jira..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos" className="text-xs">Todos os tipos</SelectItem>
            <SelectItem value="bug" className="text-xs">Bug</SelectItem>
            <SelectItem value="melhoria" className="text-xs">Melhoria</SelectItem>
            <SelectItem value="solicitacao" className="text-xs">Solicitação</SelectItem>
          </SelectContent>
        </Select>
        {temFiltro && (
          <Button variant="ghost" size="sm" onClick={() => { setFiltroTexto(""); setFiltroTipo("todos"); }} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {/* MODO LISTA */}
      <AnimatePresence mode="wait">
        {viewMode === "lista" && (
          <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!chamadosFiltrados.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  {temFiltro ? (
                    <><p className="text-lg font-medium">Nenhum resultado</p><p className="text-sm mt-1">Tente ajustar os filtros</p></>
                  ) : (
                    <><p className="text-lg font-medium">Nenhum chamado ainda</p><p className="text-sm mt-1">Crie o primeiro na aba "Novo Chamado"</p></>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Agrupa por status no modo lista
              <div className="space-y-6">
                {STATUS_OPTIONS.map(status => {
                  const grupo = chamadosFiltrados.filter(c => (c.status_jira ?? "Aberto") === status);
                  if (!grupo.length) return null;
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                        <span className="text-xs text-muted-foreground">{grupo.length} chamado{grupo.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2">
                        {grupo.map((c, i) => (
                          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                            <ChamadoCard
                              c={c}
                              onEdit={openEdit}
                              onDelete={(id: string) => setDeletingId(id)}
                              onStatusChange={handleStatusChange}
                              onSync={syncJiraIssue}
                              canEdit={canEditChamados}
                              isSyncing={syncingId === c.id}
                              isUpdatingStatus={updatingStatusId === c.id}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* MODO KANBAN */}
        {viewMode === "kanban" && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Mobile: scroll horizontal suave com snap. Desktop: grid adaptativo */}
            <div className="
              flex gap-3 pb-4
              overflow-x-auto scroll-smooth snap-x snap-mandatory
              sm:grid sm:grid-cols-2 sm:overflow-x-visible
              lg:grid-cols-3
              xl:grid-cols-5
            ">
              {kanbanColunas.map(({ status, chamados: cols }) => (
                <div key={status} className="flex-shrink-0 w-[80vw] snap-start sm:w-auto">
                  {/* Header da coluna */}
                  <div className={`flex items-center justify-between p-3 rounded-t-lg border-t-2 border-x ${STATUS_HEADER_COLORS[status]}`}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
                      {cols.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className={`border-x border-b rounded-b-lg p-2 space-y-2 min-h-[120px] ${STATUS_HEADER_COLORS[status]} bg-opacity-30`}>
                    {cols.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6 opacity-60">Nenhum chamado</p>
                    )}
                    {cols.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                        <ChamadoCard
                          c={c}
                          onEdit={openEdit}
                          onDelete={(id: string) => setDeletingId(id)}
                          onStatusChange={handleStatusChange}
                          onSync={syncJiraIssue}
                          canEdit={canEditChamados}
                          isSyncing={syncingId === c.id}
                          isUpdatingStatus={updatingStatusId === c.id}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Chamado</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={editForm.titulo} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status_jira} onValueChange={(v) => setEditForm({ ...editForm, status_jira: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={editForm.responsavel_nome} onChange={(e) => setEditForm({ ...editForm, responsavel_nome: e.target.value })} placeholder="Nome do responsável" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O chamado será removido do sistema, mas a issue no Jira permanecerá.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ListaChamados;
