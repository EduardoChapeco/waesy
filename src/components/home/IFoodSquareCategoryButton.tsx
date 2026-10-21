import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isHealthyImageUrl } from "@/services/admin-home-cms.functions";

export interface IFoodSquareCategoryButtonProps {
  id?: string;
  title?: string | null;
  imageUrl?: string | null;
  targetUrl?: string;
  showText?: boolean;
  badgeText?: string | null;
  className?: string;
}

export function IFoodSquareCategoryButton({
  id,
  title,
  imageUrl,
  targetUrl = "/",
  showText = false,
  badgeText,
  className,
}: IFoodSquareCategoryButtonProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  // Invariante de Omissão Estrita: Se não possui imagem saudável, OMITIR O BOTÃO
  if (!hasValidImage) {
    return null;
  }

  // Título e badge são estritamente desativados por padrão (showText = false)
  const isShowTitle = showText === true && Boolean(title && title.trim().length > 0);

  return (
    <Link
      key={id}
      to={targetUrl as any}
      className={cn(
        "group relative flex flex-col items-center gap-1 w-full select-none transition-transform duration-150 active:scale-95",
        "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label={title || "Categoria"}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-card group-hover:bg-muted/40 transition-colors flex items-center justify-center border border-border/50">
        {isShowTitle && badgeText && (
          <div className="absolute top-1 right-1 z-10 pointer-events-none">
            <Badge
              variant="default"
              className="px-2 py-1 text-3xs font-black uppercase tracking-wider rounded-md shadow-none"
            >
              {badgeText}
            </Badge>
          </div>
        )}
        <img
          src={imageUrl!}
          alt={isShowTitle ? (title || "") : ""}
          loading="lazy"
          className="size-full object-cover group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
          onError={() => setImageError(true)}
        />
      </div>

      {isShowTitle && (
        <span className="w-full text-center text-xs font-semibold text-foreground line-clamp-1 px-1 tracking-tight leading-tight">
          {title}
        </span>
      )}
    </Link>
  );
}
