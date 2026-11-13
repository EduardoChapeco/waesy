import * as React from "react";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";
import { useEffectiveViewport } from "@/design-system/vitrine/viewport-context";
import { cn } from "@/lib/utils";
import type { OmniBlockStyling } from "../types";

export interface SiteFooterLinkItem {
  id?: string;
  label: string;
  href?: string;
  url?: string;
}

export interface SiteFooterBlockData {
  brandName?: string;
  description?: string;
  logoUrl?: string;
  menuHandle?: string;
  email?: string;
  phone?: string;
  address?: string;
  copyrightText?: string;
  links?: SiteFooterLinkItem[];
}

export interface SiteFooterBlockProps {
  id: string;
  data: SiteFooterBlockData;
  styling?: OmniBlockStyling;
  storeData?: any;
  navigationMenus?: any[];
  isEditing?: boolean;
}

export const SiteFooterBlock: React.FC<SiteFooterBlockProps> = ({
  id,
  data,
  styling,
  storeData,
  navigationMenus = [],
  isEditing = false,
}) => {
  const { isMobile } = useEffectiveViewport();

  const menuHandle = data?.menuHandle || "footer_menu";
  const matchedMenu = (navigationMenus || []).find(
    (m: any) =>
      m?.handle === menuHandle ||
      m?.handle === "footer_menu" ||
      m?.handle === "main-menu",
  );

  const resolvedLinks: Array<{ id: string; label: string; href: string }> = React.useMemo(() => {
    const manual = Array.isArray(data?.links) ? data.links : [];
    const cms = Array.isArray(matchedMenu?.items) ? matchedMenu.items : [];
    const source = manual.length > 0 ? manual : cms;
    return source
      .filter((item: any) => item && item.is_active !== false && (item.label || item.title))
      .map((item: any, idx: number) => ({
        id: String(item.id || `ftr-lnk-${idx}`),
        label: String(item.label || item.title),
        href: getSafeBuilderHref(item.href || item.url || "/") ?? "/",
      }));
  }, [data?.links, matchedMenu?.items]);

  const resolvedBrandName =
    data?.brandName ||
    storeData?.name ||
    storeData?.business_name ||
    "Minha Loja";
  const resolvedDesc =
    data?.description ||
    storeData?.description ||
    "Atendimento oficial, ofertas atualizadas e canais verificados.";
  const resolvedLogoUrl =
    data?.logoUrl ||
    storeData?.logoUrl ||
    storeData?.logo_url ||
    storeData?.settings?.logoUrl ||
    "";
  const resolvedEmail = data?.email || storeData?.email || "";
  const resolvedPhone = data?.phone || storeData?.phone || storeData?.whatsapp || "";
  const resolvedAddress = data?.address || storeData?.address || "";

  const colSplit = Math.ceil(resolvedLinks.length / 2);
  const col1 = resolvedLinks.slice(0, colSplit);
  const col2 = resolvedLinks.slice(colSplit);

  const customStyle: React.CSSProperties = {};
  if (styling?.backgroundColor && !styling.backgroundColor.startsWith("bg-")) {
    customStyle.backgroundColor = styling.backgroundColor;
  }
  if (styling?.textColor && !styling.textColor.startsWith("text-")) {
    customStyle.color = styling.textColor;
  }

  return (
    <footer
      id={id}
      style={customStyle}
      data-testid="omni-site-footer"
      className="w-full border-t border-border bg-card text-card-foreground py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div
          className={cn(
            "grid gap-8",
            isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-4",
          )}
        >
          {/* Coluna 1: Identidade da Marca */}
          <div className={cn("space-y-3", !isMobile && "md:col-span-2")}>
            <div className="flex items-center gap-3">
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt={resolvedBrandName}
                  className="size-10 rounded-lg object-contain border border-border/60 bg-background shrink-0"
                />
              ) : null}
              <h3 className="text-base font-black tracking-tight text-foreground">
                {resolvedBrandName}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              {resolvedDesc}
            </p>
            {(resolvedPhone || resolvedEmail || resolvedAddress) && (
              <div className="space-y-1 pt-2 text-xs text-muted-foreground">
                {resolvedPhone && <p>Contato: {resolvedPhone}</p>}
                {resolvedEmail && <p>E-mail: {resolvedEmail}</p>}
                {resolvedAddress && <p>{resolvedAddress}</p>}
              </div>
            )}
          </div>

          {/* Coluna 2: Links Principais */}
          <nav aria-label="Links do Rodapé">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Navegação
            </h4>
            {col1.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Configure links no menu &ldquo;{menuHandle}&rdquo;.
              </p>
            ) : (
              <ul className="space-y-1">
                {col1.map((lnk) => (
                  <li key={lnk.id}>
                    <a
                      href={isEditing ? undefined : lnk.href}
                      onClick={(e) => {
                        if (isEditing) e.preventDefault();
                      }}
                      className="h-11 min-h-11 inline-flex items-center text-xs font-semibold text-foreground/85 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {lnk.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          {/* Coluna 3: Links Complementares */}
          {col2.length > 0 && (
            <nav aria-label="Mais Informações">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Institucional
              </h4>
              <ul className="space-y-1">
                {col2.map((lnk) => (
                  <li key={lnk.id}>
                    <a
                      href={isEditing ? undefined : lnk.href}
                      onClick={(e) => {
                        if (isEditing) e.preventDefault();
                      }}
                      className="h-11 min-h-11 inline-flex items-center text-xs font-semibold text-foreground/85 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {lnk.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            {data?.copyrightText ||
              `© ${new Date().getFullYear()} ${resolvedBrandName}. Todos os direitos reservados.`}
          </p>
          <span>Waesy Storefront</span>
        </div>
      </div>
    </footer>
  );
};
