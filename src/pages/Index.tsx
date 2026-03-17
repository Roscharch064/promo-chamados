import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, PlusCircle, List, Users } from "lucide-react";
import DashboardPanel from "@/components/DashboardPanel";
import NovoChamado from "@/components/NovoChamado";
import ListaChamados from "@/components/ListaChamados";
import GerenciarUsuarios from "@/components/GerenciarUsuarios";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="novo" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <PlusCircle className="h-4 w-4" />
              Novo Chamado
            </TabsTrigger>
            <TabsTrigger value="chamados" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <List className="h-4 w-4" />
              Chamados
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardPanel />
          </TabsContent>
          <TabsContent value="novo">
            <NovoChamado onSuccess={() => setActiveTab("chamados")} />
          </TabsContent>
          <TabsContent value="chamados">
            <ListaChamados />
          </TabsContent>
          <TabsContent value="usuarios">
            <GerenciarUsuarios />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
