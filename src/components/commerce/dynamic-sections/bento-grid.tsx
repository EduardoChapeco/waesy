import { ArrowRight } from "lucide-react";
import { useBuilderClickTracking } from "../analytics-provider";

interface BentoItem {
  title?: string;
  subtitle?: string;
  image_url?: string;
  image?: string;
  link?: string;
  size?: "small" | "wide" | "tall" | "large";
}

interface BentoGridProps {
  node_id?: string;
  block_type?: string;
  content: {
    title?: string;
    items?: BentoItem[];
  };
}

export type MosaicFeatureGridProps = BentoGridProps;

export function BentoGrid({ content, node_id, block_type }: BentoGridProps) {
  const items = content.items || [];
  const trackClick = useBuilderClickTracking(node_id || "", block_type || "");

  const getSizeClasses = (size?: string) => {
    switch (size) {
      case "wide":
        return "@md:col-span-2 @md:row-span-1 aspect-video @md:aspect-auto @md:h-64";
      case "tall":
        /* design-lint-ignore DL-02 reason:"Proporção canônica 3/4 e altura de 512px para card alto da grade modular" expiry:"2027-12-31" */
        return "@md:col-span-1 @md:row-span-2 aspect-[3/4] @md:aspect-auto @md:h-[512px]";
      case "large":
        /* design-lint-ignore DL-02 reason:"Altura canônica de 512px para card grande da grade modular" expiry:"2027-12-31" */
        return "@md:col-span-2 @md:row-span-2 aspect-square @md:aspect-auto @md:h-[512px]";
      case "small":
      default:
        /* design-lint-ignore DL-02 reason:"Proporção canônica 4/3 per AGENTS.md B.28 para card pequeno" expiry:"2027-12-31" */
        return "@md:col-span-1 @md:row-span-1 aspect-[4/3] @md:aspect-auto @md:h-64";
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {content.title && (
        <h2 className="text-xl @md:text-2xl font-black text-foreground tracking-tight">
          {content.title}
        </h2>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed">
          Nenhum item configurado para o Bento Grid.
        </div>
      ) : (
        <div className="grid grid-cols-1 @md:grid-cols-3 gap-4 auto-rows-max">
          {items.map((item, idx) => {
            const sizeClass = getSizeClasses(item.size);
            const CardWrapper = item.link ? "a" : "div";
            const wrapperProps = item.link ? { href: item.link } : {};
            const imgUrl = item.image || item.image_url || "";

            return (
              <CardWrapper
                key={idx}
                {...wrapperProps}
                onClick={() => {
                  if (item.link) {
                    trackClick({ index: idx, title: item.title, link: item.link });
                  }
                }}
                className={`relative group overflow-hidden bg-card flex flex-col justify-end ${sizeClass} transition-colors duration-200 motion-reduce:transition-none hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={item.title || ""}
                      className="w-full h-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      [Sem imagem]
                    </div>
                  )}
                  {/* design-lint-ignore DL-08 reason:"Scrim fotográfico para contraste sobre imagem per B.32" expiry:"2027-12-31" */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 p-6 space-y-2 text-foreground">
                  {item.subtitle && (
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {item.subtitle}
                    </span>
                  )}
                  {item.title && (
                    <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                      {item.title}
                      {item.link && (
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform motion-reduce:transition-none" />
                      )}
                    </h3>
                  )}
                </div>
              </CardWrapper>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const MosaicFeatureGrid = BentoGrid;
