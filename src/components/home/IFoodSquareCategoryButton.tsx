import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isHealthyImageUrl } from "@/services/admin-home-cms.functions";
import {
  Utensils,
  ShoppingBag,
  Car,
  Plane,
  Ticket,
  Briefcase,
  Sparkles,
  Store,
  Pill,
  Wine,
  PawPrint,
  Home,
  Smartphone,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export interface IFoodSquareCategoryButtonProps {
  id?: string;
  title?: string | null;
  imageUrl?: string | null;
  targetUrl?: string;
  showText?: boolean;
  badgeText?: string | null;
  className?: string;
}

export function resolveCategoryIcon(title?: string | null): LucideIcon {
  if (!title) return LayoutGrid;
  const t = title.toLowerCase();
  if (t.includes("restaurante") || t.includes("comida") || t.includes("gastronomia") || t.includes("lanche") || t.includes("pizza") || t.includes("acougue")) {
    return Utensils;
  }
  if (t.includes("mercado") || t.includes("supermercado") || t.includes("compra") || t.includes("loja") || t.includes("moda")) {
    return ShoppingBag;
  }
  if (t.includes("farmacia") || t.includes("remedio") || t.includes("saude") || t.includes("beleza")) {
    return Pill;
  }
  if (t.includes("bebida") || t.includes("adega") || t.includes("cerveja") || t.includes("distribuidora")) {
    return Wine;
  }
  if (t.includes("pet") || t.includes("veterin") || t.includes("animal")) {
    return PawPrint;
  }
  if (t.includes("viagem") || t.includes("turismo") || t.includes("voo") || t.includes("hotel") || t.includes("aereo")) {
    return Plane;
  }
  if (t.includes("evento") || t.includes("show") || t.includes("ingresso") || t.includes("festa") || t.includes("balada")) {
    return Ticket;
  }
  if (t.includes("corrida") || t.includes("moto") || t.includes("carro") || t.includes("mobilidade") || t.includes("frete")) {
    return Car;
  }
  if (t.includes("emprego") || t.includes("vaga") || t.includes("curriculo") || t.includes("trabalho") || t.includes("servico")) {
    return Briefcase;
  }
  if (t.includes("imovel") || t.includes("imoveis") || t.includes("casa") || t.includes("apto") || t.includes("aluguel") || t.includes("construcao")) {
    return Home;
  }
  if (t.includes("eletronico") || t.includes("celular") || t.includes("tecnologia") || t.includes("computador")) {
    return Smartphone;
  }
  return Sparkles;
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

  // Se não tem imagem válida nem título/badge, omite
  if (!hasValidImage && !title && !badgeText) {
    return null;
  }

  // Título e badge são exibidos se explicitamente solicitado ou se estiver no modo fallback vetorial
  const isShowTitle = (showText === true || !hasValidImage) && Boolean(title && title.trim().length > 0);
  const IconComponent = resolveCategoryIcon(title);

  return (
    <Link
      key={id}
      to={targetUrl as any}
      className={cn(
        "group relative flex flex-col items-center gap-1 w-full select-none transition-transform duration-150 active:scale-95",
        "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      aria-label={title || "Categoria"}
    >
      <div className="relative aspect-square w-full min-h-11 min-w-11 overflow-hidden rounded-2xl bg-card group-hover:bg-muted/40 transition-colors flex flex-col items-center justify-center border border-border/60 p-2">
        {badgeText && (
          <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
            <Badge
              variant="default"
              className="px-2 py-1 text-3xs font-black uppercase tracking-wider rounded-md shadow-none"
            >
              {badgeText}
            </Badge>
          </div>
        )}

        {hasValidImage ? (
          <img
            src={imageUrl!}
            alt={isShowTitle ? (title || "") : ""}
            loading="lazy"
            className="size-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center size-full gap-1">
            <IconComponent className="size-6 sm:size-7 text-primary shrink-0 transition-transform group-hover:scale-110 duration-200" />
            {title && (
              <span className="text-3xs sm:text-2xs font-bold text-foreground line-clamp-2 px-1 leading-tight tracking-tight">
                {title}
              </span>
            )}
          </div>
        )}
      </div>

      {hasValidImage && isShowTitle && (
        <span className="w-full text-center text-xs font-semibold text-foreground line-clamp-1 px-1 tracking-tight leading-tight">
          {title}
        </span>
      )}
    </Link>
  );
}
