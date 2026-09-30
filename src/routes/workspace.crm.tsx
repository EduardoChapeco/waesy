import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Plus, Phone, Mail, ArrowUpRight, TrendingUp, MessageCircle, ExternalLink, ChevronRight, Filter, DollarSign, Kanban, CheckCircle2, Clock, UserCheck, Building2, Tag, ShieldCheck, MoreHorizontal, SlidersHorizontal, X, ChevronDown, ChevronUp, Globe, Share2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FilterBottomSheet, FilterTriggerButton } from "@/components/workspace/filter-bottom-sheet";
import { StorePersonasMatrix } from "@/components/workspace/crm/store-personas-matrix";
import { listCustomers } from "@/services/crm.functions";
import { getDashboardData } from "@/services/dashboard.functions";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/crm")({
  head: () => ({
    meta: [{ title: "CRM | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [customers, dashboardMetrics] = await Promise.all([
        listCustomers({ data: { status: "all" } }).catch(() => []),
        getDashboardData().catch(() => null),
      ]);
      return {
        initialCustomers: customers || [],
        dashboardMetrics,
      };
    } catch (err) {
      console.error("[loader:workspace.crm] Loader fallback:", err);
      return {
        initialCustomers: [],
        dashboardMetrics: null,
      };
    }
  },
  component: WorkspaceCrmPage,
});

export default function WorkspaceCrmPage() {
  const { initialCustomers, dashboardMetrics } = Route.useLoaderData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [showMetricsMobile, setShowMetricsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"clientes" | "personas">("clientes");

  const { data: customers = initialCustomers } = useQuery({
    queryKey: ["workspace-crm-customers", statusFilter, channelFilter],
    queryFn: () => listCustomers({ data: { status: statusFilter, channel: channelFilter } }),
    initialData: initialCustomers,
  });

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (channelFilter !== "all") {
      list = list.filter((c: any) => (c.channel || "").toLowerCase() === channelFilter.toLowerCase());
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c: any) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.document?.includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [customers, search, channelFilter]);

  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c: any) => c.status === "active").length;
    const totalLtvCents = customers.reduce((acc: number, c: any) => acc + (c.total_spent_cents || 0), 0);
    const avgTicketCents = total > 0 ? Math.round(totalLtvCents / total) : 0;
    return {
      total,
      active,
      totalLtvCents,
      avgTicketCents,
      newCustomers30d: dashboardMetrics?.newCustomers30d ?? 0,
    };
  }, [customers, dashboardMetrics]);

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (channelFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. TopBar Direta (Linha 1 no Mobile: Título + Badge + Menu Kebab) ── */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Users className="size-4 sm:size-5" />
          </span>
          <h1 className="text-base sm:text-2xl font-bold tracking-tight text-foreground truncate">
            CRM
          </h1>
          <Badge variant="outline" className="text-xs sm:text-xs font-mono py-0 px-2 border-primary/30 text-primary shrink-0">
            {metrics.total} contatos
          </Badge>
        </div>

        {/* Ações no Desktop */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-3.5">
            <Link to="/workspace/comercial">
              <Kanban className="size-3.5 text-primary" />
              <span>Funil Comercial</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-3.5">
            <Link to="/workspace/clientes">
              <Users className="size-3.5" />
              <span>Base Completa</span>
            </Link>
          </Button>
        </div>

        {/* Ações Secundárias no Mobile (Kebab + Toggle de Métricas) */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMetricsMobile((prev) => !prev)}
            className="h-9 px-2 text-xs text-muted-foreground font-medium gap-1 rounded-xl"
            title="Alternar resumo de métricas"
          >
            <span>Métricas</span>
            {showMetricsMobile ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl border-border/70 text-muted-foreground"
                title="Mais opções"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl min-w-[170px]">
              <DropdownMenuItem asChild className="text-xs gap-2 font-medium">
                <Link to="/workspace/comercial">
                  <Kanban className="size-3.5 text-primary" />
                  <span>Funil Comercial</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs gap-2 font-medium">
                <Link to="/workspace/clientes">
                  <Users className="size-3.5" />
                  <span>Base Completa</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Sub-Navegação Silenciosa: Clientes vs Personas Preditivas (50-Prompt Golden Codex) ── */}
      <div className="flex items-center gap-1 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("clientes")}
          className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "clientes"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="size-3.5" />
          <span>Clientes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("personas")}
          className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "personas"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Brain className="size-3.5" />
          <span>Personas</span>
        </button>
      </div>

      {activeTab === "personas" ? (
        <StorePersonasMatrix />
      ) : (
        <>
          {/* ── 2. Grid de Métricas (Visível sempre no Desktop; Alternável no Mobile) ── */}
          <div className={showMetricsMobile ? "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" : "hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"}>
        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Cadastrados</span>
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{metrics.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Base ativa na loja</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Ativos</span>
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{metrics.active}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Compras regulares</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Novos no Mês</span>
            <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{metrics.newCustomers30d}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">LTV Médio</span>
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{formatMoney(metrics.avgTicketCents)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico acumulado</p>
          </div>
        </Card>
      </div>

      {/* ── 3. Barra de Busca + Filtro + CTA Primário (Linha 2 Única Cravada em h-10) ── */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center w-full">
        {/* Input de Busca Fluido */}
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-10 rounded-xl text-xs bg-card border-border/60 w-full placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Botão de Filtros (Abre Bottom Sheet - Erradica empilhamento de selects) */}
        <FilterTriggerButton
          onClick={() => setIsFilterSheetOpen(true)}
          activeCount={activeFiltersCount}
          className="h-10 px-3 rounded-xl border-border/60 shrink-0 shadow-none text-xs"
        />

        {/* Botão Primário "+ Novo Cliente" Cravado em h-10 */}
        <Button
          asChild
          className="h-10 px-3 sm:px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0 shadow-none cursor-pointer"
        >
          <Link to="/workspace/clientes" search={{ novo: true } as any}>
            <Plus className="size-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Novo Cliente</span>
          </Link>
        </Button>
      </div>

      {/* ── BOTTOM SHEET DE FILTROS (Compactação Nativa Mobile & Desktop) ── */}
      <FilterBottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title="Filtros do CRM"
        description="Filtre os contatos por status e canal de aquisição."
        filters={[
          {
            id: "status",
            label: "Status dos Contatos",
            value: statusFilter,
            defaultValue: "all",
            options: [
              { label: "Todos os Status", value: "all", icon: Users },
              { label: "Apenas Ativos", value: "active", icon: CheckCircle2 },
              { label: "Inativos", value: "inactive", icon: Clock },
            ],
            onChange: (val) => setStatusFilter(val as any),
          },
          {
            id: "channel",
            label: "Canal de Aquisição",
            value: channelFilter,
            defaultValue: "all",
            options: [
              { label: "Todos os Canais", value: "all", icon: Globe },
              { label: "WhatsApp", value: "whatsapp", icon: MessageCircle },
              { label: "Balcão / Direto", value: "direct", icon: Building2 },
              { label: "Site / E-commerce", value: "site", icon: ExternalLink },
              { label: "Indicação", value: "indicacao", icon: Share2 },
              { label: "Instagram", value: "instagram", icon: Tag },
            ],
            onChange: (val) => setChannelFilter(val),
          },
        ]}
        onReset={() => {
          setStatusFilter("all");
          setChannelFilter("all");
        }}
      />

      {/* ── 4. Tabela / Listagem de Clientes ── */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || activeFiltersCount > 0 ? "Nenhum contato encontrado" : "Nenhum cliente cadastrado ainda"}
          description={
            search || activeFiltersCount > 0
              ? "Tente buscar com outro termo ou redefinir os filtros."
              : "Cadastre novos clientes ou importe sua base para gerenciar contatos e histórico."
          }
          actionLabel="Cadastrar Primeiro Cliente"
          onAction={() => router.navigate({ to: "/workspace/clientes", search: { novo: true } as any })}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {/* Visualização Mobile: WhatsApp List Edge-to-Edge (< 640px) */}
          <div className="sm:hidden divide-y divide-border/40">
            {filteredCustomers.map((customer: any) => {
              const phoneDigits = customer.phone ? customer.phone.replace(/\D/g, "") : "";
              return (
                <div key={customer.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                  <Link
                    to="/workspace/clientes/$id"
                    params={{ id: customer.id }}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {(customer.full_name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-foreground truncate">
                          {customer.full_name || "Cliente sem nome"}
                        </p>
                        {customer.status === "active" && (
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono text-foreground font-semibold">
                          {formatMoney(customer.total_spent_cents || 0)}
                        </span>
                        <span>•</span>
                        <span className="capitalize truncate">{customer.channel || "Direto"}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {phoneDigits && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          trackAndOpenWhatsApp(
                            phoneDigits,
                            `Olá, ${customer.full_name || ""}! Como posso ajudar você hoje?`
                          )
                        }
                        className="size-11 p-0 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageCircle className="size-5" />
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="size-11 p-0 rounded-xl cursor-pointer"
                    >
                      <Link to="/workspace/clientes/$id" params={{ id: customer.id }}>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visualização Desktop: Tabela de Alta Densidade (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <tr>
                  <th className="py-3 px-4 font-bold">Cliente</th>
                  <th className="py-3 px-4 font-bold hidden sm:table-cell">Contato</th>
                  <th className="py-3 px-4 font-bold hidden md:table-cell">Status</th>
                  <th className="py-3 px-4 font-bold hidden lg:table-cell">Canal</th>
                  <th className="py-3 px-4 font-bold text-right">LTV</th>
                  <th className="py-3 px-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredCustomers.map((customer: any) => {
                  const phoneDigits = customer.phone ? customer.phone.replace(/\D/g, "") : "";
                  return (
                    <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to="/workspace/clientes/$id"
                          params={{ id: customer.id }}
                          className="flex items-center gap-3 group"
                        >
                          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {(customer.full_name || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {customer.full_name || "Cliente sem nome"}
                            </p>
                            {customer.document && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {customer.document}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {customer.phone && (
                            <p className="text-xs font-mono text-foreground">{customer.phone}</p>
                          )}
                          {customer.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {customer.email}
                            </p>
                          )}
                          {!customer.phone && !customer.email && (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <Badge
                          variant={customer.status === "active" ? "default" : "secondary"}
                          className="text-xs font-mono capitalize"
                        >
                          {customer.status === "active" ? "Ativo" : customer.status || "Pendente"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground capitalize">
                          {customer.channel || "Direto"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-foreground text-xs">
                          {formatMoney(customer.total_spent_cents || 0)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {phoneDigits && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                trackAndOpenWhatsApp(
                                  phoneDigits,
                                  `Olá, ${customer.full_name || ""}! Como posso ajudar você hoje?`
                                )
                              }
                              className="size-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </Button>
                          )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
                          >
                            <Link to="/workspace/clientes/$id" params={{ id: customer.id }}>
                              <span>Ficha</span>
                              <ChevronRight className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
