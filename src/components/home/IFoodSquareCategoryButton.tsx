import React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface IFoodSquareCategoryButtonProps {
  id?: string;
  title?: string | null;
  imageUrl: string;
  targetUrl?: string;
  showText?: boolean;
  badgeText?: string | null;
  className?: string;
}

const FALLBACK_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80";

export function IFoodSquareCategoryButton({
  id,
  title,
  imageUrl,
  targetUrl = "/",
  showText = true,
  badgeText,
  className,
}: IFoodSquareCategoryButtonProps) {
  const isShowTitle = showText && Boolean(title && title.trim().length > 0);
  const safeSrc =
    imageUrl && !imageUrl.includes("1511707171634-5f897ff02560")
      ? imageUrl
      : FALLBACK_CATEGORY_IMAGE;

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
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40 group-hover:bg-muted/70 transition-colors flex items-center justify-center border border-border/40">
        {isShowTitle && badgeText && (
          <div className="absolute top-1 right-1 z-10 pointer-events-none">
            <Badge
              variant="default"
              className="px-2 py-0 text-3xs font-black uppercase tracking-wider rounded-md shadow-none"
            >
              {badgeText}
            </Badge>
          </div>
        )}
        <img
          src={safeSrc}
          alt=""
          loading="lazy"
          className="size-full object-cover group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.src !== FALLBACK_CATEGORY_IMAGE) {
              img.src = FALLBACK_CATEGORY_IMAGE;
            }
          }}
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
