import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavorite, getFavoriteStatus } from "@/services/favorites.functions";
import { cn } from "@/lib/utils";

export interface FavoriteButtonProps {
  entityType?: "classified" | "post" | "event" | "product" | "service";
  itemType?: string;
  resolvedId?: string;
  itemId?: string;
  variant?: "icon" | "button" | "pill";
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  showLabel?: boolean;
  title?: string;
}

export function FavoriteButton(props: FavoriteButtonProps) {
  const {
    entityType,
    resolvedId: incomingResolvedId,
    variant = "icon",
    className,
    size,
    showLabel = true,
  } = props;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Entidade canônica no backend: service é mapeado como product
  const resolvedId = (incomingResolvedId || props.itemId || "") as string;
  const resolvedType = (entityType || props.itemType || "product") as string;
  const backendEntityType = resolvedType === "service" ? "product" : resolvedType;

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["is-favorited", backendEntityType, resolvedId],
    queryFn: () =>
      getFavoriteStatus({
        data: {
          entityType: backendEntityType as any, entityId: resolvedId,
        },
      }),
    staleTime: 60000,
  });

  const isFavorited = statusData?.favorited || false;

  const mutation = useMutation({
    mutationFn: () =>
      toggleFavorite({
        data: {
          entityType: backendEntityType as any, entityId: resolvedId,
        },
      }),
    onMutate: async () => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ["is-favorited", backendEntityType, resolvedId] });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData(["is-favorited", backendEntityType, resolvedId]);

      // Optimistically update
      queryClient.setQueryData(["is-favorited", backendEntityType, resolvedId], {
        favorited: !isFavorited,
      });

      return { previousValue };
    },
    onError: (err: any, _variables, context) => {
      // Revert optimistic update
      if (context?.previousValue) {
        queryClient.setQueryData(
          ["is-favorited", backendEntityType, resolvedId],
          context.previousValue,
        );
      }

      const msg = err?.message || "";
      if (msg.includes("autenticado") || msg.includes("sessão") || msg.includes("login")) {
        toast.error("Faça login para salvar seus itens favoritos.", {
          action: {
            label: "Entrar",
            onClick: () => navigate({ to: "/entrar" }),
          },
        });
      } else {
        toast.error(msg || "Erro ao atualizar favoritos.");
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["is-favorited", backendEntityType, resolvedId] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });

      if (result.favorited) {
        toast.success("Salvo nos seus favoritos!");
      } else {
        toast.success("Item removido dos favoritos.");
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mutation.mutate();
  };

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant={isFavorited ? "secondary" : "outline"}
        size={size || "sm"}
        onClick={handleClick}
        disabled={mutation.isPending}
        className={cn(
          "rounded-xl text-xs font-semibold h-8 gap-1.5 transition-all cursor-pointer select-none",
          isFavorited && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
          className,
        )}
        title={isFavorited ? "Remover dos salvos" : "Salvar nos favoritos"}
        aria-label={isFavorited ? "Remover dos salvos" : "Salvar nos favoritos"}
      >
        <Bookmark
          className={cn(
            "size-3.5 transition-colors",
            isFavorited ? "fill-primary text-primary" : "text-muted-foreground",
          )}
        />
        {showLabel && <span>{isFavorited ? "Salvo" : "Salvar"}</span>}
      </Button>
    );
  }

  // Variant "icon" (flutuante no card ou inline)
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      className={cn(
        "size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none",
        "bg-background/80 hover:bg-background backdrop-blur-md border border-border/50 shadow-xs",
        "hover:scale-105 active:scale-95 active:shadow-none",
        isFavorited && "text-primary border-primary/30 bg-primary/10",
        className,
      )}
      title={isFavorited ? "Remover dos salvos" : "Salvar nos favoritos"}
      aria-label={isFavorited ? "Remover dos salvos" : "Salvar nos favoritos"}
    >
      <Bookmark
        className={cn(
          "size-4 transition-transform",
          isFavorited ? "fill-primary text-primary scale-110" : "text-foreground/70",
        )}
      />
    </button>
  );
}
