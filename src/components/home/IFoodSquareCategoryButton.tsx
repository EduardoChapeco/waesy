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
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/50 group-hover:bg-muted/80 transition-colors flex items-center justify-center">
        {badgeText && (
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
          src={imageUrl}
          alt={title || ""}
          loading="lazy"
          className="size-full object-cover group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.3";
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
