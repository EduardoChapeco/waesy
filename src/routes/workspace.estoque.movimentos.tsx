import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, Loader2, History } from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/commerce/channel-badge";
import { EmptyState } from "@/components/state/states";
import { getStockMovements, adjustStock, getStockLevels } from "@/services/stock.functions";

const MOVEMENT_TYPES = [
  { value: "purchase", label: "Entrada de Fornecedor" },
  { value: "adjustment", label: "Ajuste Manual" },
  { value: "damage", label: "Avaria / Perda" },
  { value: "return", label: "Devolução" },
  { value: "transfer", label: "Transferência" },
] as const;

type AdjustMovementType = typeof MOVEMENT_TYPES[number]["value"];

export const Route = createFileRoute("/workspace/estoque/movimentos")({
  head: () => ({ meta: [{ title: "Movimentos de estoque | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [movements, stockLevels] = await Promise.allSettled([
        getStockMovements({ data: { limit: 100 } }),
        getStockLevels({ data: {} }),
      ]);
      return {
        movements: movements.status === "fulfilled" && Array.isArray(movements.value) ? movements.value : [],
        stockLevels: stockLevels.status === "fulfilled" && Array.isArray(stockLevels.value) ? stockLevels.value : [],
      };
    } catch (err) {
      console.error("[loader:workspace.estoque.movimentos]", err);
      return { movements: [], stockLevels: [] };
    }
  },
  component: MovementsPage,
});

function getBadgeVariant(qty: number) {
  return qty > 0 ? "default" : qty < 0 ? "destructive" : "secondary";
}

function translateMovementType(type: string) {
  const map: Record<string, string> = {
    purchase: "Entrada de Fornecedor",
    sale: "Venda Concluída",
    reserve: "Reserva de Checkout",
    release: "Reserva Liberada",
    return: "Devolução",
    exchange_in: "Entrada de Troca",
    exchange_out: "Saída de Troca",
    adjustment: "Ajuste Manual",
    transfer: "Transferência",
    damage: "Avaria / Perda",
  };
  return map[type] || type;
}

function MovementsPage() {
  const { movements: initialMovements, stockLevels } = Route.useLoaderData() ?? {
    movements: [],
    stockLevels: [],
  };
  const router = useRouter();

  const [movements, setMovements] = useState<any[]>(Array.isArray(initialMovements) ? initialMovements : []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [variantId, setVariantId] = useState("");
  const [movementType, setMovementType] = useState<AdjustMovementType>("adjustment");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  const handleOpenDialog = () => {
    setVariantId("");
    setMovementType("adjustment");
    setQty("1");
    setNote("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!variantId) {
      toast.error("Selecione um produto/variante.");
      return;
    }
    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum === 0) {
      toast.error("Quantidade inválida. Use um número inteiro diferente de zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock({
        data: {
          variantId,
          qty: qtyNum,
          movementType,
          note: note.trim() || undefined,
        },
      });
      toast.success("Movimento de estoque registrado com sucesso!");
      setIsDialogOpen(false);
      // Reload data
      await router.invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao registrar movimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações de Estoque"
        description="Histórico completo de entradas, saídas e ajustes manuais."
        actions={
          <Button
            onClick={handleOpenDialog}
            size="sm"
            className="rounded-xl font-semibold text-xs h-9 gap-1.5"
          >
            <Plus className="size-3.5" />
            Registrar Movimento
          </Button>
        }
      />

      {movements.length === 0 ? (
        <EmptyState
          title="Nenhum movimento registrado"
          description="Os movimentos de entrada, saída e ajuste de estoque aparecerão aqui."
          action={
            <Button onClick={handleOpenDialog} size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-9 gap-1.5">
              <Plus className="size-3.5" />
              Primeiro Ajuste
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Canal / Origem</TableHead>
                <TableHead>Produto / SKU</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Referência / Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((mov: any) => {
                const inferredChannel =
                  mov.metadata?.channel_source ||
                  mov.metadata?.channel ||
                  (mov.note?.toLowerCase().includes("mercado livre")
                    ? "mercadolivre"
                    : mov.note?.toLowerCase().includes("ifood")
                    ? "ifood"
                    : mov.note?.toLowerCase().includes("shopee")
                    ? "shopee"
                    : mov.note?.toLowerCase().includes("amazon")
                    ? "amazon"
                    : mov.note?.toLowerCase().includes("magalu")
                    ? "magalu"
                    : mov.reference_type === "order"
                    ? "online_store"
                    : "pos");

                return (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge source={inferredChannel} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{mov.variant?.product?.title || "Desconhecido"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{mov.variant?.sku}</div>
                    </TableCell>
                    <TableCell className="text-xs">{translateMovementType(mov.movement_type)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getBadgeVariant(mov.qty)}>
                        {mov.qty > 0 ? `+${mov.qty}` : mov.qty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {mov.reference_type && (
                          <span className="font-medium mr-1 text-xs">{mov.reference_type}:</span>
                        )}
                        <span className="text-muted-foreground text-xs">{mov.note || "—"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Modal de Ajuste Manual ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Registrar Movimento de Estoque</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre entradas, saídas, ajustes ou avarias manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Produto / Variante */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Produto / Variante</Label>
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger className="rounded-xl text-xs h-10">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(stockLevels) ? stockLevels : []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      <span className="font-medium">{v.product?.title || "Produto"}</span>
                      {v.sku && <span className="text-muted-foreground ml-1.5 font-mono">({v.sku})</span>}
                      <span className="text-muted-foreground ml-1.5">— {v.stock_on_hand ?? 0} un.</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Movimento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Movimento</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as AdjustMovementType)}>
                <SelectTrigger className="rounded-xl text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Quantidade{" "}
                <span className="text-muted-foreground font-normal">
                  (positivo = entrada, negativo = saída)
                </span>
              </Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Ex: 10 ou -5"
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observação (opcional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Motivo do ajuste, número da NF, etc."
                className="rounded-xl text-xs resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !variantId}
              className="rounded-xl text-xs h-9 font-bold gap-1.5"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
