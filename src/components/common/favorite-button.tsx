import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavorite, getFavoriteStatus } from "@/services/favorites.functions";
import { cn } from "@/lib/utils";

export interface FavoriteButtonProps {
  entityType: "classified" | "post" | "event" | "product" | "service";
  entityId: string;
  variant?: "icon" | "button" | "pill";
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  showLabel?: boolean;
  title?: string;
}

export function FavoriteButton({
  entityType,
  entityId,
  variant = "icon",
  className,
  size,
  showLabel = true,
}: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Entidade canônica no backend: service é mapeado como product
  const backendEntityType = entityType === "service" ? "product" : entityType;

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["is-favorited", backendEntityType, entityId],
    queryFn: () =>
      getFavoriteStatus({
        data: {
          entityType: backendEntityType as any,
          entityId,
        },
      }),
    staleTime: 60000,
  });

  const isFavorited = statusData?.favorited || false;

  const mutation = useMutation({
    mutationFn: () =>
      toggleFavorite({
        data: {
          entityType: backendEntityType as any,
          entityId,
        },
      }),
    onMutate: async () => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ["is-favorited", backendEntityType, entityId] });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData(["is-favorited", backendEntityType, entityId]);

      // Optimistically update
      queryClient.setQueryData(["is-favorited", backendEntityType, entityId], {
        favorited: !isFavorited,
      });

      return { previousValue };
    },
    onError: (err: any, _variables, context) => {
      // Revert optimistic update
      if (context?.previousValue) {
        queryClient.setQueryData(
          ["is-favorited", backendEntityType, entityId],
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
      queryClient.invalidateQueries({ queryKey: ["is-favorited", backendEntityType, entityId] });
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
