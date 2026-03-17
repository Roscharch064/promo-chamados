import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChamados } from "@/hooks/usePromoBank";
import { Loader2, ExternalLink } from "lucide-react";

const ListaChamados = () => {
  const { data: chamados, isLoading } = useChamados();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Chamados
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {chamados?.length ?? 0} chamados registrados
        </p>
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
          {chamados.map((c, i) => (
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
                        <span className="text-xs text-muted-foreground">
                          {c.origem === "rd_conversas" ? "via RD Conversas" : "via App"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground text-sm truncate">{c.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Relator: {c.relator_nome} • {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {c.status_jira}
                      </Badge>
                      {c.jira_key && (
                        <a
                          href={`https://datweb.atlassian.net/browse/${c.jira_key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {c.jira_key}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ListaChamados;
