import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUsuarios, useCreateUsuario } from "@/hooks/usePromoBank";
import { Loader2, Plus, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const GerenciarUsuarios = () => {
  const { data: usuarios, isLoading } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "franqueado" as "franqueado" | "suporte" | "gestor",
    telefone_whatsapp: "",
    email: "",
    account_id_jira: "",
    jira_email: "",
    jira_api_token: "",
  });

  const handleSubmit = async () => {
    if (!form.nome || !form.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    try {
      await createUsuario.mutateAsync({
        nome: form.nome,
        tipo: form.tipo,
        telefone_whatsapp: form.telefone_whatsapp || null,
        email: form.email,
        account_id_jira: form.account_id_jira || null,
        jira_email: form.jira_email || null,
        jira_api_token: form.jira_api_token || null,
      });
      toast.success("Usuário cadastrado!");
      setOpen(false);
      setForm({ nome: "", tipo: "franqueado", telefone_whatsapp: "", email: "", account_id_jira: "" });
    } catch {
      toast.error("Erro ao cadastrar usuário");
    }
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
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            Mapeamento de Usuários
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {usuarios?.length ?? 0} usuários cadastrados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as typeof form.tipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="franqueado">Franqueado</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Telefone WhatsApp</Label>
                <Input value={form.telefone_whatsapp} onChange={(e) => setForm({ ...form, telefone_whatsapp: e.target.value })} placeholder="65999991111" />
              </div>
              <div className="space-y-2">
                <Label>Account ID Jira</Label>
                <Input value={form.account_id_jira} onChange={(e) => setForm({ ...form, account_id_jira: e.target.value })} placeholder="Opcional" />
              </div>
              <Button onClick={handleSubmit} disabled={createUsuario.isPending} className="w-full">
                {createUsuario.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!usuarios?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <User className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhum usuário cadastrado</p>
            <p className="text-sm mt-1">Cadastre franqueados e equipe de suporte</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {usuarios.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{u.nome}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </div>
                      {u.telefone_whatsapp && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {u.telefone_whatsapp}
                        </div>
                      )}
                    </div>
                    <Badge variant={
                      u.tipo === "franqueado" ? "default" :
                      u.tipo === "gestor" ? "secondary" : "outline"
                    } className="text-xs capitalize">
                      {u.tipo}
                    </Badge>
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

export default GerenciarUsuarios;
