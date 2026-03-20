import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChamados } from "@/hooks/usePromoBank";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  TicketCheck, Bug, Lightbulb, ClipboardList,
  Clock, CheckCircle2, AlertCircle, TrendingUp,
  ExternalLink, MessageSquare, Download, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  "Aberto": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Em Atendimento": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Aguardando Suporte": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Aguardando Solicitante": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Aguardando Desenvolvimento": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Em Backlog de Melhorias": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "Concluído": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const DashboardPanel = () => {
  const { data: chamados, isLoading, refetch } = useChamados();
  const { canEditChamados } = useAuth();
  const qc = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const handleImportarJira = async () => {
    setIsImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${SUPABASE_URL}/functions/v1/import-jira-issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        // sync_all: true → busca TODOS os chamados ativos do projeto, não só os do usuário logado
        body: JSON.stringify({ sync_all: true }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro desconhecido");

      await qc.invalidateQueries({ queryKey: ["chamados"] });
      await refetch();
      toast.success(result.mensagem ?? `${result.importados} chamados importados!`);
    } catch (err: any) {
      toast.error(`Erro ao importar: ${err?.message ?? "erro desconhecido"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const stats = useMemo(() => {
    if (!chamados) return null;
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const semana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const mes = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    const abertos = chamados.filter(c => c.status_jira !== "Concluído");
    const concluidos = chamados.filter(c => c.status_jira === "Concluído");

    const porModulo: Record<string, number> = {};
    chamados.forEach(c => {
      if (c.modulo) porModulo[c.modulo] = (porModulo[c.modulo] ?? 0) + 1;
    });
    const topModulos = Object.entries(porModulo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const porStatus: Record<string, number> = {};
    chamados.forEach(c => {
      const s = c.status_jira ?? "Aberto";
      porStatus[s] = (porStatus[s] ?? 0) + 1;
    });

    return {
      total: chamados.length,
      abertos: abertos.length,
      concluidos: concluidos.length,
      bugs: chamados.filter(c => c.tipo === "bug").length,
      melhorias: chamados.filter(c => c.tipo === "melhoria").length,
      solicitacoes: chamados.filter(c => c.tipo === "solicitacao").length,
      emAtendimento: chamados.filter(c => c.status_jira === "Em Atendimento").length,
      // Inclui todos os status de "aguardando"
      aguardando: chamados.filter(c =>
        c.status_jira === "Aguardando Suporte" ||
        c.status_jira === "Aguardando Solicitante" ||
        c.status_jira === "Aguardando Desenvolvimento" ||
        c.status_jira === "Em Backlog de Melhorias"
      ).length,
      hoje: chamados.filter(c => new Date(c.created_at) >= hoje).length,
      semana: chamados.filter(c => new Date(c.created_at) >= semana).length,
      mes: chamados.filter(c => new Date(c.created_at) >= mes).length,
      topModulos,
      porStatus,
      taxaConclusao: chamados.length > 0
        ? Math.round((concluidos.length / chamados.length) * 100)
        : 0,
    };
  }, [chamados]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: "Total", value: stats.total, icon: TicketCheck, color: "text-primary", sub: `${stats.hoje} hoje` },
    { label: "Em Aberto", value: stats.abertos, icon: AlertCircle, color: "text-orange-500", sub: `${stats.emAtendimento} em atendimento` },
    { label: "Concluídos", value: stats.concluidos, icon: CheckCircle2, color: "text-green-500", sub: `${stats.taxaConclusao}% taxa de conclusão` },
    { label: "Aguardando", value: stats.aguardando, icon: Clock, color: "text-yellow-500", sub: "suporte, dev ou backlog" },
    { label: "Bugs", value: stats.bugs, icon: Bug, color: "text-red-500", sub: `${stats.total > 0 ? Math.round(stats.bugs / stats.total * 100) : 0}% do total` },
    { label: "Melhorias", value: stats.melhorias, icon: Lightbulb, color: "text-yellow-500", sub: "" },
    { label: "Solicitações", value: stats.solicitacoes, icon: ClipboardList, color: "text-blue-500", sub: "" },
    { label: "Últimos 7 dias", value: stats.semana, icon: TrendingUp, color: "text-primary", sub: `${stats.mes} em 30 dias` },
  ];

  const statusOrder = [
    "Aberto",
    "Em Atendimento",
    "Aguardando Suporte",
    "Aguardando Solicitante",
    "Aguardando Desenvolvimento",
    "Em Backlog de Melhorias",
    "Concluído",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Painel de Controle</h2>
          <p className="text-muted-foreground text-sm mt-1">Visão geral dos chamados do PromoBank</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportarJira}
          disabled={isImporting}
          className="gap-2"
          title="Importar todos os chamados ativos do Jira"
        >
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isImporting ? "Importando..." : "Importar do Jira"}
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Distribuição por status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusOrder.map(status => {
                const count = stats.porStatus[status] ?? 0;
                const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>{status}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.total === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum chamado ainda</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top módulos */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Módulos com mais Chamados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topModulos.length > 0 ? stats.topModulos.map(([modulo, count], i) => {
                const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
                return (
                  <div key={modulo} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium flex items-center gap-1">
                        <span className="text-muted-foreground">#{i + 1}</span> {modulo}
                      </span>
                      <span className="text-muted-foreground">{count} chamado{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + i * 0.05 }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum módulo registrado ainda</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Últimos chamados */}
      {chamados && chamados.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chamados Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chamados.slice(0, 8).map((c) => {
                  const comentarios = Array.isArray(c.comentarios) ? c.comentarios.length : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <Badge variant={c.tipo === "bug" ? "destructive" : c.tipo === "melhoria" ? "default" : "secondary"} className="text-xs shrink-0">
                        {c.tipo === "bug" ? "Bug" : c.tipo === "melhoria" ? "Melhoria" : "Solicitação"}
                      </Badge>
                      <span className="text-sm text-foreground font-medium truncate flex-1">{c.titulo}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {comentarios > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />{comentarios}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status_jira ?? "Aberto"] ?? "bg-muted text-muted-foreground"}`}>
                          {c.status_jira ?? "Aberto"}
                        </span>
                        {c.jira_key && (
                          <a
                            href={`https://datweb.atlassian.net/browse/${c.jira_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline font-mono flex items-center gap-0.5"
                          >
                            {c.jira_key}<ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardPanel;
