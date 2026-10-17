import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getTravelQuoteBundleBySlug } from "@/services/travel-financials.functions";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  Users,
  Building2,
  Plane,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/orcamentos/$bundleSlug")({
  head: ({ loaderData }) => {
    const bundle = (loaderData as any)?.bundle;
    const title = bundle?.title
      ? `${bundle.title} — Comparativo de Orçamentos | Waesy Viagens`
      : "Proposta Comparativa de Viagem | Waesy";
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            bundle?.intro_notes ||
            "Compare as opções selecionadas pela sua agência de viagens e escolha o pacote ideal.",
        },
      ],
    };
  },
  loader: async ({ params }) => {
    try {
      const bundle = await getTravelQuoteBundleBySlug({
        data: { slug: params.bundleSlug },
      }).catch(() => null);
      return { bundle };
    } catch {
      return { bundle: null };
    }
  },
  component: QuoteBundleComparisonPage,
});

function QuoteBundleComparisonPage() {
  const { bundle } = (Route.useLoaderData?.() as any) || {};
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!bundle || !Array.isArray(bundle.items) || bundle.items.length === 0) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Plane className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Caderno de Orçamentos não encontrado</h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
          Este link de proposta múltipla pode ter expirado ou foi atualizado pelo seu consultor de viagens.
        </p>
        <Button asChild className="h-11 px-5 rounded-lg font-bold">
          <Link to="/classificados">Explorar Vitrines</Link>
        </Button>
      </div>
    );
  }

  const items = bundle.items;
  const activeItem = items[selectedIndex] || items[0];
  const activeListing = activeItem?.listing
    ? {
        ...activeItem.listing,
        price_cents:
          activeItem.custom_price_cents != null && activeItem.custom_price_cents > 0
            ? activeItem.custom_price_cents
            : activeItem.listing.price_cents,
        is_custom_quote: true,
        visibility_mode: "unlisted",
        passenger_composition:
          bundle.passenger_composition ||
          activeItem.listing.passenger_composition ||
          activeItem.listing.attributes?.passenger_composition,
      }
    : null;

  const comp = bundle.passenger_composition || { adults: 2, children: 0, children_max_age: 12 };

  const handleCopyBundleLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do comparativo de orçamentos copiado!");
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Header Especial de Comparação de Múltiplos Orçamentos ── */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 space-y-3">
          {/* Topo: Identificação do Cliente, Agência e Composição */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/classificados"
                className="size-11 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted flex items-center justify-center text-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
                    Proposta Comparativa ({items.length} Opções)
                  </Badge>
                  {bundle.client_name && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Preparado para: <strong className="text-foreground">{bundle.client_name}</strong>
                    </span>
                  )}
                </div>
                <h1 className="text-sm sm:text-base font-black text-foreground truncate mt-1">
                  {bundle.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-xs font-semibold text-foreground">
                <Users className="size-3.5 text-primary" />
                <span>
                  {comp.adults || 2} Adulto(s)
                  {comp.children > 0
                    ? ` + ${comp.children} Criança(s) (até ${comp.children_max_age || 12} anos)`
                    : ""}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyBundleLink}
                className="h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
              >
                <Share2 className="size-3.5" />
                <span>Compartilhar Proposta</span>
              </Button>
            </div>
          </div>

          {/* Barra Seletora de Opções (Abas Comparativas Táteis) */}
          <div className="flex items-stretch gap-2 overflow-x-auto carousel no-scrollbar pb-1">
            {items.map((item: any, idx: number) => {
              const isSelected = idx === selectedIndex;
              const listing = item.listing || {};
              const effectivePrice =
                item.custom_price_cents != null && item.custom_price_cents > 0
                  ? item.custom_price_cents
                  : listing.price_cents || 0;
              const hotelName =
                listing.attributes?.lodgings?.[0]?.name ||
                listing.attributes?.hotel_name ||
                listing.attributes?.destination_city ||
                "Ver detalhes completos";

              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`min-h-14 px-4 py-2 rounded-lg border text-left transition-colors shrink-0 min-w-60 sm:min-w-68 flex items-center justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background hover:bg-muted/60 text-foreground border-border/70"
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        {item.option_label || `Opção ${idx + 1}`}
                      </span>
                      {item.badge_text && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            isSelected
                              ? "bg-background/20 text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {item.badge_text}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold truncate max-w-44 ${
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {listing.title || "Pacote Personalizado"}
                    </p>
                    <p
                      className={`text-xs truncate max-w-44 flex items-center gap-1 ${
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      <Building2 className="size-3 shrink-0" />
                      <span>{hotelName}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {effectivePrice > 0 ? (
                      <span className="text-sm font-black font-mono block">
                        {formatMoney(effectivePrice)}
                      </span>
                    ) : (
                      <span className="text-xs font-bold block">Sob consulta</span>
                    )}
                    <span
                      className={`text-xs inline-flex items-center gap-1 font-semibold ${
                        isSelected ? "text-primary-foreground/90" : "text-primary"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="size-3" />
                          <span>Visualizando</span>
                        </>
                      ) : (
                        <span>Comparar</span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nota do Consultor para a Opção Ativa */}
          {(activeItem?.advisor_notes || bundle.intro_notes) && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs text-foreground">
              <Sparkles className="size-4 text-primary shrink-0 mt-1" />
              <div>
                <span className="font-bold text-primary mr-2">
                  Nota do Consultor ({activeItem?.option_label || `Opção ${selectedIndex + 1}`}):
                </span>
                <span>{activeItem?.advisor_notes || bundle.intro_notes}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Vitrine Editorial Completa da Opção Selecionada ── */}
      {activeListing && <EditorialShowcaseView classified={activeListing} isOwner={false} />}
    </div>
  );
}
