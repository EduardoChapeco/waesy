import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  ArrowUpRight,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  Kanban,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Tag,
  ShieldCheck,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FilterBottomSheet, FilterTriggerButton } from "@/components/workspace/filter-bottom-sheet";
import { listCustomers } from "@/services/crm.functions";
import { getDashboardData } from "@/services/dashboard.functions";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/crm")({
  head: () => ({
    meta: [{ title: "Central de CRM & Clientes | Workspace Waesy" }],
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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const { data: customers = initialCustomers, isLoading } = useQuery({
    queryKey: ["workspace-crm-customers", statusFilter],
    queryFn: () => listCustomers({ data: { status: statusFilter } }),
    initialData: initialCustomers,
  });

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.document?.includes(q)
    );
  }, [customers, search]);

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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. TopBar Direta (Silêncio Operacional & Layout Compacto) ── */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-border/40 pb-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Users className="size-4 sm:size-5" />
            </span>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Central de CRM
            </h1>
            <Badge variant="outline" className="text-[11px] sm:text-xs font-mono py-0 px-2 border-primary/30 text-primary">
              {metrics.total} contatos
            </Badge>
          </div>
          <p className="hidden sm:block text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gestão de relacionamento, carteira de clientes e histórico de interações.
          </p>
        </div>

        {/* Ações no Desktop */}
        <div className="hidden sm:flex items-center gap-2">
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

          <Button asChild size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-4 bg-primary text-primary-foreground">
            <Link to="/workspace/clientes" search={{ novo: true } as any}>
              <Plus className="size-4" />
              <span>Novo Cliente</span>
            </Link>
          </Button>
        </div>

        {/* Ações no Mobile (Linha Única Compacta com Kebab) */}
        <div className="flex sm:hidden items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl border-border/70 text-muted-foreground"
                title="Mais ações"
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

          <Button asChild size="sm" className="rounded-xl text-xs font-bold h-9 px-3 bg-primary text-primary-foreground">
            <Link to="/workspace/clientes" search={{ novo: true } as any}>
              <Plus className="size-3.5 mr-1" />
              <span>Novo</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Grid de Métricas Reais ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clientes Cadastrados</span>
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{metrics.total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Base ativa na loja</p>
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Compras e contatos regulares</p>
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Últimos 30 dias</p>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">LTV Médio por Cliente</span>
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-foreground font-mono">{formatMoney(metrics.avgTicketCents)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Histórico acumulado</p>
          </div>
        </Card>
      </div>

      {/* ── 3. Barra de Busca e Filtros (Linha Única Cravada) ── */}
      <div className="flex flex-row items-center justify-between gap-2 bg-card p-2 sm:p-3 rounded-2xl border border-border/60">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone, email ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 h-10 rounded-xl text-xs bg-background border-border/60 w-full"
          />
        </div>

        {/* Gatilho de Filtro no Mobile (Abre Bottom Sheet) */}
        <div className="flex sm:hidden">
          <FilterTriggerButton
            onClick={() => setIsFilterSheetOpen(true)}
            activeCount={statusFilter !== "all" ? 1 : 0}
          />
        </div>

        {/* Filtros em Linha no Desktop */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: "all", label: "Todos" },
            { id: "active", label: "Ativos" },
            { id: "inactive", label: "Inativos" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                statusFilter === f.id
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Sheet de Filtros para Mobile */}
      <FilterBottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title="Filtros do CRM"
        description="Filtre os contatos por status e disponibilidade."
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
        ]}
      />

      {/* ── 4. Tabela / Listagem de Clientes ── */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Nenhum contato encontrado" : "Nenhum cliente cadastrado ainda"}
          description={
            search
              ? "Tente buscar com outro termo ou limpe os filtros."
              : "Cadastre novos clientes ou importe sua base para gerenciar contatos e histórico."
          }
          actionLabel="Cadastrar Primeiro Cliente"
          onAction={() => router.navigate({ to: "/workspace/clientes", search: { novo: true } as any })}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
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
                              <p className="text-[10px] text-muted-foreground font-mono">
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
                            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {customer.email}
                            </p>
                          )}
                          {!customer.phone && !customer.email && (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <Badge
                          variant={customer.status === "active" ? "default" : "secondary"}
                          className="text-[10px] font-mono capitalize"
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
    </div>
  );
}
