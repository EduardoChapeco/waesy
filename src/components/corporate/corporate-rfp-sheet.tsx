import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import {
  createCorporateRfp,
  listCorporateRfps,
  updateCorporateRfpStatus,
} from "@/services/corporate-travel.functions";

interface CorporateRfpRow {
  id: string;
  company_name: string;
  destination: string;
  passenger_name: string | null;
  travel_dates: string | null;
  budget: number | null;
  status: string;
  created_at: string;
}

export interface CorporateRfpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
}

const RFP_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "quoted", label: "Cotada" },
  { value: "won", label: "Aprovada" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export function CorporateRfpSheet({
  open,
  onOpenChange,
  storeId,
}: CorporateRfpSheetProps) {
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [destination, setDestination] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [travelDates, setTravelDates] = useState("");
  const [budgetStr, setBudgetStr] = useState("");

  const {
    data: rfps = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["corporate-rfps", storeId],
    queryFn: async () => {
      const rows = await listCorporateRfps({ data: { storeId } });
      return (Array.isArray(rows) ? rows : []) as CorporateRfpRow[];
    },
    enabled: open && Boolean(storeId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const numericBudget = budgetStr.trim()
        ? Number.parseFloat(budgetStr.replace(",", "."))
        : null;
      return createCorporateRfp({
        data: {
          storeId,
          companyName: companyName.trim(),
          destination: destination.trim(),
          passengerName: passengerName.trim() || null,
          travelDates: travelDates.trim() || null,
          budget:
            numericBudget !== null && Number.isFinite(numericBudget) && numericBudget > 0
              ? numericBudget
              : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Solicitação RFP registrada.");
      setCompanyName("");
      setDestination("");
      setPassengerName("");
      setTravelDates("");
      setBudgetStr("");
      setComposing(false);
      queryClient.invalidateQueries({ queryKey: ["corporate-rfps", storeId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao registrar RFP."
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      rfpId,
      status,
    }: {
      rfpId: string;
      status: "pending" | "quoted" | "won" | "cancelled";
    }) => updateCorporateRfpStatus({ data: { storeId, rfpId, status } }),
    onSuccess: () => {
      toast.success("Status da RFP atualizado.");
      queryClient.invalidateQueries({ queryKey: ["corporate-rfps", storeId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar status."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim().length < 2 || destination.trim().length < 2) {
      toast.error("Informe a empresa cliente e o destino.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="md" className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Solicitações RFP Corporativas</SheetTitle>
          <SheetDescription>
            Recebimento e triagem de cotações B2B recorrentes.
          </SheetDescription>
        </SheetHeader>

        {!composing ? (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setComposing(true)}
              className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              <span>Nova RFP</span>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 border-y border-border py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rfp-company">Empresa Solicitante</Label>
                <Input
                  id="rfp-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Razão Social ou Fantasia"
                  required
                  className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfp-dest">Destino / Rota</Label>
                <Input
                  id="rfp-dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: São Paulo -> Lisboa"
                  required
                  className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfp-pax">Passageiro / Centro de Custo</Label>
                <Input
                  id="rfp-pax"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfp-dates">Período Previsto</Label>
                <Input
                  id="rfp-dates"
                  value={travelDates}
                  onChange={(e) => setTravelDates(e.target.value)}
                  placeholder="Ex: 12/06 a 18/06"
                  className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfp-budget">Teto Orçamentário (R$)</Label>
              <Input
                id="rfp-budget"
                type="number"
                step="0.01"
                min={0}
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                placeholder="Opcional"
                className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setComposing(false)}
                disabled={createMutation.isPending}
                className="h-11 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-11 min-h-11 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : null}
                <span>Salvar RFP</span>
              </Button>
            </div>
          </form>
        )}

        <div className="flex-1 space-y-3 pb-6 pb-safe">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-xs font-medium text-destructive">
                {error instanceof Error
                  ? error.message
                  : "Falha ao carregar RFPs."}
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
          ) : rfps.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-center">
              <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma RFP cadastrada
              </p>
            </div>
          ) : (
            rfps.map((rfp) => (
              <article
                key={rfp.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {rfp.company_name} — {rfp.destination}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {rfp.passenger_name ? (
                        <span>Viajante: {rfp.passenger_name}</span>
                      ) : null}
                      {rfp.travel_dates ? <span>• {rfp.travel_dates}</span> : null}
                      {rfp.budget ? (
                        <span className="tabular-nums font-medium text-foreground">
                          • Teto {formatMoney(Math.round(rfp.budget * 100))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant={rfp.status === "won" ? "success" : "secondary"}>
                    {RFP_STATUS_OPTIONS.find((s) => s.value === rfp.status)
                      ?.label || rfp.status}
                  </Badge>
                </div>

                <Select
                  value={rfp.status}
                  onValueChange={(nextStatus) =>
                    statusMutation.mutate({
                      rfpId: rfp.id,
                      status: nextStatus as "pending" | "quoted" | "won" | "cancelled",
                    })
                  }
                >
                  <SelectTrigger
                    aria-label="Status da RFP"
                    className="h-11 min-h-11 w-full sm:w-52 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RFP_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </article>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
