import * as React from "react";
import { useRef } from "react";
import {
  Plane,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface TravelPackageItem {
  id: string;
  title: string;
  destination: string;
  coverImageUrl?: string;
  durationText?: string; // ex: "5 Dias / 4 Noites"
  inclusionText?: string; // ex: "Hotel + Aéreo"
  travelDatesText?: string; // ex: "qua 11 nov - dom 15 nov"
  savedAmountText?: string; // ex: "Economize R$ 167"
  priceCents: number;
  originalPriceCents?: number;
  installmentsCount?: number; // ex: 12
  isAvailable?: boolean;
}

export interface DynamicProductCarouselProps {
  headline?: string;
  subheadline?: string;
  tagline?: string;
  packages?: TravelPackageItem[];
  onSelectPackage?: (pkg: TravelPackageItem) => void;
  onRequestQuote?: (pkg: TravelPackageItem) => void;
  whatsappPhone?: string;
}

const DEFAULT_PACKAGES: TravelPackageItem[] = [
  {
    id: "pkg_maceio",
    title: "Pacote para Maceió",
    destination: "Maceió, Alagoas",
    coverImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    durationText: "8 Dias / 7 Noites",
    inclusionText: "Hotel + Aéreo",
    travelDatesText: "sáb 28 nov - sáb 05 dez",
    savedAmountText: "Economize R$ 167",
    priceCents: 166100,
    originalPriceCents: 182800,
    installmentsCount: 12,
  },
  {
    id: "pkg_rio",
    title: "Pacote para Rio de Janeiro",
    destination: "Rio de Janeiro, RJ",
    coverImageUrl: "https://images.unsplash.com/photo-1483450388369-9ed95738483c?auto=format&fit=crop&w=800&q=80",
    durationText: "5 Dias / 4 Noites",
    inclusionText: "Hotel + Aéreo",
    travelDatesText: "qua 11 nov - dom 15 nov",
    priceCents: 74300,
    installmentsCount: 10,
  },
  {
    id: "pkg_natal",
    title: "Pacote para Natal",
    destination: "Natal, Rio Grande do Norte",
    coverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    durationText: "6 Dias / 5 Noites",
    inclusionText: "Hotel + Aéreo",
    travelDatesText: "sex 26 fev - qua 03 mar",
    savedAmountText: "Economize R$ 212",
    priceCents: 116900,
    originalPriceCents: 138100,
    installmentsCount: 12,
  },
  {
    id: "pkg_sp",
    title: "Pacote para São Paulo",
    destination: "São Paulo, SP",
    coverImageUrl: "https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80",
    durationText: "4 Dias / 3 Noites",
    inclusionText: "Hotel + Aéreo",
    travelDatesText: "qui 30 dez - sáb 02 jan",
    priceCents: 63800,
    installmentsCount: 6,
  },
];

export const DynamicProductCarousel: React.FC<DynamicProductCarouselProps> = ({
  headline = "Pacotes Imperdíveis",
  subheadline = "Aproveite combinações exclusivas de passagens aéreas e hotéis selecionados",
  tagline = "Viagens em Destaque",
  packages = DEFAULT_PACKAGES,
  onSelectPackage,
  onRequestQuote,
  whatsappPhone = "",
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const items = packages && packages.length > 0 ? packages : DEFAULT_PACKAGES;

  const handleAction = (pkg: TravelPackageItem) => {
    if (onSelectPackage) {
      onSelectPackage(pkg);
      return;
    }
    if (onRequestQuote) {
      onRequestQuote(pkg);
      return;
    }

    const cleanPhone = (whatsappPhone || "").replace(/\D/g, "");
    if (cleanPhone) {
      const msg = encodeURIComponent(
        `Olá! Vi o pacote *${pkg.title}* (${pkg.destination}) por ${formatMoney(pkg.priceCents)} e gostaria de saber mais informações e disponibilidade.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    }
  };

  return (
    <section className="w-full py-8 sm:py-12 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Cabeçalho com Navegação por Setas */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {tagline && (
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="size-3.5" />
                <span>{tagline}</span>
              </div>
            )}
            <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight">
              {headline}
            </h2>
            {subheadline && (
              <p className="text-xs text-muted-foreground">{subheadline}</p>
            )}
          </div>

          {/* Botões de Navegação Desktop */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="size-10 rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Rolar para a esquerda"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="size-10 rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Rolar para a direita"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Trilho Snap Scroll */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-4"
        >
          {items.map((pkg) => {
            const installments = pkg.installmentsCount || 12;
            const installmentValue = Math.round(pkg.priceCents / installments);

            return (
              <div
                key={pkg.id}
                className="w-72 sm:w-80 shrink-0 snap-start rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
              >
                {/* Imagem de Capa com Badges */}
                <div className="relative aspect-4/3 w-full bg-muted/30 overflow-hidden">
                  {pkg.coverImageUrl ? (
                    <img
                      src={pkg.coverImageUrl}
                      alt={pkg.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="size-full bg-linear-to-br from-primary/10 to-muted flex items-center justify-center">
                      <Plane className="size-8 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Badge de Duração (Canto Inferior Esquerdo da Imagem) */}
                  {pkg.durationText && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-black/75 text-white backdrop-blur-xs">
                        {pkg.durationText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {pkg.title}
                    </h3>

                    {/* Inclusão & Datas */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {pkg.inclusionText && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <Plane className="size-3.5 text-primary" />
                          <span>{pkg.inclusionText}</span>
                        </div>
                      )}
                      {pkg.travelDatesText && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>{pkg.travelDatesText}</span>
                        </div>
                      )}
                    </div>

                    {/* Badge de Economia */}
                    {pkg.savedAmountText && (
                      <div className="pt-1">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5"
                        >
                          {pkg.savedAmountText}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Preço & CTA */}
                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Preço por pessoa
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-black text-foreground">
                          {formatMoney(pkg.priceCents)}
                        </span>
                        {pkg.originalPriceCents && pkg.originalPriceCents > pkg.priceCents && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatMoney(pkg.originalPriceCents)}
                          </span>
                        )}
                      </div>
                      {installments > 1 && (
                        <span className="text-[10px] text-muted-foreground block">
                          ou em até {installments}x de {formatMoney(installmentValue)}
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleAction(pkg)}
                      className="w-full h-11 min-h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                    >
                      <span>Ver Pacote</span>
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
