import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { isHealthyImageUrl } from "@/services/admin-home-cms.functions";
import {
  Utensils,
  ShoppingBag,
  Car,
  Plane,
  Ticket,
  Briefcase,
  Store,
  Pill,
  Wine,
  PawPrint,
  Home,
  Smartphone,
  LayoutGrid,
  Compass,
  Tag,
  Wrench,
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
  if (t.includes("mercado") || t.includes("supermercado") || t.includes("compra")) {
    return ShoppingBag;
  }
  if (t.includes("farmacia") || t.includes("remedio") || t.includes("saude") || t.includes("beleza")) {
    return Pill;
  }
  if (t.includes("explorar") || t.includes("descobrir") || t.includes("radar")) {
    return Compass;
  }
  if (t.includes("marketplace") || t.includes("shopping") || t.includes("loja")) {
    return Store;
  }
  if (t.includes("classificado") || t.includes("oferta") || t.includes("promocao")) {
    return Tag;
  }
  if (t.includes("viagem") || t.includes("turismo") || t.includes("voo") || t.includes("hotel") || t.includes("aereo")) {
    return Plane;
  }
  if (t.includes("corrida") || t.includes("moto") || t.includes("carro") || t.includes("mobilidade") || t.includes("frete")) {
    return Car;
  }
  if (t.includes("servico") || t.includes("conserto") || t.includes("reforma")) {
    return Wrench;
  }
  if (t.includes("emprego") || t.includes("vaga") || t.includes("curriculo") || t.includes("trabalho")) {
    return Briefcase;
  }
  if (t.includes("evento") || t.includes("show") || t.includes("ingresso") || t.includes("festa") || t.includes("balada")) {
    return Ticket;
  }
  if (t.includes("bebida") || t.includes("adega") || t.includes("cerveja") || t.includes("distribuidora")) {
    return Wine;
  }
  if (t.includes("pet") || t.includes("veterin") || t.includes("animal")) {
    return PawPrint;
  }
  if (t.includes("imovel") || t.includes("imoveis") || t.includes("casa") || t.includes("apto") || t.includes("aluguel")) {
    return Home;
  }
  if (t.includes("eletronico") || t.includes("celular") || t.includes("tecnologia") || t.includes("computador")) {
    return Smartphone;
  }
  if (t.includes("mais") || t.includes("categoria") || t.includes("todas")) {
    return LayoutGrid;
  }
  return LayoutGrid;
}

export function IFoodSquareCategoryButton({
  id,
  title,
  imageUrl,
  targetUrl = "/",
  showText = true,
  className,
}: IFoodSquareCategoryButtonProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = Boolean(imageUrl && !imageError && isHealthyImageUrl(imageUrl));

  // Se não tem imagem válida nem título, omite
  if (!hasValidImage && !title) {
    return null;
  }

  const IconComponent = resolveCategoryIcon(title);

  return (
    <Link
      key={id}
      to={targetUrl as any}
      className={cn(
        "group relative flex flex-col items-center gap-1 w-full select-none transition-transform duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl",
        className,
      )}
      aria-label={title || "Categoria"}
    >
      {/* Squircle com Borda Invisível (Apple HIG / iFood Native Standard) */}
      <div className="relative aspect-square w-full min-h-11 min-w-11 overflow-hidden rounded-2xl bg-muted/40 group-hover:bg-muted/60 transition-colors flex items-center justify-center border border-transparent p-2">
        {hasValidImage ? (
          <img
            src={imageUrl!}
            alt=""
            loading="lazy"
            className="size-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-200 motion-reduce:transition-none"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center size-full">
            <IconComponent className="size-6 sm:size-7 text-primary shrink-0 transition-transform group-hover:scale-110 duration-200" />
          </div>
        )}
      </div>

      {/* Rótulo Textual Honesto Abaixo do Squircle */}
      {title && showText !== false && (
        <span className="w-full text-center text-3xs sm:text-2xs font-semibold text-foreground line-clamp-1 px-1 tracking-tight leading-tight">
          {title}
        </span>
      )}
    </Link>
  );
}
