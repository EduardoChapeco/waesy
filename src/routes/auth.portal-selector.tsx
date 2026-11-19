import { createFileRoute, useNavigate, Link, redirect, isRedirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  ArrowRight,
  ShieldAlert,
  ShoppingBag,
  Plus,
  LogOut,
  Store,
  CheckCircle2,
  Sparkles,
  MapPin,
  Briefcase,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserSession, signOutFn } from "@/services/auth.functions";
import { getMyStoresList } from "@/services/store.functions";
import { setTenantContext } from "@/services/identity.functions";

export const Route = createFileRoute("/auth/portal-selector")({
  head: () => ({
    meta: [
      {
        title: "Seletor de Espaço de Trabalho — Waesy",
      },
      {
        name: "description",
        content: "Selecione a empresa ou painel corporativo que deseja gerenciar.",
      },
    ],
  }),
  loader: async () => {
    try {
      const session = await getUserSession();
      if (!session?.id) {
        throw redirect({
          to: "/entrar",
          search: { returnUrl: "/auth/portal-selector" },
        });
      }

      const isMaster = Boolean(
        session?.isMaster ||
        session?.isPlatformAdmin ||
        session?.user?.app_metadata?.is_master ||
        session?.role === "platform_admin" ||
        session?.role === "master" ||
        session?.role === "admin_master" ||
        session?.role === "superadmin"
      );

      const stores = await getMyStoresList();
      return { session, stores, isMaster };
    } catch (err: unknown) {
      if (isRedirect(err)) throw err;
      return { session: null, stores: [], isMaster: false };
    }
  },
  component: PortalSelectorPage,
});

function getRoleLabel(role?: string): string {
  switch (role) {
    case "owner":
      return "Proprietário";
    case "manager":
      return "Gerente";
    case "admin":
      return "Administrador";
    case "seller":
      return "Vendedor";
    case "operator":
      return "Operador";
    case "support":
      return "Suporte";
    default:
      return "Membro";
  }
}

function PortalSelectorPage() {
  const { session, stores, isMaster } = Route.useLoaderData();
  const navigate = useNavigate();
  const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSelectStore = async (storeId: string) => {
    try {
      setSwitchingStoreId(storeId);
      const res = await setTenantContext({ data: { store_id: storeId } });
      if (res?.success) {
        toast.success("Acessando espaço de trabalho...");
        navigate({ to: "/workspace", replace: true });
      } else {
        toast.error("Não foi possível acessar a empresa selecionada.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alternar para o espaço de trabalho.");
    } finally {
      setSwitchingStoreId(null);
    }
  };

  const handleSelectCivil = async () => {
    try {
      setSwitchingStoreId("civil");
      await setTenantContext({ data: { store_id: null } });
      toast.success("Direcionando para o portal do consumidor.");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao acessar o portal civil.");
    } finally {
      setSwitchingStoreId(null);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOutFn();
      toast.success("Sessão finalizada.");
      navigate({ to: "/entrar", replace: true });
    } catch {
      toast.error("Erro ao encerrar sessão.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userDisplayName =
    session?.profile?.full_name || (session as any)?.fullName || session?.email?.split("@")[0] || "Membro";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* ── Barra Superior Canônica ── */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs tracking-wider">
              W
            </div>
            <span className="font-extrabold text-sm tracking-tight text-foreground hidden sm:inline">
              Waesy Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate max-w-40 sm:max-w-60 font-semibold text-foreground">
                {userDisplayName}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Conteúdo Central ── */}
      <main className="max-w-xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-6 flex-1">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Layers className="size-3.5" />
            <span>Painel de Seleção Multi-Empresa</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Selecione seu espaço de trabalho
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Escolha qual organização ou painel você deseja gerenciar nesta sessão.
          </p>
        </div>

        {/* ── Lista de Empresas / Lojas ── */}
        <div className="space-y-3">
          {stores.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-card text-center space-y-3">
              <Store className="size-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  Nenhuma empresa vinculada ao seu usuário
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Cadastre sua primeira loja para ter acesso total ao catálogo, pedidos, financeiro e rotas de campo.
                </p>
              </div>
              <Button
                asChild
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2 cursor-pointer"
              >
                <Link to="/onboarding/empresa">
                  <Plus className="size-4" />
                  <span>Cadastrar Minha Empresa</span>
                </Link>
              </Button>
            </div>
          ) : (
            stores.map((st: any) => {
              const isSwitching = switchingStoreId === st.id;
              const roleLabel = getRoleLabel(st.role);

              return (
                <div
                  key={st.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/60 transition-colors shadow-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {st.logo_url ? (
                      <img
                        src={st.logo_url}
                        alt={st.name}
                        className="size-12 rounded-xl object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                        {st.name?.slice(0, 2).toUpperCase() || "W"}
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-foreground truncate">
                          {st.name}
                        </h2>
                        {st.status === "active" ? (
                          <Badge variant="outline" className="text-2xs font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-2xs font-bold text-muted-foreground">
                            Pendente
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Briefcase className="size-3 text-primary" />
                          <span>{roleLabel}</span>
                        </span>
                        {st.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            <span>{st.city}{st.state ? ` - ${st.state}` : ""}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={isSwitching}
                    onClick={() => handleSelectStore(st.id)}
                    className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2 shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    <span>{isSwitching ? "Acessando..." : "Entrar no Workspace"}</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}

          {/* ── Card Especial: Admin Master Global ── */}
          {isMaster && (
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <ShieldAlert className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">
                      Painel Master Global
                    </h2>
                    <Badge variant="outline" className="text-2xs font-bold text-primary border-primary/30">
                      Master
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Acesso a governança de cidades, marcas, integrações e telemetria.
                  </p>
                </div>
              </div>

              <Button
                asChild
                className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary gap-2 shrink-0 cursor-pointer w-full sm:w-auto"
              >
                <Link to="/admin-master">
                  <span>Acessar Master</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* ── Card: Cadastrar Nova Empresa ── */}
          {stores.length > 0 && (
            <Link
              to="/onboarding/empresa"
              className="rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-4 sm:p-5 flex items-center justify-between gap-4 hover:border-primary/50 hover:bg-muted/30 transition-colors text-xs font-bold text-foreground group"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-muted/50 group-hover:bg-primary/10 group-hover:text-primary text-muted-foreground flex items-center justify-center transition-colors">
                  <Plus className="size-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    Cadastrar Nova Empresa ou Filial
                  </p>
                  <p className="text-xs text-muted-foreground font-normal">
                    Adicione um novo CNPJ ou marca independente ao seu perfil.
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
        </div>

        {/* ── Seção Inferior: Acesso ao Portal Civil (Consumidor) ── */}
        <div className="pt-4 border-t border-border/60">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-background border border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
                <ShoppingBag className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  Acessar como Consumidor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Navegue pela vitrine da cidade, faça compras e consulte classificados.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={switchingStoreId === "civil"}
              onClick={handleSelectCivil}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold border-border/80 bg-background text-foreground hover:bg-muted/50 gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto"
            >
              <span>{switchingStoreId === "civil" ? "Direcionando..." : "Ir para a Vitrine"}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </main>

      {/* ── Rodapé ── */}
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <p>Waesy Platform &copy; {new Date().getFullYear()} — Ecossistema Operacional e Comercial.</p>
      </footer>
    </div>
  );
}
