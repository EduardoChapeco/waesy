import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { slugify } from "@/lib/slug-utils";
import {
  deleteKdsStation,
  listKdsStations,
  saveKdsStation,
} from "@/services/pdv.functions";
import type { KdsStation } from "@/types/gastronomy-pos";

export interface KdsStationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KdsStationsSheet({
  open,
  onOpenChange,
}: KdsStationsSheetProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [targetPrepMinutes, setTargetPrepMinutes] = useState("15");

  const {
    data: stations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["kds-stations"],
    queryFn: async () => {
      const list = await listKdsStations();
      return (Array.isArray(list) ? list : []) as KdsStation[];
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      const prep = Math.max(1, Number.parseInt(targetPrepMinutes, 10) || 15);
      return saveKdsStation({
        data: {
          name: trimmed,
          slug: slugify(trimmed) || `estacao-${Date.now()}`,
          targetPrepTimeMinutes: prep,
          warningThresholdMinutes: Math.max(1, Math.round(prep * 0.7)),
          criticalThresholdMinutes: Math.max(2, prep + 5),
        },
      });
    },
    onSuccess: () => {
      toast.success("Praça KDS salva.");
      setName("");
      setTargetPrepMinutes("15");
      queryClient.invalidateQueries({ queryKey: ["kds-stations"] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar praça KDS."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (stationId: string) =>
      deleteKdsStation({ data: { stationId } }),
    onSuccess: () => {
      toast.success("Praça KDS desativada.");
      queryClient.invalidateQueries({ queryKey: ["kds-stations"] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao remover praça KDS."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Informe um nome válido para a praça.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ChefHat className="size-4 text-primary" aria-hidden="true" />
            <span>Praças da Cozinha</span>
          </SheetTitle>
          <SheetDescription>
            Gerencie estações de preparo e metas de SLA do KDS.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 border-y border-border py-4">
          <div className="space-y-2">
            <Label htmlFor="kds-station-name">Nome da Praça</Label>
            <Input
              id="kds-station-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Chapa, Forno à Lenha, Bar..."
              required
              minLength={2}
              className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="kds-station-sla">Meta de Preparo (min)</Label>
              <Input
                id="kds-station-sla"
                type="number"
                min={1}
                max={180}
                value={targetPrepMinutes}
                onChange={(e) => setTargetPrepMinutes(e.target.value)}
                className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              <span>Adicionar Praça</span>
            </Button>
          </div>
        </form>

        <div className="flex-1 space-y-3 pb-6 pb-safe">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-xs font-medium text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Erro ao carregar praças KDS."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                <span>Tentar Novamente</span>
              </Button>
            </div>
          ) : stations.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma praça configurada
              </p>
            </div>
          ) : (
            stations.map((station) => (
              <div
                key={station.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {station.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <Badge variant="outline">
                      Meta {station.target_prep_time_minutes}min
                    </Badge>
                    <span>Alerta {station.warning_threshold_minutes}min</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover praça ${station.name}`}
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(station.id)}
                  className="h-11 w-11 shrink-0 p-0 text-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
