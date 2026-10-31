import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Pill,
  Tag,
  Car,
  Store,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import {
  type HomeSectionItemDTO,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";

export interface NoorChatBentoGridProps {
  items?: HomeSectionItemDTO[];
  className?: string;
  onItemClick?: (item: HomeSectionItemDTO) => void;
}

const DEFAULT_FALLBACK_ICONS: Record<number, any> = {
  0: ShoppingBag,
  1: Pill,
  2: Tag,
  3: Car,
  4: Store,
  5: MapPin,
};

/**
 * <NoorChatBentoGrid> — Menu Modular Estilo Noor (Tetris / Bento Grid)
 * Estrutura exata de 3 Linhas:
 * - Linha 1: 3 cards lado a lado (1 col cada)
 * - Linha 2: 2 cards lado a lado (1 card duplo span-2 + 1 card simples span-1)
 * - Linha 3: Barra de chamada de mobilidade / Uber / MotoLink
 * 
 * Regra do Usuário:
 * - 100% editável via CMS Master (admin_home_sections / home_section_items).
 * - Sem texto e sem ícone forçado quando o admin faz upload de imagem.
 * - Suporte completo à mídia enviada.
 */
export function NoorChatBentoGrid({
  items,
  className,
  onItemClick,
}: NoorChatBentoGridProps) {
  // Ordena os itens por sort_order
  const sortedItems = [...(items || [])].sort((a, b) => a.sort_order - b.sort_order);

  // Divide nas 3 linhas canônicas
  const row1 = sortedItems.slice(0, 3);
  const row2ItemWide = sortedItems[3];
  const row2ItemSmall = sortedItems[4];
  const row3Item = sortedItems[5];

  return (
    <section
      aria-label="Atalhos rápidos do ecossistema"
      className={cn("w-full flex flex-col gap-2 sm:gap-3 select-none px-4 sm:px-0", className)}
    >
      {/* ── LINHA 1: 3 Botões em Cima (1 Coluna cada) ── */}
      {/* design-lint-ignore DL-29 reason:"Grade canônica de 3 colunas do Bento Grid Noor" expiry:"2027-12-31" */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
        {row1.map((item, idx) => (
          <NoorBentoCard
            key={item?.id || `r1-${idx}`}
            item={item}
            defaultIndex={idx}
            aspectClass="aspect-square"
            onClick={() => onItemClick?.(item)}
          />
        ))}
        {/* Fallbacks se a lista tiver menos de 3 itens */}
        {row1.length < 3 &&
          Array.from({ length: 3 - row1.length }).map((_, fIdx) => {
            const actualIdx = row1.length + fIdx;
            return (
              <NoorBentoCard
                key={`fallback-r1-${actualIdx}`}
                defaultIndex={actualIdx}
                aspectClass="aspect-square"
              />
            );
          })}
      </div>

      {/* ── LINHA 2: 2 Botões Embaixo (1 Duplo span-2 + 1 Simples span-1) ── */}
      {/* design-lint-ignore DL-29 reason:"Grade canônica de 3 colunas do Bento Grid Noor" expiry:"2027-12-31" */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
        {/* Card Largo 2 Colunas (estilo Buyurtma / Entrega / Corrida MotoLink) */}
        <div className="col-span-2">
          <NoorBentoCard
            item={row2ItemWide}
            defaultIndex={3}
            isWide
            aspectClass="h-24 sm:h-28"
            onClick={() => row2ItemWide && onItemClick?.(row2ItemWide)}
          />
        </div>

        {/* Card Normal 1 Coluna (estilo Do'kon / Lojas e Negócios) */}
        <div className="col-span-1">
          <NoorBentoCard
            item={row2ItemSmall}
            defaultIndex={4}
            aspectClass="h-24 sm:h-28 aspect-square"
            onClick={() => row2ItemSmall && onItemClick?.(row2ItemSmall)}
          />
        </div>
      </div>

      {/* ── LINHA 3: Barra de Ação Rápida de Mobilidade / Uber / MotoLink ── */}
      <NoorMobilityActionBar item={row3Item} onClick={() => row3Item && onItemClick?.(row3Item)} />
    </section>
  );
}

interface NoorBentoCardProps {
  item?: HomeSectionItemDTO;
  defaultIndex: number;
  aspectClass?: string;
  isWide?: boolean;
  onClick?: () => void;
}

function NoorBentoCard({
  item,
  defaultIndex,
  aspectClass = "aspect-square",
  isWide = false,
  onClick,
}: NoorBentoCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item?.image_desktop_url || item?.image_url || item?.image_mobile_url;
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  // Regra Estrita: Se houver imagem, o texto e o ícone são OMITIDOS por padrão,
  // a menos que o admin tenha explicitamente marcado show_text: true no CMS.
  const showText = item?.show_text === true && Boolean(item?.title?.trim());

  const targetUrl = item?.target_url || getDefaultTargetUrl(defaultIndex);
  const title = item?.title || getDefaultTitle(defaultIndex);
  const FallbackIcon = DEFAULT_FALLBACK_ICONS[defaultIndex] || Sparkles;

  const content = (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl",
        "bg-card hover:bg-muted/40 border border-border/50 hover:border-primary/40",
        "flex items-center justify-center transition-colors duration-200 active:scale-95",
        aspectClass,
      )}
    >
      {hasValidImage ? (
        <img
          src={imageUrl!}
          alt={showText ? title : ""}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="size-full flex flex-col items-center justify-center p-3 text-center gap-1">
          <div className="size-10 sm:size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
            <FallbackIcon className="size-5 sm:size-6" />
          </div>
          {/* Se não houver imagem, exibe o rótulo limpo do nicho como fallback neutro */}
          <span className="text-2xs font-semibold text-muted-foreground group-hover:text-foreground truncate max-w-full">
            {title}
          </span>
        </div>
      )}

      {/* Badge opcional do CMS (ex: "Novo", "Rápido") - Omitido quando há imagem limpa do admin */}
      {item?.badge_text && (!hasValidImage || showText) && (
        <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-2xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-xs select-none">
          {item.badge_text}
        </span>
      )}

      {/* Legenda opcional sob demanda (se marcada no CMS) */}
      {showText && hasValidImage && (
        <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-xs p-2 text-center">
          <span className="text-2xs font-semibold text-foreground truncate block">
            {title}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Link
      to={targetUrl as any}
      onClick={onClick}
      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl sm:rounded-3xl"
      aria-label={title}
    >
      {content}
    </Link>
  );
}

function NoorMobilityActionBar({
  item,
  onClick,
}: {
  item?: HomeSectionItemDTO;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item?.image_desktop_url || item?.image_url || item?.image_mobile_url;
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  const targetUrl = item?.target_url || "/mobilidade";
  const title = item?.title || "Chamar Moto ou Corrida";
  const subtitle = item?.subtitle || "Para onde vamos? Peça com taxa fixa de R$ 0,99";

  return (
    <Link
      to={targetUrl as any}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl",
        "bg-card hover:bg-muted/40 border border-border/50 hover:border-primary/40",
        "flex items-center justify-between transition-colors duration-200 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        hasValidImage ? "h-14 sm:h-16 p-0" : "p-3 sm:p-4 min-h-14 gap-3",
      )}
      aria-label={title}
    >
      {hasValidImage ? (
        <img
          src={imageUrl!}
          alt={item?.show_text ? title : ""}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 min-h-11 min-w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
              <Car className="size-5" />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                  {title}
                </span>
                <span className="px-2 py-1 rounded-md text-2xs font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  R$ 0,99
                </span>
              </div>
              <span className="text-2xs text-muted-foreground truncate leading-tight mt-1">
                {subtitle}
              </span>
            </div>
          </div>

          <div className="size-9 rounded-full bg-muted/60 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center text-muted-foreground transition-colors shrink-0">
            <ArrowRight className="size-4" />
          </div>
        </>
      )}
    </Link>
  );
}

function getDefaultTargetUrl(index: number): string {
  switch (index) {
    case 0:
      return "/marketplace";
    case 1:
      return "/farmacia";
    case 2:
      return "/classificados";
    case 3:
      return "/mobilidade";
    case 4:
      return "/diretorio";
    case 5:
      return "/mobilidade";
    default:
      return "/";
  }
}

function getDefaultTitle(index: number): string {
  switch (index) {
    case 0:
      return "Marketplace";
    case 1:
      return "Farmácia";
    case 2:
      return "Classificados";
    case 3:
      return "Corridas & Moto";
    case 4:
      return "Lojas & Locais";
    case 5:
      return "Para onde vamos?";
    default:
      return "Atalho";
  }
}
