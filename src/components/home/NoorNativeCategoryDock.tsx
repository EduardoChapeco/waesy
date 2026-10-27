import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { IFoodSquareCategoryButton, resolveCategoryIcon } from "./IFoodSquareCategoryButton";
import {
  type HomeSectionItemDTO,
  isHealthyImageUrl,
} from "@/services/admin-home-cms.functions";

export interface NoorNativeCategoryDockProps {
  items: HomeSectionItemDTO[];
  className?: string;
  variant?: "square" | "compact_squircle";
}

export function NoorNativeCategoryDock({
  items,
  className,
  variant = "square",
}: NoorNativeCategoryDockProps) {
  // Permite itens com imagem saudável OU título configurado no CMS com fallback vetorial
  const validItems = (items || []).filter(
    (item) =>
      item.is_active !== false &&
      (Boolean(item.title?.trim()) || isHealthyImageUrl(item.image_desktop_url || item.image_mobile_url || item.image_url)),
  );
  if (validItems.length === 0) return null;

  return (
    <div
      className={cn(
        "carousel -mx-2 px-2 sm:mx-0 sm:px-0 overflow-x-auto snap-x mandatory no-scrollbar py-1 focus:outline-none flex gap-2 sm:gap-3 select-none",
        className,
      )}
      role="region"
      aria-label="Menu Rápido de Categorias"
    >
      {validItems.map((item) => {
        if (variant === "compact_squircle") {
          return <CompactCategoryPill key={item.id} item={item} />;
        }

        return (
          <div key={item.id} className="snap-start shrink-0 w-20 sm:w-24">
            <IFoodSquareCategoryButton
              id={item.id}
              title={item.title}
              imageUrl={item.image_desktop_url || item.image_url || item.image_mobile_url}
              targetUrl={item.target_url}
              showText={item.show_text === true}
              badgeText={item.badge_text}
            />
          </div>
        );
      })}
    </div>
  );
}

function CompactCategoryPill({ item }: { item: HomeSectionItemDTO }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.image_desktop_url || item.image_url || item.image_mobile_url;
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  // Se não possui imagem saudável nem título, omitir
  if (!hasValidImage && !item.title?.trim()) {
    return null;
  }

  const isShowTitle = (item.show_text === true || !hasValidImage) && Boolean(item.title && item.title.trim().length > 0);
  const IconComponent = resolveCategoryIcon(item.title);

  return (
    <Link
      to={item.target_url as any}
      className={cn(
        "snap-start shrink-0 min-h-11 min-w-11 px-3 py-2 rounded-2xl bg-card hover:bg-muted/50 border border-border/60",
        "flex items-center gap-2 active:scale-95 transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
      aria-label={item.title || "Categoria"}
    >
      {hasValidImage ? (
        <img
          src={imageUrl!}
          alt={isShowTitle ? (item.title || "") : ""}
          loading="lazy"
          className="size-7 object-contain rounded-lg"
          onError={() => setImageError(true)}
        />
      ) : (
        <IconComponent className="size-5 text-primary shrink-0" />
      )}
      {isShowTitle && (
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
          {item.title}
        </span>
      )}
    </Link>
  );
}
