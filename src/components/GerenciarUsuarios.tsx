import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUsuarios, useCreateUsuario } from "@/hooks/usePromoBank";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Phone, Mail, User, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EMPTY_FORM = {
  nome: "",
  tipo: "franqueado" as "franqueado" | "suporte" | "gestor",
  telefone_whatsapp: "",
  email: "",
  account_id_jira: "",
  jira_email: "",
  jira_api_token: "",
};

const GerenciarUsuarios = () => {
  const { data: usuarios, isLoading } = useUsuarios();
  const createUsuario = useCreateUsuario();
  const qc = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
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
      setOpenCreate(false);
      setForm(EMPTY_FORM);
    } catch {
      toast.error("Erro ao cadastrar usuário");
    }
  };

  const openEdit = (u: any) => {
    setEditForm({
      nome: u.nome,
      tipo: u.tipo,
      telefone_whatsapp: u.telefone_whatsapp ?? "",
      email: u.email,
      account_id_jira: u.account_id_jira ?? "",
      jira_email: u.jira_email ?? "",
      jira_api_token: "",  // nunca preenche token por segurança
    });
    setEditingId(u.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    const update: Record<string, any> = {
      nome: editForm.nome,
      tipo: editForm.tipo,
      telefone_whatsapp: editForm.telefone_whatsapp || null,
      email: editForm.email,
      account_id_jira: editForm.account_id_jira || null,
      jira_email: editForm.jira_email || null,
    };
    // Só atualiza token se o usuário digitou um novo
    if (editForm.jira_api_token.trim()) {
      update.jira_api_token = editForm.jira_api_token;
    }
    const { error } = await supabase
      .from("mapeamento_usuarios")
      .update(update)
      .eq("id", editingId);
    setIsSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Usuário atualizado!");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase
      .from("mapeamento_usuarios")
      .update({ ativo: false })
      .eq("id", deletingId);
    if (error) {
      toast.error("Erro ao remover usuário");
    } else {
      toast.success("Usuário removido!");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const FormFields = ({ data, onChange }: { data: typeof EMPTY_FORM; onChange: (d: typeof EMPTY_FORM) => void }) => (
    <div className="space-y-4 mt-2">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={data.nome} onChange={(e) => onChange({ ...data, nome: e.target.value })} placeholder="Nome completo" />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={data.tipo} onValueChange={(v) => onChange({ ...data, tipo: v as typeof data.tipo })}>
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
        <Input value={data.email} onChange={(e) => onChange({ ...data, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
      </div>
      <div className="space-y-2">
        <Label>Telefone WhatsApp</Label>
        <Input value={data.telefone_whatsapp} onChange={(e) => onChange({ ...data, telefone_whatsapp: e.target.value })} placeholder="65999991111" />
      </div>
      <div className="space-y-2">
        <Label>Account ID Jira</Label>
        <Input value={data.account_id_jira} onChange={(e) => onChange({ ...data, account_id_jira: e.target.value })} placeholder="Ex: 712020:abc123..." />
      </div>
      <div className="space-y-2">
        <Label>Email Jira</Label>
        <Input value={data.jira_email} onChange={(e) => onChange({ ...data, jira_email: e.target.value })} placeholder="email@datweb.com.br" type="email" />
      </div>
      <div className="space-y-2">
        <Label>API Token Jira {editingId && <span className="text-muted-foreground font-normal">(deixe vazio para manter o atual)</span>}</Label>
        <Input value={data.jira_api_token} onChange={(e) => onChange({ ...data, jira_api_token: e.target.value })} placeholder="Token de API do Atlassian" type="password" />
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Mapeamento de Usuários
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {usuarios?.length ?? 0} usuários cadastrados
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
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
            <FormFields data={form} onChange={setForm} />
            <Button onClick={handleCreate} disabled={createUsuario.isPending} className="w-full mt-2">
              {createUsuario.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
            </Button>
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
                    <div className="flex-1 min-w-0">
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
                      {u.account_id_jira && (
                        <div className="mt-0.5 text-xs text-muted-foreground font-mono truncate">
                          ID: {u.account_id_jira}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                      <Badge variant={
                        u.tipo === "franqueado" ? "default" :
                        u.tipo === "gestor" ? "secondary" : "outline"
                      } className="text-xs capitalize">
                        {u.tipo}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(u)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(u.id)}
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <FormFields data={editForm} onChange={setEditForm} />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Remoção */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será desativado e não aparecerá mais nas listas. Os chamados existentes não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default GerenciarUsuarios;
