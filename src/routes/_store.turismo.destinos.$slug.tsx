import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  Calendar,
  Plane,
  Sun,
  Utensils,
  ChevronLeft,
  Share2,
  Compass,
  Building,
  Check,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import {
  getPublicDestinationBySlug,
  type PublicDestinationViewDTO,
} from "@/services/travel-catalog.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/turismo/destinos/$slug")({
  head: ({
    loaderData,
  }: {
    loaderData?: { destination: PublicDestinationViewDTO | null };
  }) => {
    const d = loaderData?.destination;
    const title = d
      ? `Guia de Viagem: ${d.name} (${d.state}) | Turismo Waesy`
      : "Destino Turístico | Waesy";
    const description = d?.description
      ? d.description.slice(0, 160)
      : "Descubra as melhores atrações, praias, hotéis e dicas de viagem no Waesy.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(d?.cover_image_url ? [{ property: "og:image", content: d.cover_image_url }] : []),
      ],
      scripts: d
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TouristDestination",
                name: d.name,
                description: d.description || "",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: d.city,
                  addressRegion: d.state,
                  addressCountry: d.country,
                },
              }),
            },
          ]
        : [],
    };
  },
  loader: async ({ params }) => {
    try {
      const destination = await getPublicDestinationBySlug({ data: { slug: params.slug } });
      return { destination };
    } catch (err: any) {
      console.error("[loader:_store.turismo.destinos.$slug] Erro:", err?.message);
      return { destination: null };
    }
  },
  component: PublicDestinationDetailPage,
});

function PublicDestinationDetailPage() {
  const { destination } = Route.useLoaderData() as {
    destination: PublicDestinationViewDTO | null;
  };
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  if (!destination) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <div className="inline-flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2">
          <Compass className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Destino Não Encontrado</h1>
        <p className="text-sm text-muted-foreground">
          O destino turístico informado não consta em nossa base oficial ou foi renomeado.
        </p>
        <Button asChild className="h-11 min-h-11 rounded-lg font-semibold px-6 cursor-pointer">
          <Link to={"/turismo" as any}>
            Voltar para Turismo
          </Link>
        </Button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: destination.name,
        text: `Guia de viagem para ${destination.name}:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do destino copiado!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Fixo */}
      <div className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link
            to={"/turismo" as any}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground h-11 min-h-11 px-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Voltar para Turismo"
          >
            <ChevronLeft className="size-4" />
            <span>Turismo</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center size-11 min-h-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Compartilhar destino"
            >
              <Share2 className="size-4" />
            </button>
            <Button
              onClick={() => setIsQuoteModalOpen(true)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold cursor-pointer"
            >
              Planejar Viagem
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 space-y-8">
        {/* Banner Hero */}
        <div className="relative aspect-video sm:aspect-[21/9] w-full overflow-hidden rounded-lg bg-muted border border-border/80">
          {destination.cover_image_url ? (
            <img
              src={destination.cover_image_url}
              alt={destination.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted/40">
              <Compass className="size-16 text-muted-foreground/40" />
            </div>
          )}
          {/* design-lint-ignore DL-08 reason:"Scrim fotografico para contraste sobre imagem per B.32" expiry:"2027-12-31" */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground border-none font-bold text-xs">
                Destino Oficial
              </Badge>
              {destination.iata_gateway && (
                <Link
                  to={"/aeroporto/$iata" as any}
                  params={{ iata: destination.iata_gateway } as any}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-background/80 hover:bg-background backdrop-blur-md text-foreground font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plane className="size-3.5" />
                  Aeroporto {destination.iata_gateway} — Ver Detalhes
                </Link>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              {destination.name}
            </h1>
            <p className="text-sm sm:text-base text-foreground/80 flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-foreground" />
              <span>{destination.city}, {destination.state} • {destination.country}</span>
            </p>
          </div>
        </div>

        {/* Ficha Rápida do Destino */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {destination.best_season && (
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-primary" />
                Melhor Época para Visitar
              </span>
              <p className="text-sm font-semibold text-foreground">
                {destination.best_season}
              </p>
            </div>
          )}

          {destination.climate_type && (
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Sun className="size-3.5 text-amber-500" />
                Clima Predominante
              </span>
              <p className="text-sm font-semibold text-foreground">
                {destination.climate_type}
              </p>
            </div>
          )}

          {destination.gastronomy_tip && (
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Utensils className="size-3.5 text-primary" />
                Dica Gastronômica
              </span>
              <p className="text-sm font-semibold text-foreground line-clamp-2">
                {destination.gastronomy_tip}
              </p>
            </div>
          )}
        </div>

        {/* Descrição e Highlights */}
        {destination.description && (
          <div className="rounded-lg border border-border/80 bg-card p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Sobre o Destino</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {destination.description}
            </p>

            {destination.highlights && destination.highlights.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border/60">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Principais Atrativos & Passeios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {destination.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="size-3.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hotéis & Resorts no Destino */}
        {destination.hotels && destination.hotels.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Onde Ficar em {destination.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Hotéis e resorts recomendados no banco central.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {destination.hotels.map((h) => (
                <Link
                  key={h.id}
                  to={"/turismo" as any}
                  className="rounded-lg border border-border/80 bg-card overflow-hidden hover:border-primary/50 transition-colors flex flex-col justify-between group"
                >
                  {h.cover_photo_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={h.cover_photo_url}
                        alt={h.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                        <Star className="size-3 fill-amber-500" />
                        <span>{h.stars}</span>
                        <span className="text-muted-foreground ml-1">
                          • {h.regime_options?.[0] || "Hospedagem"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {h.name}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ver Detalhes</span>
                      <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground">
                        Conhecer
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal de Cotação */}
      <TravelQuoteModal
        open={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        initialDestination={destination.name}
      />
    </div>
  );
}
