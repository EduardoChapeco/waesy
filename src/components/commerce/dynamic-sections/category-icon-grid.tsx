import * as React from "react";
import {
  Plane,
  Hotel,
  Luggage,
  ShieldCheck,
  Compass,
  Car,
  Ticket,
  Ship,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CategoryIconItem {
  id: string;
  title: string;
  subtitle?: string;
  iconName?: string;
  badge?: string;
  discountPercentage?: string;
  link?: string;
}

export interface CategoryIconGridProps {
  headline?: string;
  subheadline?: string;
  categories?: CategoryIconItem[];
  onCategorySelect?: (item: CategoryIconItem) => void;
}

const DEFAULT_CATEGORIES: CategoryIconItem[] = [
  {
    id: "flights",
    title: "Passagens",
    subtitle: "Nacionais & Internacionais",
    iconName: "plane",
    badge: "Melhores Tarifas",
  },
  {
    id: "hotels",
    title: "Hospedagens",
    subtitle: "Hotéis, Resorts & Pousadas",
    iconName: "hotel",
    discountPercentage: "-25%",
  },
  {
    id: "packages",
    title: "Pacotes",
    subtitle: "Aéreo + Hospedagem",
    iconName: "luggage",
    badge: "Mais Vendidos",
  },
  {
    id: "insurance",
    title: "Seguros",
    subtitle: "Assistência Médica 24h",
    iconName: "shield",
    discountPercentage: "-25%",
  },
  {
    id: "activities",
    title: "Passeios",
    subtitle: "Tours, Ingressos & Guias",
    iconName: "compass",
    badge: "Exclusivo",
  },
  {
    id: "cars",
    title: "Aluguel",
    subtitle: "Carros com KM Livre",
    iconName: "car",
    discountPercentage: "-15%",
  },
];

export const CategoryIconGrid: React.FC<CategoryIconGridProps> = ({
  headline = "Descubra Todos os Serviços Para Sua Viagem",
  subheadline = "Selecione a categoria desejada para encontrar condições e descontos imperdíveis",
  categories = DEFAULT_CATEGORIES,
  onCategorySelect,
}) => {
  const getIcon = (name?: string) => {
    switch (name) {
      case "plane":
        return <Plane className="size-6 text-sky-500" />;
      case "hotel":
        return <Hotel className="size-6 text-amber-500" />;
      case "luggage":
        return <Luggage className="size-6 text-indigo-500" />;
      case "shield":
        return <ShieldCheck className="size-6 text-emerald-500" />;
      case "compass":
        return <Compass className="size-6 text-rose-500" />;
      case "car":
        return <Car className="size-6 text-blue-500" />;
      case "cruise":
        return <Ship className="size-6 text-cyan-500" />;
      default:
        return <Sparkles className="size-6 text-primary" />;
    }
  };

  const items = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  return (
    <section className="w-full py-6 sm:py-10 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Cabeçalho */}
        {(headline || subheadline) && (
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
              {headline}
            </h2>
            {subheadline && (
              <p className="text-xs text-muted-foreground">{subheadline}</p>
            )}
          </div>
        )}

        {/* Grade Bento Responsiva (2 colunas mobile, 3 tablet, 6 desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((cat) => {
            const hasDiscount = Boolean(cat.discountPercentage);
            const hasBadge = Boolean(cat.badge);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategorySelect?.(cat)}
                className="relative p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer flex flex-col items-center text-center justify-center gap-2.5 group shadow-2xs hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[110px]"
              >
                {/* Badge de Desconto / Destaque */}
                {(hasDiscount || hasBadge) && (
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                        hasDiscount
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      )}
                    >
                      {cat.discountPercentage || cat.badge}
                    </Badge>
                  </div>
                )}

                {/* Ícone com Contêiner Suave */}
                <div className="size-12 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {getIcon(cat.iconName)}
                </div>

                {/* Título & Subtítulo */}
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                    {cat.title}
                  </span>
                  {cat.subtitle && (
                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {cat.subtitle}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
