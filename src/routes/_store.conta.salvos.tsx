import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Tag,
  ShoppingBag,
  Calendar,
  Trash2,
  ExternalLink,
  Loader2,
  MapPin,
  Clock,
  Layers,
  Scissors,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { listUserFavorites, toggleFavorite } from "@/services/favorites.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/_store/conta/salvos")({
  head: () => ({ meta: [{ title: "Meus Itens Salvos | Waesy" }] }),
  loader: async () => {
    try {
      const initialFavorites = await listUserFavorites({
        data: { entityType: "all" as any },
      }).catch(() => []);
      return { initialFavorites: initialFavorites || [] };
    } catch (err) {
      console.error("[loader:_store.conta.salvos] Unhandled error:", err);
      return { initialFavorites: [] };
    }
  },
  component: SavedItemsPage,
});

const TYPE_TABS = [
  { id: "all", label: "Todos", icon: Layers },
  { id: "product", label: "Produtos & Serviços", icon: ShoppingBag },
  { id: "classified", label: "Classificados", icon: Tag },
  { id: "event", label: "Eventos", icon: Calendar },
] as const;

function SavedItemsPage() {
  const { initialFavorites } = Route.useLoaderData() as { initialFavorites: any[] };
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["user-favorites", selectedType],
    queryFn: async () => {
      try {
        const res = await listUserFavorites({
          data: {
            entityType: selectedType as any,
          },
        });
        return res || [];
      } catch (err) {
        console.error("[salvos] listUserFavorites error:", err);
        return [];
      }
    },
    initialData: selectedType === "all" ? initialFavorites : undefined,
    retry: 1,
  });

  const removeMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["is-favorited"] });
      toast.success("Item removido dos salvos.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao remover item.");
    },
  });

  const handleRemove = (entityType: any, entityId: string) => {
    removeMutation.mutate({
      data: {
        entityType,
        entityId,
      },
    });
  };

  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    if (!searchQuery.trim()) return favorites;
    const q = searchQuery.toLowerCase().trim();
    return favorites.filter((fav: any) => {
      const item = fav.details;
      if (!item) return false;
      const name = (item.name || item.title || "").toLowerCase();
      const content = (item.content || item.description || "").toLowerCase();
      const loc = (item.location_name || "").toLowerCase();
      return name.includes(q) || content.includes(q) || loc.includes(q);
    });
  }, [favorites, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 1. Top Header Limpo & Direto (Apple HIG) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Salvos
          </h1>
          {filteredFavorites && filteredFavorites.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredFavorites.length}
            </Badge>
          )}
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-xl h-9 px-3.5 text-xs font-semibold cursor-pointer hover:bg-muted"
        >
          <Link to="/mercado">Explorar Vitrines</Link>
        </Button>
      </div>

      {/* ── 2. Toolbar: Trilho de Categorias com Scroll Horizontal + Busca Expansível Fixa ── */}
      <div className="flex items-center gap-2 w-full">
        {isSearchOpen ? (
          <div className="flex-1 flex items-center gap-2 bg-card border border-border/80 rounded-full px-3 py-1 animate-in fade-in zoom-in-95 duration-150 shadow-xs">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em itens salvos..."
              className="h-8 border-none bg-transparent p-0 text-xs focus-visible:ring-0 shadow-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar texto"
              >
                <X className="size-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-1 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Trilho com scroll horizontal para não empilhar linhas no mobile */}
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {TYPE_TABS.map((tab) => {
                const isActive = selectedType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedType(tab.id)}
                    className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                      isActive
                        ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                        : "bg-card text-muted-foreground hover:text-foreground border-border/70 hover:border-border"
                    }`}
                  >
                    {tab.icon && <tab.icon className="size-3.5 shrink-0" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Botão de busca fixo na extrema direita (NÃO tem scroll horizontal) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className={`size-9 rounded-full shrink-0 border-border/70 bg-card hover:bg-muted/40 cursor-pointer relative ${
                searchQuery ? "border-primary text-primary" : ""
              }`}
              title="Buscar em itens salvos"
            >
              <Search className="size-4" />
              {searchQuery && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* ── 3. Grid de Itens Salvos ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2.5">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs font-medium">Carregando itens salvos...</p>
        </div>
      ) : filteredFavorites && filteredFavorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {filteredFavorites.map((fav: any) => {
            const item = fav.details;
            if (!item) return null;

            if (fav.entity_type === "classified") {
              const cover =
                (item.images && item.images.length > 0 ? item.images[0] : null) ||
                (item.media && item.media.length > 0 ? item.media[0] : null);

              return (
                <div
                  key={fav.id}
                  className="bg-card rounded-2xl overflow-hidden border border-border/70 shadow-xs hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {cover ? (
                        <img src={cover} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                          <Tag className="size-8 stroke-[1.5]" />
                        </div>
                      )}
                      <Badge className="absolute top-2.5 left-2.5 text-[10px] uppercase font-bold rounded-full">
                        Classificado
                      </Badge>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                      <div className="pt-1.5 flex items-baseline justify-between">
                        <span className="text-sm sm:text-base font-black text-primary font-mono">
                          {item.price_cents ? formatMoney(item.price_cents) : "A Combinar"}
                        </span>
                        {item.location_name && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[130px]">
                            <MapPin className="size-3 text-primary shrink-0" />
                            {item.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-muted/20 flex items-center justify-between gap-2 border-t border-border/40">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-10 flex-1 font-semibold cursor-pointer"
                    >
                      <Link to="/classificados/$id" params={{ id: item.id }}>
                        <ExternalLink className="size-3.5 mr-1.5" />
                        <span>Ver Anúncio</span>
                      </Link>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(fav.entity_type, fav.entity_id)}
                      className="rounded-xl size-10 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Remover dos salvos"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            }

            if (fav.entity_type === "product") {
              const isService = item.is_service === true;
              const cover = item.images && item.images.length > 0 ? item.images[0] : null;

              return (
                <div
                  key={fav.id}
                  className="bg-card rounded-2xl overflow-hidden border border-border/70 shadow-xs hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {cover ? (
                        <img src={cover} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                          {isService ? (
                            <Scissors className="size-8 stroke-[1.5]" />
                          ) : (
                            <ShoppingBag className="size-8 stroke-[1.5]" />
                          )}
                        </div>
                      )}
                      <Badge
                        variant={isService ? "default" : "secondary"}
                        className="absolute top-2.5 left-2.5 text-[10px] uppercase font-bold rounded-full"
                      >
                        {isService ? "Serviço" : "Produto"}
                      </Badge>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {item.name}
                      </h3>
                      {isService && item.duration_minutes && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="size-3 text-primary" />
                          {item.duration_minutes} min
                        </p>
                      )}
                      <div className="pt-1.5 flex items-baseline justify-between">
                        <span className="text-sm sm:text-base font-black text-primary font-mono">
                          {formatMoney(item.price_cents)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-muted/20 flex items-center justify-between gap-2 border-t border-border/40">
                    {isService ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-10 flex-1 font-semibold cursor-pointer"
                      >
                        <Link to="/agendar/$id" params={{ id: item.id }}>
                          <ExternalLink className="size-3.5 mr-1.5" />
                          <span>Agendar Horário</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-10 flex-1 font-semibold cursor-pointer"
                      >
                        <Link to="/produto/$slug" params={{ slug: item.slug || item.id }}>
                          <ExternalLink className="size-3.5 mr-1.5" />
                          <span>Ver Produto</span>
                        </Link>
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(fav.entity_type, fav.entity_id)}
                      className="rounded-xl size-10 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Remover dos salvos"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            }

            if (fav.entity_type === "event") {
              return (
                <div
                  key={fav.id}
                  className="bg-card rounded-2xl overflow-hidden border border-border/70 shadow-xs hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                          <Calendar className="size-8 stroke-[1.5]" />
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="absolute top-2.5 left-2.5 text-[10px] uppercase font-bold bg-background rounded-full"
                      >
                        Evento
                      </Badge>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="pt-1.5 flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-primary">
                          {new Date(item.event_date).toLocaleDateString("pt-BR")}
                        </span>
                        {item.location_name && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[130px]">
                            <MapPin className="size-3 text-primary shrink-0" />
                            {item.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-muted/20 flex items-center justify-between gap-2 border-t border-border/40">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-10 flex-1 font-semibold cursor-pointer"
                    >
                      <Link to="/evento/$id" params={{ id: item.id }}>
                        <ExternalLink className="size-3.5 mr-1.5" />
                        <span>Ver Ingressos</span>
                      </Link>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(fav.entity_type, fav.entity_id)}
                      className="rounded-xl size-10 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Remover dos salvos"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : (
        <div className="border border-border/70 bg-card rounded-2xl p-6 sm:p-12 text-center space-y-3.5 shadow-xs max-w-xl mx-auto w-full">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Bookmark className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {searchQuery ? "Nenhum resultado encontrado" : "Nenhum item salvo"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `Nenhum item salvo corresponde à busca "${searchQuery}".`
                : "Salve produtos, anúncios ou eventos favoritos para consultá-los a qualquer momento."}
            </p>
          </div>
          {searchQuery ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="rounded-xl h-10 px-4 text-xs font-bold"
            >
              Limpar busca
            </Button>
          ) : (
            <Button asChild size="default" className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-bold gap-2 mt-1 shadow-xs cursor-pointer">
              <Link to="/mercado">
                <ShoppingBag className="size-4" />
                <span>Explorar Mercado</span>
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
