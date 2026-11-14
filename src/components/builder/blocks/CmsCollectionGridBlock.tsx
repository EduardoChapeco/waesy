import * as React from "react";
import { Database, ExternalLink } from "lucide-react";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";
import { useEffectiveViewport } from "@/design-system/vitrine/viewport-context";
import { cn } from "@/lib/utils";
import type { OmniBlockStyling } from "../types";
import { getSectionStyle } from "../utils";

export interface CmsCollectionGridBlockData {
  title?: string;
  subtitle?: string;
  collectionSlug?: string;
  layout?: "grid" | "list";
  columns?: 2 | 3 | 4;
  ctaLabel?: string;
  showEmptyState?: boolean;
}

export interface CmsCollectionGridBlockProps {
  id: string;
  data: CmsCollectionGridBlockData;
  styling?: OmniBlockStyling;
  isEditing?: boolean;
  cmsCollections?: any[];
  cmsItems?: any[];
  activeCmsCollection?: any;
}

export const CmsCollectionGridBlock: React.FC<CmsCollectionGridBlockProps> = ({
  id,
  data,
  styling,
  isEditing = false,
  cmsCollections = [],
  cmsItems = [],
  activeCmsCollection,
}) => {
  const { isMobile } = useEffectiveViewport();
  const sectionStyle = getSectionStyle(styling, isMobile);

  const matchedCollection =
    activeCmsCollection ||
    (data?.collectionSlug
      ? (cmsCollections || []).find(
          (c: any) => c.slug === data.collectionSlug || c.id === data.collectionSlug,
        )
      : cmsCollections?.[0]) ||
    null;

  const items: any[] = React.useMemo(() => {
    if (Array.isArray(cmsItems) && cmsItems.length > 0) return cmsItems;
    if (Array.isArray(matchedCollection?.items)) {
      return matchedCollection.items.map((it: any) => ({
        ...it,
        ...(it.data && typeof it.data === "object" ? it.data : {}),
        id: it.id,
        title: it.title || it.data?.title || "Item",
      }));
    }
    return [];
  }, [cmsItems, matchedCollection]);

  if (items.length === 0 && !isEditing && data?.showEmptyState === false) {
    return null;
  }

  const gridColsClass = isMobile
    ? "grid-cols-1"
    : data?.layout === "list"
      ? "grid-cols-1"
      : data?.columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : data?.columns === 4
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      id={id}
      style={sectionStyle.style}
      className={cn("w-full bg-background text-foreground", sectionStyle.className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {(data?.title || matchedCollection?.name || data?.subtitle) && (
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {data?.title || matchedCollection?.name || "Coleção CMS"}
            </h2>
            {data?.subtitle && (
              <p className="text-sm text-muted-foreground max-w-2xl">{data.subtitle}</p>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
            <Database className="size-6 mx-auto text-muted-foreground" />
            <p className="text-xs font-bold text-foreground">
              {matchedCollection
                ? `Coleção "${matchedCollection.name}" sem itens publicados`
                : "Nenhuma coleção CMS vinculada"}
            </p>
            <p className="text-xs text-muted-foreground">
              Abra o Gerenciador CMS para adicionar colunas e registros reais do banco de dados.
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-4", gridColsClass)}>
            {items.map((item, idx) => {
              const safeHref = item.href ? getSafeBuilderHref(String(item.href)) : null;
              const imgUrl = typeof item.image_url === "string" && item.image_url.trim()
                ? item.image_url
                : typeof item.imageUrl === "string" && item.imageUrl.trim()
                  ? item.imageUrl
                  : null;

              return (
                <article
                  key={item.id || idx}
                  className="rounded-xl border border-border/80 bg-card text-card-foreground overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {imgUrl && (
                      <div className="aspect-video w-full bg-muted/30 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={String(item.title || "Item CMS")}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      {item.badge && (
                        <span className="inline-flex px-2 py-1 rounded-md bg-primary/10 text-primary text-2xs font-bold uppercase">
                          {String(item.badge)}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-foreground break-words">
                        {String(item.title || "Sem título")}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {String(item.subtitle)}
                        </p>
                      )}
                      {item.price && (
                        <p className="text-sm font-black text-foreground pt-1">
                          {String(item.price)}
                        </p>
                      )}
                    </div>
                  </div>

                  {safeHref && (
                    <div className="px-4 pb-4">
                      <a
                        href={isEditing ? undefined : safeHref}
                        onClick={(e) => {
                          if (isEditing) e.preventDefault();
                        }}
                        style={{
                          borderRadius: "var(--builder-btn-radius, 0.75rem)",
                        }}
                        className="w-full h-11 min-h-11 px-4 bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center gap-2 text-xs font-bold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span>{data?.ctaLabel || "Ver Detalhes"}</span>
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
