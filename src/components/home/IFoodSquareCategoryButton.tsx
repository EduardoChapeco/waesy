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
        "group relative flex flex-col items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/60 dark:bg-muted/20 border border-border/50 hover:border-border/80",
        "aspect-square w-20 sm:w-24 shrink-0 transition-transform duration-150 select-none",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label={title || "Categoria"}
    >
      {badgeText && (
        <div className="absolute top-1 right-1 z-10 pointer-events-none">
          <Badge
            variant="default"
            className="px-2 py-0 text-3xs font-black uppercase tracking-wider rounded-full shadow-none"
          >
            {badgeText}
          </Badge>
        </div>
      )}

      {isShowTitle ? (
        <>
          <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
            <img
              src={imageUrl}
              alt={title || ""}
              loading="lazy"
              className="size-12 object-contain group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.3";
              }}
            />
          </div>
          <span className="w-full text-center text-xs font-semibold text-foreground line-clamp-1 px-1 tracking-tight">
            {title}
          </span>
        </>
      ) : (
        <div className="size-full overflow-hidden rounded-lg">
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
      )}
    </Link>
  );
}
