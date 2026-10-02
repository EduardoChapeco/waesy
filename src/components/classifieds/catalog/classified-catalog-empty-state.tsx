import React from "react";
import { Link } from "@tanstack/react-router";
import { Home, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClassifiedCatalogEmptyStateProps {
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ClassifiedCatalogEmptyState({
  hasActiveFilters = false,
  onClearFilters,
}: ClassifiedCatalogEmptyStateProps) {
  return (
    <div className="py-20 text-center space-y-4 bg-card rounded-lg border border-border/60 p-8 animate-in fade-in duration-200">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground mx-auto">
        <Home className="size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground">
          {hasActiveFilters
            ? "Nenhum anúncio encontrado com estes filtros"
            : "Nenhum anúncio publicado nesta categoria"}
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {hasActiveFilters
            ? "Tente ajustar seus filtros, expandir a região ou buscar por outros termos."
            : "Seja o primeiro a publicar uma oportunidade ou desapego nesta categoria comunitária."}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        {hasActiveFilters && onClearFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters} /* focus-visible: */
            className="rounded-lg h-11 px-4 text-xs font-semibold gap-2 border-border/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-3.5" />
            <span>Limpar Filtros</span>
          </Button>
        )}
        <Button
          asChild
          className="rounded-lg h-11 px-5 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link to="/conta/classificados/novo">
            <Plus className="size-4" />
            <span>Publicar Anúncio</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
