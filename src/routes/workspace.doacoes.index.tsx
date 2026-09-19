import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gift,
  Heart,
  Plus,
  ArrowUpRight,
  Eye,
  MapPin,
  Tag,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/commerce/page-header";
import { listStoreDonations } from "@/services/classifieds.functions";

export const Route = createFileRoute("/workspace/doacoes/")({
  head: () => ({ meta: [{ title: "Doações & Solidariedade | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const donations = await listStoreDonations().catch(() => []);
      return { donations: donations || [] };
    } catch (err) {
      console.warn("[workspace.doacoes] Loader fallback:", err);
      return { donations: [] };
    }
  },
  component: WorkspaceDoacoesHubPage,
});

function WorkspaceDoacoesHubPage() {
  const loaderData = Route.useLoaderData();

  const { data: donations = loaderData.donations } = useQuery({
    queryKey: ["workspace", "store-donations"],
    queryFn: () => listStoreDonations(),
    initialData: loaderData.donations,
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── CABEÇALHO COM AÇÃO RÁPIDA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader title="Doações & Campanhas Solidárias" />
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestão de desapegos gratuitos, doações de móveis, alimentos, roupas e equipamentos da sua loja para a comunidade local.
          </p>
        </div>

        <Button asChild size="sm" className="h-9 px-3.5 gap-1.5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs">
          <Link to="/conta/classificados/novo" search={{ tipo: "doacao" }}>
            <Plus className="size-3.5" />
            <span>Cadastrar Doação Gratuita</span>
          </Link>
        </Button>
      </div>

      {/* ── CARDS DE IMPACTO COMUNITÁRIO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Itens em Doação</span>
            <Gift className="size-4 text-emerald-500" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {donations.length}
          </strong>
          <span className="text-[11px] text-muted-foreground block">Disponíveis gratuitamente</span>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Custo para a Comunidade</span>
            <Heart className="size-4 text-rose-500" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            R$ 0,00
          </strong>
          <span className="text-[11px] text-muted-foreground block">100% solidário e sem taxas</span>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Retirada / Localização</span>
            <MapPin className="size-4 text-primary" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold text-foreground">
            Ponto da Loja
          </strong>
          <span className="text-[11px] text-muted-foreground block">Retirada direta no balcão</span>
        </div>
      </div>

      {/* ── LISTAGEM DE DOAÇÕES ── */}
      <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="size-4 text-rose-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Campanhas e Itens Ativos
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {donations.length} {donations.length === 1 ? "item" : "itens"}
          </Badge>
        </div>

        {donations.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <Heart className="size-10 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Nenhuma doação cadastrada no momento</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Ajude famílias e projetos sociais da sua cidade doando itens excedentes, mostruários ou organizando campanhas solidárias.
              </p>
            </div>
            <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold">
              <Link to="/conta/classificados/novo" search={{ tipo: "doacao" }}>
                <Plus className="size-3.5 mr-1.5" />
                <span>Criar Primeira Doação</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {donations.map((item: any) => {
              const img = (Array.isArray(item.images) && item.images[0]) || (Array.isArray(item.media) && item.media[0]) || null;
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="size-14 rounded-xl bg-muted/40 border border-border/50 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={item.title} className="size-full object-cover" />
                      ) : (
                        <Tag className="size-5 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{item.title}</span>
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                          Gratuito
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                        {item.content || "Sem descrição adicional informada."}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {item.location_name || "No balcão da loja"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5 rounded-lg text-xs font-medium">
                      <Link to="/classificados/$id" params={{ id: item.id }}>
                        <Eye className="size-3.5 mr-1.5" />
                        <span>Vitrine</span>
                        <ArrowUpRight className="size-3 ml-0.5 opacity-60" />
                      </Link>
                    </Button>

                    <Button asChild size="sm" className="h-8 px-2.5 rounded-lg text-xs font-medium">
                      <Link to="/conta/classificados/novo" search={{ tipo: "doacao", editId: item.id }}>
                        <span>Editar</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
