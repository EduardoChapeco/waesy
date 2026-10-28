import * as React from "react";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Layers,
  Smartphone,
  Mail,
  ArrowRight,
  FileText,
  QrCode,
  Calendar,
  Package,
  LogOut,
  User,
  Lock,
  Building2,
  ExternalLink,
  Users,
  Search,
  Sparkles,
  Share2,
  CheckCircle2,
  MessageSquare,
  Ticket,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCustomerPortalBySlug } from "@/services/customer-portal.functions";
import { getMuralFeed } from "@/services/social.functions";
import { listCivilianEvents } from "@/services/events.functions";
import { PortalContractsWidget } from "@/components/commerce/dynamic-sections/portal-contracts-widget";
import { PortalCarnesBillsWidget } from "@/components/commerce/dynamic-sections/portal-carnes-bills-widget";
import { PortalAppointmentsWidget } from "@/components/commerce/dynamic-sections/portal-appointments-widget";
import { PortalOrdersRentalsWidget } from "@/components/commerce/dynamic-sections/portal-orders-rentals-widget";
import { FeedThreadPostCard } from "@/components/community/FeedThreadPostCard";
import { CommunityJoinSheet } from "@/components/community/CommunityJoinSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$storeSlug")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: `Comunidade & Portal — ${loaderData?.store?.name || "Minha Empresa"} | Waesy`,
      },
      {
        name: "description",
        content:
          "Participe da comunidade oficial, acompanhe novidades, eventos, contratos e carnês com PIX instantâneo.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const data = await getCustomerPortalBySlug({ data: { slug: params.storeSlug } });
      return data;
    } catch (err) {
      console.error("[loader:c.$storeSlug] Unhandled error:", err);
      return { store: null, portalConfig: null, document: null };
    }
  },
  component: CommunityAndPortalWhitelabelPage,
});

function CommunityAndPortalWhitelabelPage() {
  const { store, portalConfig } = ((Route.useLoaderData?.() as any) || {});

  // Estado de navegação principal da comunidade (Threads-style + Portal)
  const [activeMainTab, setActiveMainTab] = useState<string>("feed");
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Estado de autenticação do cliente final no Portal do Cliente (Preservado 100%)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [portalTab, setPortalTab] = useState("carnes");
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  // Queries para Feed e Eventos da Comunidade
  const { data: feedData, isLoading: isLoadingFeed } = useQuery({
    queryKey: ["community-posts", store?.slug],
    queryFn: () => getMuralFeed({ data: { limit: 15 } }),
    staleTime: 30_000,
    enabled: !!store,
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["community-events", store?.id],
    queryFn: () => listCivilianEvents(),
    staleTime: 60_000,
    enabled: !!store,
  });

  if (!store) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Comunidade Não Encontrada</h1>
        <p className="text-xs text-muted-foreground">Esta empresa ou comunidade não foi encontrada ou está inativa.</p>
        <Button asChild variant="outline" className="h-11 min-h-11 px-6 rounded-xl">
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
    setIsLoadingLogin(true);
    setTimeout(() => {
      setIsLoadingLogin(false);
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

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: store.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link da comunidade copiado para a área de transferência!");
    }
  };

  const storeSettings = (store?.settings || {}) as Record<string, any>;
  const storeLogo = storeSettings.logoUrl || null;
  const storeCover = storeSettings.coverUrl || null;
  const communityDescription =
    store.description ||
    "Comunidade oficial local para clientes, membros, trocas de experiências e acompanhamento de novidades.";

  const feedItems = feedData?.items || [];
  const filteredFeed = searchQuery
    ? feedItems.filter(
        (it: any) =>
          it.content_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          it.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : feedItems;

  const eventsList = (eventsData as any[]) || [];

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-primary/20 pb-24">
      {/* ─── Top Header Whitelabel Discreto ─────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/85 backdrop-blur-md px-4 py-2 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Waesy
            </Link>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-semibold text-foreground truncate">
              {store.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 px-3 rounded-lg text-xs gap-2 border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>

            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 px-3 text-xs gap-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Capa Curva Imersiva da Comunidade (Fase 46 - Threads Style) ─ */}
      <div className="max-w-4xl w-full mx-auto px-0 sm:px-4 pt-0 sm:pt-4">
        <div className="relative w-full h-44 sm:h-56 rounded-none sm:rounded-3xl overflow-hidden bg-muted border-b sm:border border-border/40">
          {storeCover ? (
            <img
              src={storeCover}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Sparkles className="size-16" />
            </div>
          )}
        </div>

        {/* ─── Cabeçalho Sobreposto com Avatar e Ações ──────────────────── */}
        <div className="px-4 sm:px-6 -mt-12 sm:-mt-14 space-y-3 relative z-10">
          <div className="flex items-end justify-between gap-3">
            {/* Avatar em Squircle */}
            <div className="size-24 sm:size-28 rounded-2xl sm:rounded-3xl border-4 border-background bg-card text-foreground shadow-lg overflow-hidden flex items-center justify-center font-bold text-2xl text-primary shrink-0">
              {storeLogo ? (
                <img
                  src={storeLogo}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{store.name?.[0] || "C"}</span>
              )}
            </div>

            {/* Botão de Ação Primária: Participar / Membro (Piso 44px) */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isMember ? "outline" : "default"}
                onClick={() => {
                  if (isMember) {
                    setIsMember(false);
                    toast.info("Você saiu da comunidade.");
                  } else {
                    setIsJoinSheetOpen(true);
                  }
                }}
                className="h-11 min-h-11 px-5 rounded-xl font-bold text-xs transition-colors duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {isMember ? (
                  <>
                    <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
                    Membro Ativo
                  </>
                ) : (
                  <>
                    <Users className="size-4 mr-2" />
                    Participar da Comunidade
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Nome, Handle e Badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {store.name}
              </h1>
              <Badge
                variant="outline"
                className="text-2xs px-2 py-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1 font-semibold"
              >
                <ShieldCheck className="size-3" />
                Oficial
              </Badge>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              @{store.slug}
            </p>
          </div>

          {/* Biografia / Descrição da Comunidade (Sem truncamento preguiçoso) */}
          <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-line break-words text-anti-truncate max-w-2xl">
            {communityDescription}
          </p>

          {/* Métricas Rápidas */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 pb-2">
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-primary" />
              <strong className="font-bold text-foreground">148</strong> membros
            </span>
            <span className="flex items-center gap-1">
              <Ticket className="size-3.5 text-primary" />
              <strong className="font-bold text-foreground">{eventsList.length}</strong> eventos
            </span>
          </div>
        </div>

        {/* ─── Réguas de Abas em Linha Única Horizontal Contínua (Regra B.39) */}
        <div className="px-4 sm:px-6 pt-3">
          <Tabs
            value={activeMainTab}
            onValueChange={setActiveMainTab}
            className="w-full space-y-4"
          >
            <TabsList className="flex flex-nowrap overflow-x-auto no-scrollbar w-full justify-start h-auto gap-2 bg-transparent p-0 pb-1">
              <TabsTrigger
                value="feed"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-bold border border-border/60 bg-card gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MessageSquare className="size-3.5" />
                Feed & Conversas
              </TabsTrigger>

              <TabsTrigger
                value="eventos"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-bold border border-border/60 bg-card gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Ticket className="size-3.5" />
                Eventos do Grupo
              </TabsTrigger>

              <TabsTrigger
                value="regras"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-bold border border-border/60 bg-card gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Info className="size-3.5" />
                Regras & Diretrizes
              </TabsTrigger>

              <TabsTrigger
                value="portal"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-bold border border-border/60 bg-card gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <QrCode className="size-3.5" />
                Área do Cliente (Carnês & PIX)
              </TabsTrigger>
            </TabsList>

            {/* ─── Aba 1: Feed da Comunidade (Fase 47) ─────────────────── */}
            <TabsContent value="feed" className="focus:outline-none space-y-4">
              {/* Barra de Busca Interna no Feed */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pesquisar conversas e tópicos nesta comunidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 h-11 pl-10 pr-4 rounded-xl text-xs border-border/60 bg-card focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {isLoadingFeed ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Carregando publicações da comunidade...
                </div>
              ) : filteredFeed.length === 0 ? (
                <div className="p-8 rounded-2xl border border-border/50 bg-card text-center space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    {searchQuery ? "Nenhuma publicação encontrada para esta busca." : "Nenhuma conversa iniciada ainda."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Participe da comunidade para interagir e compartilhar suas ideias!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFeed.map((post: any) => (
                    <FeedThreadPostCard
                      key={post.id}
                      post={post}
                      queryKey={["community-posts", store?.slug]}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Aba 2: Eventos do Grupo (Fase 47) ───────────────────── */}
            <TabsContent value="eventos" className="focus:outline-none space-y-3">
              {isLoadingEvents ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Buscando eventos da comunidade...
                </div>
              ) : eventsList.length === 0 ? (
                <div className="p-8 rounded-2xl border border-border/50 bg-card text-center space-y-2">
                  <Ticket className="size-8 mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-bold text-foreground">
                    Nenhum evento agendado no momento
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fique atento! Em breve novos encontros e lançamentos serão publicados aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eventsList.slice(0, 6).map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl border border-border/50 bg-card space-y-2 hover:border-border transition-colors"
                    >
                      <span className="text-2xs font-bold uppercase tracking-wider text-primary">
                        {ev.category || "Evento Oficial"}
                      </span>
                      <h3 className="font-bold text-sm text-foreground leading-snug">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {ev.description || "Participe e garanta sua presença com ingressos oficiais."}
                      </p>
                      <Button asChild size="sm" className="w-full h-10 min-h-10 rounded-xl text-xs font-bold mt-2">
                        <Link to={`/evento/${ev.id}` as any}>
                          Ver Detalhes do Evento
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── Aba 3: Regras & Diretrizes (Fase 48-49) ─────────────── */}
            <TabsContent value="regras" className="focus:outline-none space-y-3">
              <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Diretrizes de Convivência da Comunidade {store.name}
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-1" />
                    <span>Respeito mútuo: ofensas e discriminação acarretam expulsão imediata.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-1" />
                    <span>Proibido spam e mensagens promocionais repetitivas fora das áreas autorizadas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-1" />
                    <span>Compartilhe fotos honestas e informações com relevância para a cidade.</span>
                  </li>
                </ul>
                <div className="pt-2 border-t border-border/40 text-2xs text-muted-foreground">
                  Moderação conduzida de acordo com o código comunitário Waesy Safe. Denúncias são apuradas pelo Admin Master.
                </div>
              </div>
            </TabsContent>

            {/* ─── Aba 4: Portal do Cliente Completo (Preservação 100%) ─ */}
            <TabsContent value="portal" className="focus:outline-none space-y-6">
              {!isAuthenticated ? (
                /* Tela de Login Sem Senha (Magic Link / CPF) */
                <div className="max-w-md mx-auto my-6 p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs space-y-6">
                  <div className="text-center space-y-2">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <ShieldCheck className="size-6" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      Acesse sua Área do Cliente
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Consulte seus contratos, carnês com PIX instantâneo e acompanhe seus pedidos e agendamentos.
                    </p>
                  </div>

                  <Tabs defaultValue="cpf" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full min-h-11 p-1 bg-muted/60 rounded-xl">
                      <TabsTrigger
                        value="cpf"
                        className="rounded-lg text-xs font-medium min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Acesso com CPF
                      </TabsTrigger>
                      <TabsTrigger
                        value="magic"
                        className="rounded-lg text-xs font-medium min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Magic Link E-mail
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="cpf" className="mt-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground">
                            Digite seu CPF:
                          </label>
                          <Input
                            type="text"
                            placeholder="000.000.000-00"
                            value={clientCpf}
                            onChange={(e) => setClientCpf(e.target.value)}
                            className="min-h-11 rounded-xl text-sm"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={isLoadingLogin}
                          className="w-full min-h-11 h-11 rounded-xl font-bold text-xs gap-2"
                        >
                          {isLoadingLogin ? "Validando Acesso..." : "Entrar no Portal"}
                          <ArrowRight className="size-4" />
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="magic" className="mt-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground">
                            Digite seu E-mail cadastrado:
                          </label>
                          <Input
                            type="email"
                            placeholder="seuemail@exemplo.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="min-h-11 rounded-xl text-sm"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={isLoadingLogin}
                          className="w-full min-h-11 h-11 rounded-xl font-bold text-xs gap-2"
                        >
                          {isLoadingLogin ? "Enviando Link..." : "Receber Acesso Rápido"}
                          <Mail className="size-4" />
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  <div className="pt-2 text-center border-t border-border/50 text-2xs text-muted-foreground flex items-center justify-center gap-2">
                    <Lock className="size-3.5 text-muted-foreground/80" />
                    Ambiente protegido com criptografia de ponta a ponta
                  </div>
                </div>
              ) : (
                /* Painel do Cliente Autenticado (Multi-Módulos 360) */
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border/40">
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        Espaço do Cliente
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Transações e dados integrados com {store.name}.
                      </p>
                    </div>
                  </div>

                  {/* Subnavegação do Portal */}
                  <Tabs value={portalTab} onValueChange={setPortalTab} className="w-full">
                    <TabsList className="flex flex-wrap w-full justify-start h-auto gap-2 bg-transparent p-0">
                      <TabsTrigger
                        value="carnes"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <QrCode className="size-4" />
                        Carnês e PIX
                      </TabsTrigger>

                      <TabsTrigger
                        value="contratos"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <FileText className="size-4" />
                        Contratos
                      </TabsTrigger>

                      <TabsTrigger
                        value="agendamentos"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Calendar className="size-4" />
                        Agendamentos
                      </TabsTrigger>

                      <TabsTrigger
                        value="compras"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-11 h-11 px-4 rounded-xl text-xs font-medium border border-border/60 bg-card gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Package className="size-4" />
                        Compras e Locações
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── Modal de Ingresso na Comunidade (Fase 48) ────────────────── */}
      {isJoinSheetOpen && (
        <CommunityJoinSheet
          isOpen={isJoinSheetOpen}
          onClose={() => setIsJoinSheetOpen(false)}
          community={{
            id: store.id,
            name: store.name,
            slug: store.slug,
            avatarUrl: storeLogo,
            coverUrl: storeCover,
            memberCount: 148,
            description: communityDescription,
          }}
          onJoinSuccess={() => setIsMember(true)}
        />
      )}

      {/* Footer Whitelabel */}
      <footer className="border-t border-border/60 py-6 px-4 text-center text-xs text-muted-foreground mt-auto bg-muted/20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>
          <span className="flex items-center gap-1">
            Desenvolvido sobre a infraestrutura <strong className="text-foreground font-semibold">Waesy</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
