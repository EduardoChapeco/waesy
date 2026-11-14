import * as React from "react";
import { Menu, Search, X } from "lucide-react";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";
import { useEffectiveViewport } from "@/design-system/vitrine/viewport-context";
import { cn } from "@/lib/utils";
import type { OmniBlockStyling } from "../types";

export interface SiteHeaderLinkItem {
  id?: string;
  label: string;
  href?: string;
  url?: string;
}

export interface SiteHeaderBlockData {
  brandName?: string;
  tagline?: string;
  logoUrl?: string;
  menuHandle?: string;
  headerScrollMode?: "scrolls_with_site" | "freezes" | "disappears" | "fades_out";
  showSearch?: boolean;
  searchPlaceholder?: string;
  ctaLabel?: string;
  ctaHref?: string;
  links?: SiteHeaderLinkItem[];
}

export interface SiteHeaderBlockProps {
  id: string;
  data: SiteHeaderBlockData;
  styling?: OmniBlockStyling;
  storeData?: any;
  navigationMenus?: any[];
  isEditing?: boolean;
  onUpdateInlineText?: (fieldPath: string, newValue: string) => void;
}

export const SiteHeaderBlock: React.FC<SiteHeaderBlockProps> = ({
  id,
  data,
  styling,
  storeData,
  navigationMenus = [],
  isEditing = false,
}) => {
  const { isMobile } = useEffectiveViewport();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrollState, setScrollState] = React.useState<"visible" | "faded" | "hidden">("visible");
  const headerRef = React.useRef<HTMLElement>(null);

  const scrollMode = data?.headerScrollMode || "freezes";

  React.useEffect(() => {
    if (isEditing || scrollMode === "scrolls_with_site" || scrollMode === "freezes") {
      setScrollState("visible");
      return;
    }
    let lastY = 0;
    const onScroll = () => {
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      const goingDown = y > lastY && y > 80;
      if (goingDown) {
        setScrollState(scrollMode === "disappears" ? "hidden" : "faded");
      } else {
        setScrollState("visible");
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isEditing, scrollMode]);

  const menuHandle = data?.menuHandle || "header_nav";
  const matchedMenu = (navigationMenus || []).find(
    (m: any) =>
      m?.handle === menuHandle ||
      m?.handle === "header_nav" ||
      m?.handle === "main-menu",
  );

  const resolvedLinks: Array<{ id: string; label: string; href: string }> = React.useMemo(() => {
    const manual = Array.isArray(data?.links) ? data.links : [];
    const cms = Array.isArray(matchedMenu?.items) ? matchedMenu.items : [];
    const source = manual.length > 0 ? manual : cms;
    return source
      .filter((item: any) => item && item.is_active !== false && (item.label || item.title))
      .map((item: any, idx: number) => ({
        id: String(item.id || `hdr-lnk-${idx}`),
        label: String(item.label || item.title),
        href: getSafeBuilderHref(item.href || item.url || "/") ?? "/",
      }));
  }, [data?.links, matchedMenu?.items]);

  const resolvedBrandName =
    data?.brandName ||
    storeData?.name ||
    storeData?.business_name ||
    "Minha Loja";
  const resolvedLogoUrl =
    data?.logoUrl ||
    storeData?.logoUrl ||
    storeData?.logo_url ||
    storeData?.settings?.logoUrl ||
    "";
  const ctaHref = data?.ctaHref ? getSafeBuilderHref(data.ctaHref) ?? "#" : "#";

  const customStyle: React.CSSProperties = {};
  if (styling?.backgroundColor && !styling.backgroundColor.startsWith("bg-")) {
    customStyle.backgroundColor = styling.backgroundColor;
  }
  if (styling?.textColor && !styling.textColor.startsWith("text-")) {
    customStyle.color = styling.textColor;
  }

  return (
    <header
      ref={headerRef}
      id={id}
      style={customStyle}
      data-testid="omni-site-header"
      className={cn(
        "w-full border-b border-border bg-background text-foreground transition-colors duration-200",
        scrollMode === "scrolls_with_site" ? "relative z-20" : "sticky top-0 z-30",
        scrollState === "hidden" && "-translate-y-full opacity-0",
        scrollState === "faded" && "opacity-75",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Marca */}
        <a
          href={isEditing ? undefined : "/"}
          onClick={(e) => {
            if (isEditing) e.preventDefault();
          }}
          className="h-11 min-h-11 inline-flex items-center gap-3 min-w-0 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {resolvedLogoUrl ? (
            <img
              src={resolvedLogoUrl}
              alt={resolvedBrandName}
              className="size-9 rounded-lg object-contain border border-border/60 bg-card shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <span className="text-sm sm:text-base font-black tracking-tight text-foreground truncate block">
              {resolvedBrandName}
            </span>
            {data?.tagline && (
              <span className="text-2xs text-muted-foreground truncate block">
                {data.tagline}
              </span>
            )}
          </div>
        </a>

        {/* Navegação Desktop */}
        {!isMobile && resolvedLinks.length > 0 && (
          <nav aria-label="Navegação Principal do Site" className="flex items-center gap-1 min-w-0 scroll-area-carousel overflow-x-auto no-scrollbar">
            {resolvedLinks.slice(0, 8).map((lnk) => (
              <a
                key={lnk.id}
                href={isEditing ? undefined : lnk.href}
                onClick={(e) => {
                  if (isEditing) e.preventDefault();
                }}
                className="h-11 min-h-11 px-3 rounded-lg inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {lnk.label}
              </a>
            ))}
          </nav>
        )}

        {/* Cluster Direito */}
        <div className="flex items-center gap-2 shrink-0">
          {data?.showSearch !== false && !isMobile && (
            <a
              href={isEditing ? undefined : "/buscar"}
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              aria-label="Buscar na loja"
              className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-4" />
            </a>
          )}

          {data?.ctaLabel && (
            <a
              href={isEditing ? undefined : ctaHref}
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              style={{
                borderRadius: "var(--builder-btn-radius, 0.75rem)",
                textTransform: "var(--builder-btn-transform, none)" as React.CSSProperties["textTransform"],
              }}
              className="h-11 min-h-11 px-4 bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center text-xs font-bold whitespace-nowrap transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {data.ctaLabel}
            </a>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Fechar menu do site" : "Abrir menu do site"}
              className="size-11 min-h-11 min-w-11 rounded-lg border border-border/70 bg-card inline-flex items-center justify-center text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Menu Mobile Expandido */}
      {isMobile && mobileMenuOpen && (
        <nav
          aria-label="Menu Mobile do Site"
          className="px-4 py-3 border-t border-border/60 bg-card flex flex-col gap-1"
        >
          {resolvedLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Adicione itens no menu de cabeçalho no gerenciador de navegação.
            </p>
          ) : (
            resolvedLinks.map((lnk) => (
              <a
                key={lnk.id}
                href={isEditing ? undefined : lnk.href}
                onClick={(e) => {
                  if (isEditing) e.preventDefault();
                  else setMobileMenuOpen(false);
                }}
                className="h-11 min-h-11 px-3 rounded-lg flex items-center text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {lnk.label}
              </a>
            ))
          )}
        </nav>
      )}
    </header>
  );
};
