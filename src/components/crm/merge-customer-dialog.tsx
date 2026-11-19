import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GitMerge, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listCustomers, mergeCustomers } from "@/services/crm.functions";

interface CandidateCustomer {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  status?: string | null;
}

export interface MergeCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCustomerId: string;
  targetCustomerName: string;
  onMerged: () => void;
}

export function MergeCustomerDialog({
  open,
  onOpenChange,
  targetCustomerId,
  targetCustomerName,
  onMerged,
}: MergeCustomerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  const {
    data: rawCustomers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["crm-merge-candidates", targetCustomerId],
    queryFn: async () => {
      const list = await listCustomers({ data: { status: "active" } });
      return (Array.isArray(list) ? list : []) as CandidateCustomer[];
    },
    enabled: open && Boolean(targetCustomerId),
  });

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawCustomers
      .filter((c) => c.id !== targetCustomerId && c.status !== "archived")
      .filter((c) => {
        if (!q) return true;
        const label = [c.fullName, c.name, c.email, c.phone, c.document]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return label.includes(q);
      })
      .slice(0, 30);
  }, [rawCustomers, targetCustomerId, search]);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSourceId) {
        throw new Error("Selecione o cadastro duplicado de origem.");
      }
      return mergeCustomers({
        data: {
          sourceCustomerId: selectedSourceId,
          targetCustomerId,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Cadastros mesclados (${res.reassignedCount} vínculos transferidos).`
      );
      setSelectedSourceId("");
      setSearch("");
      onOpenChange(false);
      onMerged();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao mesclar cadastros."
      );
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedSourceId("");
      setSearch("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="size-4 text-primary" aria-hidden="true" />
            <span>Mesclar Cadastro Duplicado</span>
          </DialogTitle>
          <DialogDescription>
            Vínculos, contratos e leads serão consolidados em {targetCustomerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merge-search">Buscar cadastro duplicado</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="merge-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, documento, e-mail ou telefone..."
                className="h-11 min-h-11 pl-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : isError ? (
              <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-xs font-medium text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Falha ao carregar clientes."}
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
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/30 p-6 text-center">
                <Users className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhum cadastro elegível encontrado
                </p>
              </div>
            ) : (
              candidates.map((candidate) => {
                const displayName =
                  candidate.fullName || candidate.name || "Cliente sem nome";
                const selected = selectedSourceId === candidate.id;
                const secondary = [
                  candidate.document,
                  candidate.phone,
                  candidate.email,
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedSourceId(candidate.id)}
                    aria-pressed={selected}
                    className={`flex min-h-11 w-full flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    {secondary ? (
                      <span className="text-xs text-muted-foreground">
                        {secondary}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mergeMutation.isPending}
            className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selectedSourceId || mergeMutation.isPending}
            onClick={() => mergeMutation.mutate()}
            className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mergeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            <span>Confirmar Mesclagem</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
