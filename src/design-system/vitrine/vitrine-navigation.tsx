import * as React from "react";
import {
  Briefcase,
  Calendar,
  Car,
  ChevronRight,
  Coffee,
  Compass,
  Gift,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Plane,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Ticket,
  Utensils,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveBidirectionalMedia,
  resolveSafeLinkHref,
  useEffectiveViewport,
} from "./viewport-context";

export type VitrineButtonIconName =
  | "ShoppingBag"
  | "Utensils"
  | "Car"
  | "Home"
  | "Wrench"
  | "Plane"
  | "Calendar"
  | "Briefcase"
  | "Sparkles"
  | "Tag"
  | "MessageCircle"
  | "MapPin"
  | "Heart"
  | "Gift"
  | "Smartphone"
  | "Coffee"
  | "Shirt"
  | "Ticket"
  | "ShieldCheck"
  | "Zap"
  | "Store"
  | "Compass";

export const VITRINE_BUTTON_ICONS: Record<VitrineButtonIconName, LucideIcon> = {
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Wrench,
  Plane,
  Calendar,
  Briefcase,
  Sparkles,
  Tag,
  MessageCircle,
  MapPin,
  Heart,
  Gift,
  Smartphone,
  Coffee,
  Shirt,
  Ticket,
  ShieldCheck,
  Zap,
  Store,
  Compass,
};

export const VITRINE_BUTTON_ICON_OPTIONS: Array<{ value: VitrineButtonIconName; label: string }> = [
  { value: "ShoppingBag", label: "Sacola / Loja" },
  { value: "Utensils", label: "Gastronomia" },
  { value: "Car", label: "Veículos / Mobilidade" },
  { value: "Home", label: "Imóveis / Casa" },
  { value: "Wrench", label: "Serviços" },
  { value: "Plane", label: "Turismo & Viagens" },
  { value: "Calendar", label: "Agenda & Eventos" },
  { value: "Briefcase", label: "Vagas & Negócios" },
  { value: "Sparkles", label: "Destaques" },
  { value: "Tag", label: "Ofertas & Classificados" },
  { value: "MessageCircle", label: "WhatsApp / Atendimento" },
  { value: "MapPin", label: "Localização" },
  { value: "Heart", label: "Saúde & Bem-Estar" },
  { value: "Gift", label: "Presentes & Cupons" },
  { value: "Smartphone", label: "Eletrônicos" },
  { value: "Coffee", label: "Cafeteria & Padaria" },
  { value: "Shirt", label: "Moda & Vestuário" },
  { value: "Ticket", label: "Ingressos & Sorteios" },
  { value: "ShieldCheck", label: "Garantia & Oficial" },
  { value: "Zap", label: "Entrega Expressa" },
  { value: "Store", label: "Empresas" },
  { value: "Compass", label: "Explorar" },
];

export type VitrineButtonsLayoutVariant =
  | "noor_dock"
  | "ifood_grid"
  | "squircle_pills"
  | "dual_filter_pills"
  | "action_cards";

export interface VitrineButtonItem {
  id: string;
  label: string;
  subtitle?: string;
  badge?: string;
  iconName?: VitrineButtonIconName;
  imageDesktopUrl?: string;
  imageMobileUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  shape?: "squircle" | "circle" | "pill";
  tone?: "default" | "primary" | "muted" | "accent";
  showLabel?: boolean;
  href?: string;
}

export interface VitrineButtonsDockProps {
  sectionTitle?: string;
  sectionSubtitle?: string;
  dataSource?: "manual" | "store_categories" | "hybrid";
  desktopLayout?: VitrineButtonsLayoutVariant;
  mobileLayout?: VitrineButtonsLayoutVariant;
  desktopColumns?: 4 | 6 | 8;
  mobileColumns?: 2 | 3 | 4;
  defaultShape?: "squircle" | "circle" | "pill";
  items?: VitrineButtonItem[];
  liveCategories?: Array<Record<string, unknown>>;
  className?: string;
}

function mapCategoriesToButtons(
  categories?: Array<Record<string, unknown>>,
): VitrineButtonItem[] {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((cat, idx): VitrineButtonItem | null => {
      const label =
        (typeof cat.name === "string" && cat.name.trim()) ||
        (typeof cat.title === "string" && cat.title.trim()) ||
        "";
      if (!label) return null;
      const slug = typeof cat.slug === "string" ? cat.slug : "";
      const imageUrl =
        (typeof cat.image_url === "string" && cat.image_url) ||
        (typeof cat.icon_url === "string" && cat.icon_url) ||
        "";
      return {
        id: typeof cat.id === "string" ? cat.id : `cat-btn-${idx}`,
        label,
        imageDesktopUrl: imageUrl || undefined,
        imageMobileUrl: imageUrl || undefined,
        imageAlt: label,
        iconName: "ShoppingBag",
        href: slug ? `?categoria=${encodeURIComponent(slug)}` : "#produtos",
      };
    })
    .filter((item): item is VitrineButtonItem => item !== null);
}

export function VitrineButtonsDock({
  sectionTitle,
  sectionSubtitle,
  dataSource = "manual",
  desktopLayout = "noor_dock",
  mobileLayout = "ifood_grid",
  desktopColumns = 8,
  mobileColumns = 4,
  defaultShape = "squircle",
  items = [],
  liveCategories,
  className,
}: VitrineButtonsDockProps) {
  const { isMobile, isEditorCanvas } = useEffectiveViewport();

  const resolvedItems = React.useMemo(() => {
    const manualList = Array.isArray(items) ? items : [];
    const catList = mapCategoriesToButtons(liveCategories);
    if (dataSource === "store_categories") {
      return catList.length > 0 ? catList : manualList;
    }
    if (dataSource === "hybrid") {
      return [...manualList, ...catList];
    }
    return manualList;
  }, [dataSource, items, liveCategories]);

  if (resolvedItems.length === 0) {
    return (
      <section className={cn("w-full py-3", className)} aria-label={sectionTitle || "Atalhos"}>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Nenhum botão ou categoria configurada
          </p>
          <p className="text-xs text-muted-foreground">
            Adicione botões personalizados ou conecte automaticamente as categorias da loja.
          </p>
        </div>
      </section>
    );
  }

  const activeLayout: VitrineButtonsLayoutVariant = isMobile ? mobileLayout : desktopLayout;

  const getToneClass = (tone?: VitrineButtonItem["tone"]) => {
    if (tone === "primary") {
      return "bg-primary text-primary-foreground border-primary hover:opacity-95";
    }
    if (tone === "accent") {
      return "bg-primary/10 text-primary border-primary/30 hover:border-primary/60";
    }
    if (tone === "muted") {
      return "bg-muted/60 text-foreground border-border/50 hover:bg-muted";
    }
    return "bg-card text-foreground border-border/70 hover:border-primary/50";
  };

  const renderIconOrMedia = (item: VitrineButtonItem, sizeVariant: "sm" | "md" | "lg") => {
    const mediaSrc = resolveBidirectionalMedia(
      {
        imageMobileUrl: item.imageMobileUrl,
        imageDesktopUrl: item.imageDesktopUrl,
        imageUrl: item.imageUrl,
      },
      isMobile,
    );
    const IconComp =
      (item.iconName && VITRINE_BUTTON_ICONS[item.iconName]) || ShoppingBag;
    const shape = item.shape || defaultShape;
    const shapeRadius =
      shape === "circle" ? "rounded-full" : shape === "pill" ? "rounded-full" : "rounded-lg";

    const boxSize =
      sizeVariant === "sm"
        ? "size-8"
        : sizeVariant === "lg"
          ? "size-16 sm:size-20"
          : "size-12 sm:size-14";

    if (mediaSrc) {
      return (
        <div className={cn("overflow-hidden shrink-0 bg-muted/30", boxSize, shapeRadius)}>
          <img
            src={mediaSrc}
            alt={item.imageAlt || item.label}
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105"
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          boxSize,
          shapeRadius,
          item.tone === "primary"
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <IconComp className={sizeVariant === "sm" ? "size-4" : "size-6"} />
      </div>
    );
  };

  const wrapInteractive = (
    item: VitrineButtonItem,
    idx: number,
    wrapperClass: string,
    content: React.ReactNode,
  ) => {
    const safeHref = isEditorCanvas ? undefined : resolveSafeLinkHref(item.href);
    const commonClass = cn(
      "group cursor-pointer select-none transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      wrapperClass,
    );

    if (safeHref) {
      return (
        <a
          key={item.id || idx}
          href={safeHref}
          aria-label={item.label}
          className={commonClass}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={item.id || idx}
        type="button"
        aria-label={item.label}
        className={commonClass}
      >
        {content}
      </button>
    );
  };

  const renderPillsRow = (rowItems: VitrineButtonItem[]) => (
    <div className="carousel flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
      {rowItems.map((item, idx) =>
        wrapInteractive(
          item,
          idx,
          cn(
            "snap-start shrink-0 h-11 min-h-11 px-4 border inline-flex items-center gap-2",
            (item.shape || defaultShape) === "pill" ? "rounded-full" : "rounded-lg",
            getToneClass(item.tone),
          ),
          <>
            {renderIconOrMedia(item, "sm")}
            {(item.showLabel ?? true) && (
              <span className="text-xs font-bold whitespace-nowrap">{item.label}</span>
            )}
            {item.badge && (
              <span className="px-2 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
                {item.badge}
              </span>
            )}
          </>,
        ),
      )}
    </div>
  );

  const midpoint = Math.ceil(resolvedItems.length / 2);

  // design-lint-ignore DL-29 reason:"Grade compacta 4x2 mobile canônica iFood (Invariante B.32)" expiry:"2027-12-31"
  const mobileGridMap: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
  const gridColsClass = isMobile
    ? mobileGridMap[mobileColumns] || "grid-cols-4"
    : desktopColumns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : desktopColumns === 6
        ? "grid-cols-2 sm:grid-cols-6"
        : "grid-cols-2 sm:grid-cols-8";

  return (
    <section
      className={cn("w-full py-3 space-y-3", className)}
      aria-label={sectionTitle || "Navegação de atalhos"}
    >
      {(sectionTitle || sectionSubtitle) && (
        <div className="space-y-1">
          {sectionTitle && (
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground break-words">
              {sectionTitle}
            </h2>
          )}
          {sectionSubtitle && (
            <p className="text-xs text-muted-foreground">{sectionSubtitle}</p>
          )}
        </div>
      )}

      {/* MODO 1: NOOR DOCK (Carrossel Horizontal Contínuo de Squircles / Círculos) */}
      {activeLayout === "noor_dock" && (
        <div className="carousel flex flex-nowrap items-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
          {resolvedItems.map((item, idx) =>
            wrapInteractive(
              item,
              idx,
              "snap-start shrink-0 w-20 sm:w-24 min-h-11 flex flex-col items-center text-center gap-2 p-1 rounded-lg",
              <>
                <div className="relative">
                  <div
                    className={cn(
                      "p-1 border transition-transform duration-150 motion-reduce:transition-none group-hover:-translate-y-0.5",
                      (item.shape || defaultShape) === "circle" ? "rounded-full" : "rounded-lg",
                      getToneClass(item.tone),
                    )}
                  >
                    {renderIconOrMedia(item, "lg")}
                  </div>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                {(item.showLabel ?? true) && (
                  <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2 break-words text-wrap">
                    {item.label}
                  </span>
                )}
              </>,
            ),
          )}
        </div>
      )}

      {/* MODO 2: IFOOD GRID (Grade Compacta 4x2 Mobile / N-Colunas Desktop) */}
      {activeLayout === "ifood_grid" && (
        <div className={cn("grid gap-2 sm:gap-3", gridColsClass)}>
          {resolvedItems.map((item, idx) =>
            wrapInteractive(
              item,
              idx,
              cn(
                "relative min-h-24 p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-2",
                getToneClass(item.tone),
              ),
              <>
                {item.badge && (
                  <span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold leading-none">
                    {item.badge}
                  </span>
                )}
                {renderIconOrMedia(item, "md")}
                {(item.showLabel ?? true) && (
                  <span className="text-xs font-bold leading-tight line-clamp-2 break-words text-wrap">
                    {item.label}
                  </span>
                )}
              </>,
            ),
          )}
        </div>
      )}

      {/* MODO 3: SQUIRCLE PILLS (Linha Única Contínua de Pílulas Táteis) */}
      {activeLayout === "squircle_pills" && renderPillsRow(resolvedItems)}

      {/* MODO 4: DUAL FILTER PILLS (Duas Linhas Sincronizadas de Filtros / Botões) */}
      {activeLayout === "dual_filter_pills" && (
        <div className="space-y-2">
          {renderPillsRow(resolvedItems.slice(0, midpoint))}
          {resolvedItems.length > midpoint && renderPillsRow(resolvedItems.slice(midpoint))}
        </div>
      )}

      {/* MODO 5: ACTION CARDS (Grade 2x2 Mobile / 4 Colunas Desktop Estilo Perfil Oficial) */}
      {activeLayout === "action_cards" && (
        <div
          className={cn(
            "grid gap-3",
            isMobile ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
          )}
        >
          {resolvedItems.map((item, idx) =>
            wrapInteractive(
              item,
              idx,
              cn(
                "min-h-14 p-3 rounded-lg border flex items-center justify-between gap-3 text-left",
                getToneClass(item.tone),
              ),
              <>
                <div className="flex items-center gap-3 min-w-0">
                  {renderIconOrMedia(item, "sm")}
                  <div className="min-w-0">
                    {(item.showLabel ?? true) && (
                      <p className="text-xs sm:text-sm font-bold leading-tight break-words text-wrap">
                        {item.label}
                      </p>
                    )}
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform duration-150 motion-reduce:transition-none" />
              </>,
            ),
          )}
        </div>
      )}
    </section>
  );
}
