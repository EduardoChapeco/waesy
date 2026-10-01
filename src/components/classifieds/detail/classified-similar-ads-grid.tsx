import { Link } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

interface ClassifiedSimilarAdsGridProps {
  similarAds: any[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ClassifiedSimilarAdsGrid({
  similarAds,
  title = "Outras Oportunidades Semelhantes",
  subtitle = "Itens ativos relacionados para você explorar",
  className = "",
}: ClassifiedSimilarAdsGridProps) {
  if (!similarAds || similarAds.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary h-11 focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/classificados">Ver catálogo completo</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {similarAds.map((item: any) => {
          const itemImg = item.images?.[0] || null;
          return (
            <Link
              key={item.id}
              to="/classificados/$id"
              params={{ id: item.id }}
              className="group flex flex-col rounded-lg bg-card border border-border overflow-hidden hover:border-primary/50 transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="aspect-4/3 w-full bg-muted/40 relative overflow-hidden">
                {itemImg ? (
                  <img
                    src={itemImg}
                    alt={item.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground/40">
                    <ImageIcon className="size-8" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.city || item.location_name || "Brasil"}</p>
                </div>
                <p className="text-sm font-bold text-foreground font-mono pt-1">
                  {item.price_cents > 0 ? formatMoney(item.price_cents) : "Sob Consulta"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
