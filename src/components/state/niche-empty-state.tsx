import React from "react";
import { Inbox, Calendar, Users, ShoppingBag, Building2, UtensilsCrossed, Stethoscope, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNicheTaxonomy } from "@/hooks/use-niche-taxonomy";

export type NicheEntityKind = "catalog" | "orders" | "clients" | "stock" | "agenda";

export interface NicheEmptyStateProps {
  entity?: NicheEntityKind;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  storeData?: any;
  minimal?: boolean;
}

export function NicheEmptyState({
  entity = "catalog",
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
  storeData,
  minimal = true,
}: NicheEmptyStateProps) {
  const { nicheId, terms, emptyStates } = useNicheTaxonomy(storeData);

  // Ícone contextual por nicho e entidade
  let Icon = Inbox;
  if (entity === "agenda" || nicheId === "clinica" || nicheId === "services") {
    Icon = nicheId === "clinica" ? Stethoscope : Calendar;
  } else if (entity === "catalog") {
    if (nicheId === "gastronomy") Icon = UtensilsCrossed;
    else if (nicheId === "real_estate") Icon = Building2;
    else if (nicheId === "creators") Icon = Sparkles;
    else Icon = ShoppingBag;
  } else if (entity === "clients") {
    Icon = Users;
  }

  // Título e Descrição contextuais
  let displayTitle = title;
  let displayDesc = description;
  let defaultActionLabel = actionLabel;

  if (!displayTitle) {
    if (entity === "catalog") {
      displayTitle = emptyStates.catalogTitle;
    } else if (entity === "orders") {
      displayTitle = emptyStates.ordersTitle;
    } else if (entity === "clients") {
      displayTitle = `Nenhum ${terms.client.toLowerCase()} cadastrado`;
    } else if (entity === "agenda") {
      displayTitle = emptyStates.ordersTitle;
    } else {
      displayTitle = terms.emptyText;
    }
  }

  if (!displayDesc) {
    if (entity === "catalog") {
      displayDesc = emptyStates.catalogDescription;
    } else if (entity === "orders" || entity === "agenda") {
      displayDesc = emptyStates.ordersDescription;
    } else if (entity === "clients") {
      displayDesc = `Cadastre o primeiro ${terms.client.toLowerCase()} para iniciar o relacionamento e histórico.`;
    } else {
      displayDesc = `Nenhum registro encontrado para esta seção no momento.`;
    }
  }

  if (!defaultActionLabel && onAction) {
    if (entity === "catalog") {
      defaultActionLabel = terms.newItem;
    } else if (entity === "clients") {
      defaultActionLabel = `Adicionar ${terms.client}`;
    } else {
      defaultActionLabel = "Adicionar";
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        minimal ? "bg-transparent py-8 px-4" : "rounded-master bg-card px-6 py-12 border border-border/60",
        className
      )}
      role="status"
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground border border-border/40">
        <Icon className="size-6 text-foreground/80" aria-hidden />
      </span>
      <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">{displayTitle}</h3>
      {displayDesc ? (
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-muted-foreground">{displayDesc}</p>
      ) : null}

      {action ? (
        <div className="mt-5">{action}</div>
      ) : onAction && defaultActionLabel ? (
        <div className="mt-5">
          <Button onClick={onAction} className="rounded-master gap-2">
            <Plus className="size-4" />
            <span>{defaultActionLabel}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
