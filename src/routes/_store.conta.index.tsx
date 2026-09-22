import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCustomerOrders } from "@/services/order.functions";
import { getProfile, getUserSession, signOut } from "@/services/auth.functions";
import { getMyStoresList } from "@/services/store.functions";
import { listUserNotifications } from "@/services/notifications.functions";
import { cn } from "@/lib/utils";
import {
  Shield,
  Store,
  ArrowRight,
  Plus,
  ShoppingBag,
  Calendar,
  Ticket,
  Bookmark,
  Plane,
  CreditCard,
  Coins,
  Gift,
  HelpCircle,
  RotateCcw,
  Layers,
  LogOut,
  User,
  ChevronRight,
  Building2,
  Lock,
  ShieldCheck,
  Briefcase,
  Wallet,
  FileText,
  Sparkles,
  Trophy,
  Bell,
  MessageCircle,
  Handshake,
  MapPin,
  Car,
  Star,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/")({
  head: () => ({ meta: [{ title: "Minha Conta | Waesy" }] }),
  loader: async () => {
    try {
      const session = await getUserSession().catch(() => null);
      const [ordersRes, profileRes, storesRes, notificationsRes] = await Promise.all([
        listCustomerOrders().catch(() => []),
        getProfile().catch(() => null),
        getMyStoresList().catch(() => []),
        listUserNotifications().catch(() => []),
      ]);
      return {
        orders: ordersRes || [],
        profile: profileRes || null,
        session: session || null,
        stores: storesRes || [],
        notifications: notificationsRes || [],
      };
    } catch {
      return {
        orders: [],
        profile: null,
        session: null,
        stores: [],
        notifications: [],
      };
    }
  },
  component: AccountDashboardPage,
});

interface AccountSectionItem {
  to: string;
  label: string;
  icon: any;
  badge?: string | number | null;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface AccountGroup {
  title: string;
  items: AccountSectionItem[];
}

function AccountDashboardPage() {
  const loaderData = (Route.useLoaderData() || {}) as any;
  const orders = loaderData.orders || [];
  const profile = loaderData.profile || null;
  const session = loaderData.session || null;
  const rawStores = (loaderData.stores as any[]) || [];
  const notifications = (loaderData.notifications as any[]) || [];
  const unreadNotifsCount = notifications.filter((n: any) => !n.isRead).length;

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

  const ACCOUNT_GROUPS: AccountGroup[] = [
    {
      title: "Comunicação & Negociações",
      items: [
        {
          to: "/conta/notificacoes",
          label: "Central de Notificações",
          icon: Bell,
          badge: unreadNotifsCount > 0 ? `${unreadNotifsCount} nova${unreadNotifsCount > 1 ? "s" : ""}` : null,
          badgeVariant: "default",
        },
        { to: "/conta/conversas", label: "Mensagens & Chat", icon: MessageCircle },
        { to: "/conta/negociacoes", label: "Negociações & Propostas", icon: Handshake },
        { to: "/conta/trocas", label: "Trocas & Permutas", icon: RefreshCw },
      ],
    },
    {
      title: "Compras, Serviços & Viagens",
      items: [
        {
          to: "/conta/pedidos",
          label: "Meus Pedidos",
          icon: ShoppingBag,
          badge: orders.length > 0 ? `${orders.length}` : null,
          badgeVariant: "secondary",
        },
        { to: "/conta/agendamentos", label: "Agendamentos & Reservas", icon: Calendar },
        { to: "/conta/ingressos", label: "Ingressos de Eventos", icon: Ticket },
        { to: "/conta/viagens", label: "Minhas Viagens & Roteiros", icon: Plane },
        { to: "/conta/pacotes", label: "Pacotes Turísticos", icon: Ticket },
        { to: "/conta/enderecos", label: "Endereços de Entrega", icon: MapPin },
        { to: "/conta/salvos", label: "Itens Salvos & Favoritos", icon: Bookmark },
        { to: "/conta/mobilidade", label: "Mobilidade & Corridas", icon: Car },
      ],
    },
    {
      title: "Anúncios & Oportunidades",
      items: [
        { to: "/conta/classificados", label: "Meus Anúncios", icon: Layers },
        { to: "/conta/criadores", label: "Criadores & Parcerias", icon: Sparkles },
        { to: "/conta/comissoes", label: "Comissões & Afiliados", icon: Coins },
        { to: "/conta/candidaturas", label: "Minhas Candidaturas", icon: Briefcase },
      ],
    },
    {
      title: "Financeiro & Benefícios",
      items: [
        { to: "/conta/financas", label: "Carteira & Finanças", icon: Wallet },
        { to: "/conta/carnes", label: "Carnês Digitais", icon: CreditCard },
        { to: "/conta/pagamentos", label: "Cartões & Pagamentos", icon: CreditCard },
        { to: "/conta/creditos", label: "Créditos & Saldo", icon: Coins },
        { to: "/conta/tokens", label: "Tokens Waesy", icon: Coins },
        { to: "/conta/gift-cards", label: "Gift Cards", icon: Gift },
        { to: "/conta/concursos", label: "Sorteios & Cupons", icon: Ticket },
        { to: "/convite", label: "Membro Fundador", icon: Trophy },
      ],
    },
    {
      title: "Empresa & Gestão",
      items: [
        { to: "/conta/empresa", label: "Minha Empresa", icon: Store },
        { to: "/conta/colaborador", label: "Colaborador & Equipe", icon: Users },
        { to: "/conta/contratos", label: "Contratos Digitais", icon: FileText },
        { to: "/conta/verificacao", label: "Verificação de Identidade (KYC)", icon: ShieldCheck },
      ],
    },
    {
      title: "Segurança & Suporte",
      items: [
        { to: "/conta/seguranca", label: "Segurança & Acesso", icon: Lock },
        { to: "/conta/avaliacoes", label: "Minhas Avaliações", icon: Star },
        { to: "/conta/suporte", label: "Ajuda & Suporte Técnico", icon: HelpCircle },
      ],
    },
  ];

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

      {/* ── 1.1 Barra Rápida de Métricas & Atalhos Diretos (Thumb-Friendly) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Link
          to="/conta/pedidos"
          className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShoppingBag className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Pedidos</p>
              <p className="text-xs font-bold text-foreground">{orders.length}</p>
            </div>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/conta/notificacoes"
          className={cn(
            "p-3 sm:p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-2 group cursor-pointer",
            unreadNotifsCount > 0
              ? "border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08]"
              : "border-border/60 bg-card hover:bg-muted/40"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "size-8 rounded-lg flex items-center justify-center shrink-0",
              unreadNotifsCount > 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            )}>
              <Bell className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Notificações</p>
              <p className={cn("text-xs font-bold", unreadNotifsCount > 0 ? "text-primary" : "text-foreground")}>
                {unreadNotifsCount > 0 ? `${unreadNotifsCount} nova${unreadNotifsCount > 1 ? "s" : ""}` : "0"}
              </p>
            </div>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/conta/negociacoes"
          className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Handshake className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Negociações</p>
              <p className="text-xs font-bold text-foreground">Acessar</p>
            </div>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/conta/salvos"
          className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bookmark className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Salvos</p>
              <p className="text-xs font-bold text-foreground">Favoritos</p>
            </div>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
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

      {/* ── 2.1 CONVERSÃO PARA CONTA PRO (Ponte de Conversão) ── */}
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

      {/* ── 3. Categorias & Hub de Serviços Agrupados (Apple HIG & Ultra-Minimalista) ── */}
      <div className="space-y-4">
        {ACCOUNT_GROUPS.map((group) => (
          <div
            key={group.title}
            className="bg-card rounded-2xl border border-border/40 overflow-hidden p-2 sm:p-3 shadow-2xs"
          >
            <div className="px-3 py-2 border-b border-border/20 mb-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h2>
            </div>

            <div className="divide-y divide-border/20">
              {group.items.map((sec) => {
                const Icon = sec.icon;
                return (
                  <Link
                    key={sec.to}
                    to={sec.to}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group min-h-[44px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon className="size-4.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" strokeWidth={1.75} />
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {sec.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {sec.badge && (
                        <Badge
                          variant={sec.badgeVariant || "secondary"}
                          className="text-[10px] font-medium font-mono h-5 px-2"
                        >
                          {sec.badge}
                        </Badge>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccountDashboardPage;
