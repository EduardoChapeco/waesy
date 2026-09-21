import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCustomerOrders } from "@/services/order.functions";
import { getProfile, getUserSession, signOut } from "@/services/auth.functions";
import { getMyStoresList } from "@/services/store.functions";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Shield, Store, LayoutDashboard, ArrowUpRight, Plus, Eye, Edit3, ArrowRight, ShoppingBag, Calendar, Ticket, Bookmark, Plane, CreditCard, Coins, Gift, HelpCircle, RotateCcw, Layers, LogOut, User, ExternalLink, ChevronRight, Building2, Lock, ShieldCheck, Briefcase, Wallet, FileText, Sparkles, Trophy } from 'lucide-react';
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/")({
 head: () => ({ meta: [{ title: "Minha Conta | Waesy" }] }),
 loader: async () => {
 try {
 const session = await getUserSession().catch(() => null);
 const [ordersRes, profileRes, storesRes] = await Promise.all([
 listCustomerOrders().catch(() => []),
 getProfile().catch(() => null),
 getMyStoresList().catch(() => []),
 ]);
 return {
 orders: ordersRes || [],
 profile: profileRes || null,
 session: session || null,
 stores: storesRes || [],
 };
 } catch {
 return {
 orders: [],
 profile: null,
 session: null,
 stores: [],
 };
 }
 },
 component: AccountDashboardPage,
});

const ACCOUNT_SECTIONS = [
  { to: "/conta/empresa", label: "Minha Empresa", icon: Store },
  { to: "/conta/criadores", label: "Criadores & Parcerias", icon: Sparkles },
  { to: "/conta/comissoes", label: "Comissões & Afiliados", icon: Coins },
  { to: "/conta/financas", label: "Finanças", icon: Wallet },
 { to: "/conta/contratos", label: "Contratos", icon: FileText },
 { to: "/conta/carnes", label: "Carnês", icon: CreditCard },
 { to: "/conta/pedidos", label: "Pedidos", icon: ShoppingBag },
 { to: "/conta/verificacao", label: "Verificação", icon: ShieldCheck },
 { to: "/conta/colaborador", label: "Colaborador", icon: Briefcase },
 { to: "/conta/agendamentos", label: "Agendamentos", icon: Calendar },
 { to: "/conta/pacotes", label: "Pacotes", icon: Ticket },
 { to: "/conta/concursos", label: "Sorteios & Cupons", icon: Ticket },
 { to: "/convite", label: "Membro Fundador", icon: Trophy },
 { to: "/conta/viagens", label: "Viagens", icon: Plane },
 { to: "/conta/salvos", label: "Salvos", icon: Bookmark },
 { to: "/conta/classificados", label: "Anúncios", icon: Layers },
 { to: "/conta/pagamentos", label: "Pagamentos", icon: CreditCard },
 { to: "/conta/tokens", label: "Tokens", icon: Coins },
 { to: "/conta/gift-cards", label: "Gift Cards", icon: Gift },
 { to: "/conta/seguranca", label: "Segurança", icon: Lock },
 { to: "/conta/suporte", label: "Ajuda", icon: HelpCircle },
];

function AccountDashboardPage() {
 const loaderData = (Route.useLoaderData() || {}) as any;
 const orders = loaderData.orders || [];
 const profile = loaderData.profile || null;
 const session = loaderData.session || null;
 const rawStores = (loaderData.stores as any[]) || [];
 const sessionMemberships = (session?.memberships as any[]) || [];
 const profileMemberships = (profile?.memberships as any[]) || [];
 const stores =
 rawStores.length > 0
 ? rawStores
 : sessionMemberships.length > 0
 ? sessionMemberships
 : profileMemberships;

 const navigate = useNavigate();
 const [isLoggingOut, setIsLoggingOut] = useState(false);

 const isAuthenticated = !!(session?.user || profile?.id);

 const userRole = profile?.role || session?.role || session?.user?.user_metadata?.role || "customer";
 const isMasterAdmin = userRole === "platform_admin" || userRole === "master" || userRole === "admin";

 const userName = profile?.fullName || session?.fullName || session?.user?.user_metadata?.full_name || "Membro Waesy";
 const userEmail = profile?.email || session?.email || session?.user?.email || "";
 const userHandle = profile?.username || session?.username || session?.user?.user_metadata?.username || userEmail.split("@")[0] || "membro";
 const userAvatar = profile?.avatarUrl || session?.avatarUrl || session?.user?.user_metadata?.avatar_url || "";

 // Seta o cookie de tenant ativo e navega para o workspace da loja correta
 const handleOpenWorkspace = (storeId: string) => {
 window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
 navigate({ to: "/workspace" });
 };

 const handleSignOut = async () => {
 setIsLoggingOut(true);
 try {
 await signOut();
 toast.success("Sessão encerrada com sucesso.");
 if (typeof window !== "undefined") {
 window.location.href = "/";
 }
 } catch {
 toast.error("Erro ao encerrar sessão.");
 } finally {
 setIsLoggingOut(false);
 }
 };

 // ── ESTADO NÃO AUTENTICADO: TELA LIMPA DE BOAS-VINDAS / LOGIN ──
 if (!isAuthenticated) {
 return (
 <div className="w-full max-w-md mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in duration-200">
 <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
 <User className="size-8" />
 </div>

 <div className="space-y-2">
 <h1 className="text-xl font-bold text-foreground">Sua Conta no Waesy</h1>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Faça login para gerenciar seus pedidos, agendamentos, carteira e acessar o painel das suas empresas.
 </p>
 </div>

 <div className="space-y-2.5 pt-2">
 <Button
 asChild
 className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer"
 >
 <Link to="/entrar">Entrar com Minha Conta</Link>
 </Button>

 <Button
 asChild
 variant="outline"
 className="w-full h-11 rounded-xl text-xs font-semibold cursor-pointer hover:bg-muted"
 >
 <Link to="/cadastro">Criar Nova Conta</Link>
 </Button>
 </div>
 </div>
 );
 }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Header do Perfil com Acesso ao Perfil & Master ── */}
      <div className="bg-card rounded-2xl border border-border/60 p-3.5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
 <div className="flex items-center gap-4 min-w-0">
 <div className="size-14 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
 {userAvatar ? (
 <img src={userAvatar} alt={userName} className="size-full object-cover" />
 ) : (
 <span className="text-lg font-black text-primary">{userName.charAt(0).toUpperCase()}</span>
 )}
 </div>

 <div className="min-w-0 space-y-0.5">
 <div className="flex items-center gap-2">
 <h1 className="text-base sm:text-lg font-bold text-foreground truncate tracking-tight">{userName}</h1>
 {isMasterAdmin && (
 <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-mono">
 MASTER ADMIN
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground font-mono truncate">@{userHandle} • {userEmail}</p>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
 {isMasterAdmin && (
 <Button asChild size="sm" variant="default" className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground gap-1.5 shadow-xs">
 <Link to="/admin-master">
 <Shield className="size-3.5" />
 <span>Admin Master</span>
 </Link>
 </Button>
 )}

 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 font-semibold hover:bg-muted cursor-pointer">
 <Link to="/conta/perfil">Editar Perfil</Link>
 </Button>

 <Button
 onClick={handleSignOut}
 disabled={isLoggingOut}
 variant="ghost"
 size="sm"
 className="rounded-xl text-xs h-9 font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
 >
 <LogOut className="size-3.5 mr-1" />
 <span>Sair</span>
 </Button>
 </div>
 </div>

 {/* ── 2. SELETOR DE PERFIL: EMPRESAS & LOJAS DO USUÁRIO ── */}
 {stores.length > 0 && (
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
 <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
 <div className="flex items-center gap-2">
 <Building2 className="size-4 text-primary" />
 <h2 className="text-sm font-bold text-foreground tracking-tight">Meus Negócios & Empresas</h2>
 <Badge variant="secondary" className="text-[10px] font-mono">
 {stores.length}
 </Badge>
 </div>
 <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-semibold h-8 text-primary hover:bg-primary/10 cursor-pointer">
 <Link to="/criar-negocio">
 <Plus className="size-3.5 mr-1" />
 <span>Nova Loja</span>
 </Link>
 </Button>
 </div>

 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
 {stores.map((st: any) => {
 const storeId = st.id || st.store_id;
 const storeName = st.name || st.store_name || "Minha Empresa";
 const storeRole = st.role === "owner" ? "Proprietário" : st.role === "admin" ? "Administrador" : "Colaborador";
 const logoUrl = st.logo_url || st.settings?.logoUrl;

 return (
 <div
 key={storeId}
 className="p-4 rounded-xl border border-border/60 hover:border-primary/50 transition-all bg-background flex items-center justify-between gap-3 group"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-muted border border-border/40 overflow-hidden flex items-center justify-center shrink-0">
 {logoUrl ? (
 <img src={logoUrl} alt={storeName} className="size-full object-cover" />
 ) : (
 <Store className="size-5 text-primary" />
 )}
 </div>
 <div className="min-w-0 space-y-0.5">
 <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
 <p className="text-[10px] text-muted-foreground font-medium">{storeRole}</p>
 </div>
 </div>

 <Button
 onClick={() => handleOpenWorkspace(storeId)}
 size="sm"
 className="h-8.5 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 cursor-pointer shadow-xs shrink-0"
 >
 <span>Entrar</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 );
 })}
 </div>
 </div>
 )}

  {/* ── 2.1 CONVERSÃO PARA CONTA PRO (Fase 5: Ponte de Conversão) ── */}
  {stores.length === 0 && (
    <div className="bg-card rounded-2xl border border-primary/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Transforme sua Conta em Perfil Pro</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
          Crie sua loja oficial no Workspace para gerenciar catálogo, vendas, pedidos e telemetria SimLabs com 50.000 tokens de IA inclusos.
        </p>
      </div>
      <Button asChild size="sm" className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-9 px-4 shrink-0 shadow-xs cursor-pointer">
        <Link to="/criar-negocio">
          <Store className="size-3.5 mr-1.5" />
          <span>Criar Empresa Pro</span>
        </Link>
      </Button>
    </div>
  )}

      {/* ── 3. Menu e Configurações (Ultra-Minimalista V11) ── */}
      <div className="bg-card rounded-2xl border border-border/40 overflow-hidden p-2 sm:p-3">
        <div className="px-3 py-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conta & Serviços</h2>
        </div>

        <div className="space-y-0.5">
          {ACCOUNT_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.to}
                to={sec.to}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="size-4.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" strokeWidth={1.75} />
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    {sec.label}
                  </span>
                </div>

                <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
              </Link>
            );
          })}
        </div>
      </div>
 </div>
 );
}

export default AccountDashboardPage;
