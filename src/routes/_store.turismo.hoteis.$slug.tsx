import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin,
  Star,
  Clock,
  ShieldCheck,
  Coffee,
  Waves,
  Utensils,
  Sparkles,
  BedDouble,
  Users,
  Maximize2,
  ChevronLeft,
  Share2,
  Phone,
  Globe,
  Check,
  Video as VideoIcon,
  Tag,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import {
  getPublicHotelBySlug,
  type PublicHotelViewDTO,
} from "@/services/travel-catalog.functions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/turismo/hoteis/$slug")({
  head: ({ loaderData }: { loaderData?: { hotel: PublicHotelViewDTO | null } }) => {
    const h = loaderData?.hotel;
    const title = h ? `${h.name} — ${h.city}, ${h.state} | Hotéis Waesy` : "Hotel | Waesy";
    const description = h?.description
      ? h.description.slice(0, 160)
      : "Conheça a infraestrutura, categorias de quartos e condições de hospedagem no Waesy.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(h?.cover_photo_url ? [{ property: "og:image", content: h.cover_photo_url }] : []),
      ],
      scripts: h
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Hotel",
                name: h.name,
                description: h.description || "",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: h.city,
                  addressRegion: h.state,
                  addressCountry: h.country,
                },
                starRating: {
                  "@type": "Rating",
                  ratingValue: h.stars || 4,
                },
              }),
            },
          ]
        : [],
    };
  },
  loader: async ({ params }) => {
    try {
      const hotel = await getPublicHotelBySlug({ data: { slug: params.slug } });
      return { hotel };
    } catch (err: any) {
      console.error("[loader:_store.turismo.hoteis.$slug] Erro:", err?.message);
      return { hotel: null };
    }
  },
  component: PublicHotelDetailPage,
});

function PublicHotelDetailPage() {
  const { hotel } = Route.useLoaderData() as { hotel: PublicHotelViewDTO | null };
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("visao_geral");
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  if (!hotel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <div className="inline-flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2">
          <Building className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Hotel Não Encontrado</h1>
        <p className="text-sm text-muted-foreground">
          O hotel ou resort solicitado não foi localizado no catálogo ou teve seu endereço alterado.
        </p>
        <Link to={"/turismo" as any}>
          <Button className="h-11 min-h-11 rounded-lg font-semibold px-6 cursor-pointer">
            Voltar para Turismo
          </Button>
        </Link>
      </div>
    );
  }

  const allPhotos = [
    ...(hotel.cover_photo_url ? [hotel.cover_photo_url] : []),
    ...(hotel.photos || []),
  ].filter(Boolean);

  const videoMedias = (hotel.media_items || []).filter((m) => m.media_type === "video");

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: hotel.name,
        text: `Confira os detalhes de ${hotel.name} em ${hotel.city}:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do hotel copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Barra Superior / Header de Navegação */}
      <div className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link
            to={"/turismo" as any}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground h-11 min-h-11 px-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              aria-label="Compartilhar hotel"
            >
              <Share2 className="size-4" />
            </button>
            <Button
              onClick={() => setIsQuoteModalOpen(true)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold cursor-pointer"
            >
              Solicitar Cotação
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-6 space-y-8">
        {/* Bloco de Título e Localização */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {hotel.name}
            </h1>
            {hotel.stars > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                <Star className="size-4 fill-amber-500" />
                {hotel.stars} Estrelas
              </span>
            )}
            {hotel.is_verified_canonical && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <ShieldCheck className="size-3 mr-1" />
                Registro Oficial Canônico
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <MapPin className="size-4 text-primary shrink-0" />
            <span>{hotel.city}, {hotel.state} • {hotel.country}</span>
            {hotel.address && <span className="text-xs text-muted-foreground">({hotel.address})</span>}
          </p>
        </div>

        {/* Galeria de Fotos em Alta Resolução */}
        {allPhotos.length > 0 && (
          <div className="space-y-3">
            <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-xl bg-muted border border-border/80">
              <img
                src={allPhotos[selectedPhotoIndex] || allPhotos[0]}
                alt={hotel.name}
                className="h-full w-full object-cover transition-all duration-300"
              />
              <div className="absolute bottom-3 right-3 rounded-lg bg-background/80 backdrop-blur-md px-3 py-1 text-xs font-semibold text-foreground border border-border/50">
                Foto {selectedPhotoIndex + 1} de {allPhotos.length}
              </div>
            </div>

            {/* Trilho de Miniaturas */}
            {allPhotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {allPhotos.map((photoUrl, idx) => (
                  <button
                    key={photoUrl}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={cn(
                      "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selectedPhotoIndex === idx
                        ? "border-primary scale-105"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Badges e Destaques Rápidos */}
        {hotel.badges && hotel.badges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {hotel.badges.map((badge) => (
              <Badge key={badge} variant="secondary" className="text-xs px-3 py-1 font-medium">
                {badge}
              </Badge>
            ))}
          </div>
        )}

        {/* Abas Editoriais de Navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-11 min-h-11 w-full justify-start overflow-x-auto no-scrollbar rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="visao_geral" className="h-9 px-4 text-xs font-bold rounded-md">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="quartos" className="h-9 px-4 text-xs font-bold rounded-md">
              Acomodações ({hotel.room_categories?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="lazer" className="h-9 px-4 text-xs font-bold rounded-md">
              Estrutura & Lazer
            </TabsTrigger>
            <TabsTrigger value="politicas" className="h-9 px-4 text-xs font-bold rounded-md">
              Políticas & Regras
            </TabsTrigger>
            {videoMedias.length > 0 && (
              <TabsTrigger value="videos" className="h-9 px-4 text-xs font-bold rounded-md flex items-center gap-1.5">
                <VideoIcon className="size-3.5" />
                Vídeos ({videoMedias.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Aba 1: Visão Geral */}
          <TabsContent value="visao_geral" className="space-y-6 m-0">
            {hotel.description && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
                <h2 className="text-base font-bold text-foreground">Sobre o Estabelecimento</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {hotel.description}
                </p>
              </div>
            )}

            {hotel.bio_bullets && hotel.bio_bullets.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
                <h2 className="text-base font-bold text-foreground">Diferenciais em Destaque</h2>
                <ul className="space-y-2">
                  {hotel.bio_bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regimes Alimentares */}
            {hotel.regime_options && hotel.regime_options.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Coffee className="size-4 text-primary" />
                  Regimes de Alimentação Suportados
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {hotel.regime_options.map((regime) => (
                    <span
                      key={regime}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs border border-primary/20"
                    >
                      <Utensils className="size-3.5" />
                      {regime}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Aba 2: Quartos & Acomodações */}
          <TabsContent value="quartos" className="space-y-4 m-0">
            {hotel.room_categories && hotel.room_categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotel.room_categories.map((room) => (
                  <div
                    key={room.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card overflow-hidden"
                  >
                    {room.cover_photo_url && (
                      <div className="relative aspect-video w-full overflow-hidden bg-muted">
                        <img src={room.cover_photo_url} alt={room.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-foreground leading-snug break-words">
                          {room.name}
                        </h3>
                        {room.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {room.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
                        <span className="flex items-center gap-1">
                          <BedDouble className="size-3.5 text-primary" />
                          {room.bedding || "Cama de Casal"}
                        </span>
                        {room.size_m2 && (
                          <span className="flex items-center gap-1">
                            <Maximize2 className="size-3.5 text-primary" />
                            {room.size_m2} m²
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 text-primary" />
                          Até {room.max_guests} pessoas
                        </span>
                        {room.amenities && room.amenities.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <Sparkles className="size-3.5 text-primary" />
                            {room.amenities.length} comodidades
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-muted-foreground space-y-2">
                <BedDouble className="size-8 mx-auto text-muted-foreground/60" />
                <p className="text-sm font-semibold">Consulte acomodações sob medida</p>
                <p className="text-xs">
                  As configurações detalhadas de quarto deste hotel são confirmadas diretamente no momento da reserva.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Aba 3: Estrutura & Lazer */}
          <TabsContent value="lazer" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Waves className="size-4 text-primary" />
                  Complexo Aquático & Praia
                </h3>
                <p className="text-xs text-muted-foreground">
                  {hotel.structure?.beach_setup || "Consulte comodidades de praia"}
                </p>
                {hotel.structure?.pools_count ? (
                  <p className="text-xs font-semibold text-foreground">
                    {hotel.structure.pools_count} Piscina(s) disponível(is)
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Família, Crianças & Bem-Estar
                </h3>
                <p className="text-xs text-muted-foreground">
                  {hotel.structure?.kids_club
                    ? hotel.structure?.kids_club_details || "Kids Club com recreação especializada"
                    : "Ideal para casais e viajantes independentes"}
                </p>
                {hotel.structure?.spa && (
                  <p className="text-xs font-semibold text-foreground">
                    Spa e centro de relaxamento no local
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba 4: Políticas & Regras */}
          <TabsContent value="politicas" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  Horários Canônicos
                </span>
                <p className="text-sm font-semibold text-foreground">
                  Check-in: {hotel.policies?.check_in_time || "15:00"}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Check-out: {hotel.policies?.check_out_time || "12:00"}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                <span className="text-xs font-bold text-muted-foreground">Animais de Estimação</span>
                <p className="text-sm font-semibold text-foreground">
                  {hotel.policies?.pet_friendly ? "Aceita Pets (consulte condições)" : "Não aceita animais de estimação"}
                </p>
                {hotel.policies?.voltage && (
                  <p className="text-xs text-muted-foreground">
                    Voltagem elétrica: {hotel.policies.voltage}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Aba 5: Vídeos Reais */}
          {videoMedias.length > 0 && (
            <TabsContent value="videos" className="space-y-4 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videoMedias.map((video) => (
                  <div key={video.id} className="rounded-xl border border-border/80 bg-card overflow-hidden">
                    <video
                      controls
                      playsInline
                      src={video.url}
                      className="w-full aspect-video object-cover bg-black"
                    />
                    {video.caption && (
                      <div className="p-3">
                        <p className="text-xs text-muted-foreground">{video.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Pacotes e Agências Locais que Vendem Este Hotel */}
        {hotel.related_packages && hotel.related_packages.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-border/80">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Pacotes e Viagens Disponíveis para {hotel.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Ofertas de agências locais credenciadas na plataforma Waesy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {hotel.related_packages.map((pkg: any) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between"
                >
                  {pkg.cover_image && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      <img src={pkg.cover_image} alt={pkg.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-primary">
                        {pkg.agency_name}
                      </span>
                      <h3 className="text-sm font-bold text-foreground line-clamp-2">
                        {pkg.title}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      {pkg.price_cents > 0 ? (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">A partir de</span>
                          <span className="text-sm font-extrabold text-foreground">
                            {formatMoney(pkg.price_cents)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">Consulte Valores</span>
                      )}

                      <Button
                        size="sm"
                        onClick={() => setIsQuoteModalOpen(true)}
                        className="h-9 px-3 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal de Cotação */}
      <TravelQuoteModal
        open={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        initialDestination={`${hotel.name} — ${hotel.city}, ${hotel.state}`}
      />
    </div>
  );
}
