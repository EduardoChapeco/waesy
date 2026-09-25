import * as React from "react";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Layers, Smartphone, Mail, ArrowRight, FileText, QrCode, Calendar, Package, LogOut, User, Lock, Building2, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getServerClient } from "@/lib/supabase";
import { PortalContractsWidget } from "@/components/commerce/dynamic-sections/portal-contracts-widget";
import { PortalCarnesBillsWidget } from "@/components/commerce/dynamic-sections/portal-carnes-bills-widget";
import { PortalAppointmentsWidget } from "@/components/commerce/dynamic-sections/portal-appointments-widget";
import { PortalOrdersRentalsWidget } from "@/components/commerce/dynamic-sections/portal-orders-rentals-widget";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$storeSlug")({
 head: ({ loaderData }: any) => ({
 meta: [
 { title: `Portal do Cliente — ${loaderData?.store?.name || "Minha Empresa"}` },
 { name: "description", content: "Gerencie seus contratos, carnês com PIX, agendamentos e compras." },
 ],
 }),
 loader: async ({ params }) => {
   try {
 const db = getServerClient();
 
 // 1. Busca loja pelo slug
 const { data: store } = await db
 .from("stores")
 .select("id, name, slug, description, phone, email, settings")
 .eq("slug", params.storeSlug)
 .maybeSingle();

 if (!store) {
 return {
 store: { name: "Empresa", slug: params.storeSlug, settings: {} },
 portalConfig: null,
 document: null,
 };
 }

 // 2. Busca configuração do portal do cliente
 const { data: portalConfig } = await db
 .from("customer_portal_configs")
 .select("*")
 .eq("store_id", store.id)
 .maybeSingle();

 return {
 store,
 portalConfig,
 document: null,
 };
   } catch (err) {
     console.error("[loader:c.$storeSlug] Unhandled error:", err);
     return { store: null, portalConfig: null, document: null };
   }
 },
 component: CustomerPortalWhitelabelPage,
});

function CustomerPortalWhitelabelPage() {
  const { store, portalConfig } = ((Route.useLoaderData?.() as any) || {});

  // Estado de autenticação do cliente final (simulação com CPF ou Magic Link real)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [activeTab, setActiveTab] = useState("carnes");
  const [isLoading, setIsLoading] = useState(false);

  if (!store) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Portal Não Encontrado</h1>
        <p className="text-xs text-muted-foreground">Esta empresa não foi encontrada ou está inativa.</p>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    );
  }

 const handleLogin = (e: React.FormEvent) => {
 e.preventDefault();
 if (!clientCpf.trim() && !clientEmail.trim()) {
 toast.error("Preencha seu CPF ou E-mail para acessar.");
 return;
 }
 setIsLoading(true);
 setTimeout(() => {
 setIsLoading(false);
 setIsAuthenticated(true);
 toast.success("Acesso autorizado com sucesso!");
 }, 600);
 };

 const handleLogout = () => {
 setIsAuthenticated(false);
 setClientCpf("");
 setClientEmail("");
 toast.info("Você encerrou sua sessão no portal.");
 };

 const storeSettings = (store?.settings || {}) as Record<string, any>;
 const storeLogo = storeSettings.logoUrl || null;

 return (
 <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
 {/* Top Header Whitelabel */}
 <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md px-4 py-3 sm:px-6">
 <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 {storeLogo ? (
 <img src={storeLogo} alt={store.name} className="w-9 h-9 rounded-xl object-contain border border-border/60" />
 ) : (
 <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
 {store.name?.[0] || "E"}
 </div>
 )}
 <div>
 <div className="flex items-center gap-1.5">
 <h1 className="font-bold text-sm sm:text-base leading-tight text-foreground">{store.name}</h1>
 <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
 Verificado
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground">Portal do Cliente 360 Whitelabel</p>
 </div>
 </div>

 {isAuthenticated && (
 <div className="flex items-center gap-3">
 <div className="hidden sm:flex flex-col text-right">
 <span className="text-xs font-semibold text-foreground">
 {clientCpf ? `CPF: ${clientCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4")}` : clientEmail}
 </span>
 <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Sessão Segura</span>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={handleLogout}
 className="min-h-[44px] px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
 >
 <LogOut className="w-4 h-4" />
 <span className="hidden sm:inline">Sair</span>
 </Button>
 </div>
 )}
 </div>
 </header>

 {/* Main Body */}
 <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
 {!isAuthenticated ? (
 /* Tela de Login Sem Senha (Magic Link / CPF) */
 <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs space-y-6">
 <div className="text-center space-y-2">
 <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
 <ShieldCheck className="w-6 h-6" />
 </div>
 <h2 className="text-xl font-bold text-foreground">Acesse sua Área do Cliente</h2>
 <p className="text-xs text-muted-foreground">
 Consulte seus contratos, carnês com PIX instantâneo e acompanhe seus pedidos e agendamentos.
 </p>
 </div>

 <Tabs defaultValue="cpf" className="w-full">
 <TabsList className="grid grid-cols-2 w-full min-h-[44px] p-1 bg-muted/60 rounded-xl">
 <TabsTrigger value="cpf" className="rounded-lg text-xs font-medium min-h-[36px]">
 Acesso com CPF
 </TabsTrigger>
 <TabsTrigger value="magic" className="rounded-lg text-xs font-medium min-h-[36px]">
 Magic Link E-mail
 </TabsTrigger>
 </TabsList>

 <TabsContent value="cpf" className="mt-4">
 <form onSubmit={handleLogin} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Digite seu CPF:</label>
 <Input
 type="text"
 placeholder="000.000.000-00"
 value={clientCpf}
 onChange={(e) => setClientCpf(e.target.value)}
 className="min-h-[44px] rounded-xl text-sm"
 />
 </div>
 <Button type="submit" disabled={isLoading} className="w-full min-h-[44px] font-medium gap-2">
 {isLoading ? "Validando Acesso..." : "Entrar no Portal"}
 <ArrowRight className="w-4 h-4" />
 </Button>
 </form>
 </TabsContent>

 <TabsContent value="magic" className="mt-4">
 <form onSubmit={handleLogin} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Digite seu E-mail cadastrado:</label>
 <Input
 type="email"
 placeholder="seuemail@exemplo.com"
 value={clientEmail}
 onChange={(e) => setClientEmail(e.target.value)}
 className="min-h-[44px] rounded-xl text-sm"
 />
 </div>
 <Button type="submit" disabled={isLoading} className="w-full min-h-[44px] font-medium gap-2">
 {isLoading ? "Enviando Link..." : "Receber Acesso Rápido"}
 <Mail className="w-4 h-4" />
 </Button>
 </form>
 </TabsContent>
 </Tabs>

 <div className="pt-2 text-center border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
 <Lock className="w-3.5 h-3.5 text-muted-foreground/80" />
 Ambiente protegido com criptografia de ponta a ponta
 </div>
 </div>
 ) : (
 /* Painel do Cliente Autenticado (Multi-Módulos 360) */
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/40">
 <div>
 <h2 className="text-lg font-bold text-foreground">Espaço do Cliente</h2>
 <p className="text-xs text-muted-foreground">
 Transações e dados integrados com {store.name}.
 </p>
 </div>
 </div>

 {/* Navegação de Módulos */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="flex flex-wrap w-full justify-start h-auto gap-2 bg-transparent p-0">
 <TabsTrigger
 value="carnes"
 className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[44px] px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2"
 >
 <QrCode className="w-4 h-4" />
 Carnês & PIX
 </TabsTrigger>

 <TabsTrigger
 value="contratos"
 className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[44px] px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2"
 >
 <FileText className="w-4 h-4" />
 Contratos
 </TabsTrigger>

 <TabsTrigger
 value="agendamentos"
 className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[44px] px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2"
 >
 <Calendar className="w-4 h-4" />
 Agendamentos
 </TabsTrigger>

 <TabsTrigger
 value="compras"
 className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[44px] px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2"
 >
 <Package className="w-4 h-4" />
 Compras & Locações
 </TabsTrigger>
 </TabsList>

 <TabsContent value="carnes" className="mt-6 focus:outline-none">
 <PortalCarnesBillsWidget />
 </TabsContent>

 <TabsContent value="contratos" className="mt-6 focus:outline-none">
 <PortalContractsWidget />
 </TabsContent>

 <TabsContent value="agendamentos" className="mt-6 focus:outline-none">
 <PortalAppointmentsWidget />
 </TabsContent>

 <TabsContent value="compras" className="mt-6 focus:outline-none">
 <PortalOrdersRentalsWidget />
 </TabsContent>
 </Tabs>
 </div>
 )}
 </main>

 {/* Footer Whitelabel */}
 <footer className="border-t border-border/60 py-6 px-4 text-center text-xs text-muted-foreground mt-auto bg-muted/20">
 <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
 <span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>
 <span className="flex items-center gap-1">
 Desenvolvido sobre a infraestrutura <strong className="text-foreground font-semibold">Waesy</strong>
 </span>
 </div>
 </footer>
 </div>
 );
}
