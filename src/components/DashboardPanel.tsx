import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChamados } from "@/hooks/usePromoBank";
import { TicketCheck, Bug, Lightbulb, HeadphonesIcon, Clock, TrendingUp } from "lucide-react";

const DashboardPanel = () => {
  const { data: chamados, isLoading } = useChamados();

  const stats = {
    total: chamados?.length ?? 0,
    bugs: chamados?.filter((c) => c.tipo === "bug").length ?? 0,
    melhorias: chamados?.filter((c) => c.tipo === "melhoria").length ?? 0,
    solicitacoes: chamados?.filter((c) => c.tipo === "solicitacao").length ?? 0,
    abertos: chamados?.filter((c) => c.status_jira === "Aberto").length ?? 0,
    app: chamados?.filter((c) => c.origem === "app_direto").length ?? 0,
    rd: chamados?.filter((c) => c.origem === "rd_conversas").length ?? 0,
  };

  const cards = [
    { label: "Total de Chamados", value: stats.total, icon: TicketCheck, color: "text-primary" },
    { label: "Bugs", value: stats.bugs, icon: Bug, color: "text-destructive" },
    { label: "Melhorias", value: stats.melhorias, icon: Lightbulb, color: "text-accent" },
    { label: "Solicitações", value: stats.solicitacoes, icon: HeadphonesIcon, color: "text-primary" },
    { label: "Em Aberto", value: stats.abertos, icon: Clock, color: "text-muted-foreground" },
    { label: "Via App", value: stats.app, icon: TrendingUp, color: "text-success" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Painel de Controle
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral dos chamados do PromoBank
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {chamados && chamados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chamados.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.tipo === "bug" ? "bg-destructive/10 text-destructive" :
                      c.tipo === "melhoria" ? "bg-accent/20 text-accent-foreground" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {c.tipo === "bug" ? "Bug" : c.tipo === "melhoria" ? "Melhoria" : "Solicitação"}
                    </span>
                    <span className="text-sm text-foreground font-medium truncate max-w-[300px]">
                      {c.titulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.jira_key && (
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{c.jira_key}</span>
                    )}
                    <span>{c.status_jira}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPanel;
