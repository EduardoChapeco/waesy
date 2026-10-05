import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/state/states";
import { SheetPage } from "@/components/ui/sheet-page";
import { getMyActivityHistory } from "@/services/admin-360-governance.functions";
import { formatDateTime } from "@/lib/datetime";
import {
  Activity,
  FileText,
  ShoppingCart,
  Car,
  Package,
  Search,
  Download,
  ShieldCheck,
  Clock,
  ArrowRight,
  Filter,
  Eye,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/atividade")({
  head: () => ({
    meta: [
      { title: "Minha Atividade | Transparência & Privacidade Waesy" },
      {
        name: "description",
        content:
          "Consulte o histórico unificado de formulários, carrinhos, compras e corridas registradas na sua conta.",
      },
    ],
  }),
  loader: async () => {
    try {
      const res = await getMyActivityHistory({
        data: { category: "all", limit: 50 },
      }).catch(() => ({
        success: false,
        timeline: [],
        stats: { forms: 0, cart: 0, mobility: 0, orders: 0, total: 0 },
        nextCursor: null,
      }));
      return res;
    } catch {
      return {
        success: false,
        timeline: [],
        stats: { forms: 0, cart: 0, mobility: 0, orders: 0, total: 0 },
        nextCursor: null,
      };
    }
  },
  component: MyActivityPage,
  errorComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20">
      <ErrorState
        title="Histórico Indisponível"
        description="Não foi possível carregar a sua trilha de atividade no momento. Tente novamente."
        onRetry={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    </div>
  ),
});

type CategoryFilter = "all" | "forms" | "cart" | "mobility" | "orders";

function MyActivityPage() {
  const initialData = Route.useLoaderData() as any;
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const stats = initialData?.stats || {
    forms: 0,
    cart: 0,
    mobility: 0,
    orders: 0,
    total: 0,
  };

  const timeline = initialData?.timeline || [];

  const filteredItems = useMemo(() => {
    return timeline.filter((item: any) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      const descMatch = (item.description || "").toLowerCase().includes(q);
      const routeMatch = (item.route || "").toLowerCase().includes(q);
      return titleMatch || descMatch || routeMatch;
    });
  }, [timeline, activeCategory, searchQuery]);

  const handleExportJson = () => {
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(timeline, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `waesy-minha-atividade-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Relatório de atividade exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar arquivo de exportação.");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "forms":
        return <FileText className="size-4 text-primary" />;
      case "cart":
        return <ShoppingCart className="size-4 text-amber-500" />;
      case "mobility":
        return <Car className="size-4 text-emerald-500" />;
      case "orders":
        return <Package className="size-4 text-blue-500" />;
      default:
        return <Activity className="size-4 text-muted-foreground" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "forms":
        return <Badge variant="secondary">Formulário</Badge>;
      case "cart":
        return <Badge variant="outline">Carrinho</Badge>;
      case "mobility":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Mobilidade</Badge>;
      case "orders":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Pedido</Badge>;
      default:
        return <Badge variant="outline">Geral</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <NativeMobileHeader title="Minha Atividade" />

      {/* Header com contextualização LGPD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Activity className="size-6 text-primary" />
            Minha Atividade
          </h1>
          <p className="text-sm text-muted-foreground">
            Transparência e controle integral sobre suas interações, compras e formulários salvos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="size-4" />
            <span>Exportar Dados</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 border rounded-lg bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Formulários</span>
            <FileText className="size-4" />
          </div>
          <span className="text-2xl font-bold font-mono text-foreground">
            {stats.forms}
          </span>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Eventos de Carrinho</span>
            <ShoppingCart className="size-4" />
          </div>
          <span className="text-2xl font-bold font-mono text-foreground">
            {stats.cart}
          </span>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Corridas & Fretes</span>
            <Car className="size-4" />
          </div>
          <span className="text-2xl font-bold font-mono text-foreground">
            {stats.mobility}
          </span>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Pedidos Concluídos</span>
            <Package className="size-4" />
          </div>
          <span className="text-2xl font-bold font-mono text-foreground">
            {stats.orders}
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Chips de Categoria */}
        <div className="flex items-center gap-2 flex-wrap pb-1">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("all")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Todas ({stats.total})
          </Button>
          <Button
            variant={activeCategory === "forms" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("forms")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Formulários ({stats.forms})
          </Button>
          <Button
            variant={activeCategory === "cart" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("cart")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Carrinho ({stats.cart})
          </Button>
          <Button
            variant={activeCategory === "mobility" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("mobility")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Mobilidade ({stats.mobility})
          </Button>
          <Button
            variant={activeCategory === "orders" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("orders")}
            className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            Compras ({stats.orders})
          </Button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar atividade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Lista da Linha do Tempo */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Activity}
              title="Nenhuma atividade encontrada"
              description="Nenhum registro corresponde aos filtros selecionados no momento."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item: any) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted border shrink-0 mt-1">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {item.title}
                      </span>
                      {getCategoryBadge(item.category)}
                      {item.route && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.route}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDateTime(item.timestamp)}
                      </span>
                      {item.ip && <span>IP: {item.ip}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItem(item)}
                    className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Eye className="size-4" />
                    <span>Detalhes</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SheetPage de Detalhes do Registro de Atividade */}
      <SheetPage
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        title="Detalhes do Registro de Atividade"
        size="default"
        footer={
          <Button
            variant="outline"
            onClick={() => setSelectedItem(null)}
            className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary"
          >
            Fechar
          </Button>
        }
      >
        {selectedItem && (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1 border">
              <span className="font-bold text-muted-foreground block text-xs">
                Identificador do Registro:
              </span>
              <p className="font-mono font-bold text-primary break-all">
                {selectedItem.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-xs">Categoria</span>
                <span className="font-bold capitalize">{selectedItem.category}</span>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-xs">Data e Hora</span>
                <span className="font-bold">{formatDateTime(selectedItem.timestamp)}</span>
              </div>
            </div>

            {selectedItem.route && (
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-xs">Rota Acessada</span>
                <span className="font-mono font-bold">{selectedItem.route}</span>
              </div>
            )}

            {/* Metadados / Payload Sanitizado */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                  Conteúdo do Evento (Sanitizado LGPD)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedItem.metadata || selectedItem.details || {}, null, 2)
                    );
                    toast.success("Conteúdo copiado!");
                  }}
                  className="h-11 min-h-11 px-3 text-xs font-bold gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
              <pre className="p-3 bg-muted/60 rounded-lg border font-mono text-xs max-h-60 whitespace-pre-wrap break-all">
                {JSON.stringify(selectedItem.metadata || selectedItem.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </SheetPage>
    </div>
  );
}
export default MyActivityPage;
