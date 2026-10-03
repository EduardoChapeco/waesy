import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Boxes, PackageCheck, Clock, AlertTriangle, Plus, Minus, Search, History, ArrowRightLeft, Truck, ShieldAlert, SlidersHorizontal, Box, ScanBarcode } from "lucide-react";
import { BarcodeScannerModal } from "@/components/scanner/barcode-scanner-modal";

import { PageHeader } from "@/components/commerce/page-header";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SheetPage } from "@/components/ui/sheet-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/state/states";
import { getStockLevels, adjustStock, transferStock } from "@/services/stock.functions";
import { listInventoryLocations, type InventoryLocationDTO } from "@/services/marketplace-hub.functions";
import { StockAuditDialog } from "@/components/admin/stock-audit-dialog";
import { useNicheTranslation } from "@/hooks/use-niche-translation";
import { getStoreSettings } from "@/services/store.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/estoque/")({
  head: () => ({ meta: [{ title: "Estoque Operacional | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [resStock, resLocations] = await Promise.all([
        getStockLevels({ data: {} }).catch(() => []),
        listInventoryLocations().catch(() => []),
      ]);
      return {
        stock: Array.isArray(resStock) ? resStock : [],
        locations: Array.isArray(resLocations) ? resLocations : [],
      };
    } catch (err) {
      console.error("[loader:workspace.estoque.index] Unhandled loader error:", err);
      return { stock: [], locations: [] };
    }
  },
  component: AdminStockPage,
});

function AdminStockPage() {
  const loaderData = Route.useLoaderData() as any;
  const rawStock = Array.isArray(loaderData) ? loaderData : loaderData?.stock;
  const rawLocations = Array.isArray(loaderData?.locations) ? loaderData.locations : [];

  const router = useRouter();
  const [stock, setStock] = useState<any[]>(Array.isArray(rawStock) ? rawStock : []);
  const [locations] = useState<InventoryLocationDTO[]>(rawLocations);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    rawLocations.find((l: InventoryLocationDTO) => l.is_default)?.id || rawLocations[0]?.id || ""
  );
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [destLocationId, setDestLocationId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

 // Modal Movement State
 const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
 const [movementType, setMovementType] = useState<
 "purchase" | "adjustment" | "damage" | "transfer" | "return"
 >("purchase");
 const [qtyInput, setQtyInput] = useState<string>("1");
 const [noteInput, setNoteInput] = useState<string>("");

 // Metrics summary
 const metrics = useMemo(() => {
 const totalSKUs = stock.length;
 let totalOnHand = 0;
 let criticalCount = 0;
 let negativeCount = 0;

 for (const v of stock) {
 const onHand = v.stock_on_hand ?? 0;
 totalOnHand += onHand;
 if (onHand <= 5) criticalCount++;
 if (onHand < 0) negativeCount++;
 }

 return {
 totalSKUs,
 totalOnHand,
 totalAvailable: Math.max(0, totalOnHand),
 criticalCount,
 negativeCount,
 };
 }, [stock]);

 // Filter stock rows by search & tab
 const filteredStock = useMemo(() => {
 return stock.filter((v) => {
 const available = v.stock_on_hand ?? 0;
 const matchesSearch =
 v.sku.toLowerCase().includes(search.toLowerCase()) ||
 (v.products?.title || "").toLowerCase().includes(search.toLowerCase());

 let matchesTab = true;
 if (statusTab === "available") matchesTab = available > 5;
 else if (statusTab === "critical") matchesTab = available > 0 && available <= 5;
 else if (statusTab === "out_of_stock") matchesTab = available <= 0;

 return matchesSearch && matchesTab;
 });
 }, [stock, search, statusTab]);

 // Open Dialog for line operation
 const handleSelectLocation = async (locId: string) => {
    setSelectedLocationId(locId);
    try {
      const res = await getStockLevels({ data: { locationId: locId === "all" ? undefined : locId, search } });
      if (Array.isArray(res)) {
        setStock(res);
      }
    } catch (err) {
      console.error("[stock] Erro ao filtrar por armazém:", err);
    }
  };

  const handleOpenMovementModal = (variant: any, defaultType: any = "purchase") => {
 setSelectedVariant(variant);
 setMovementType(defaultType);
 setQtyInput("1");
 setNoteInput("");
 };
  // Submit Movement to server RPC adjust_stock / transferStock
  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant || isUpdating) return;

    const parsedQty = parseInt(qtyInput, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      toast.error("Informe uma quantidade válida maior que zero.");
      return;
    }

    if ((movementType === "damage" || movementType === "transfer") && !noteInput.trim()) {
      toast.error("Justificativa é obrigatória para perdas/avarias e transferências.");
      return;
    }

    setIsUpdating(true);
    try {
      if (movementType === "transfer") {
        const sourceId = selectedLocationId === "all" ? (locations.find((l) => l.is_default)?.id || locations[0]?.id || "") : selectedLocationId;
        if (!destLocationId || destLocationId === sourceId) {
          toast.error("Selecione um armazém de destino diferente da origem.");
          setIsUpdating(false);
          return;
        }

        const res = await transferStock({
          data: {
            variantId: selectedVariant.id,
            sourceLocationId: sourceId,
            destinationLocationId: destLocationId,
            qty: parsedQty,
            note: noteInput || "Transferência entre armazéns",
          },
        });

        if (res) {
          toast.success("Transferência concluída");
          setSelectedVariant(null);
          const updated = await getStockLevels({ data: { locationId: selectedLocationId === "all" ? undefined : selectedLocationId, search } });
          if (Array.isArray(updated)) setStock(updated);
          router.invalidate();
        }
      } else {
        const finalQty = movementType === "damage" ? -Math.abs(parsedQty) : parsedQty;
        const res = await adjustStock({
          data: {
            variantId: selectedVariant.id,
            qty: finalQty,
            movementType,
            note: noteInput || `Movimentação ${movementType}`,
            locationId: selectedLocationId === "all" ? undefined : selectedLocationId || undefined,
          },
        });

        if (res) {
          toast.success("Estoque atualizado");
          setSelectedVariant(null);
          const updated = await getStockLevels({ data: { locationId: selectedLocationId === "all" ? undefined : selectedLocationId, search } });
          if (Array.isArray(updated)) {
            setStock(updated);
          } else {
            setStock((prev) =>
              prev.map((v) => {
                if (v.id === selectedVariant.id) {
                  return {
                    ...v,
                    stock_on_hand: Math.max(0, (v.stock_on_hand ?? 0) + finalQty),
                  };
                }
                return v;
              }),
            );
          }
          router.invalidate();
        } else {
          toast.error((res as any)?.message || "Erro ao atualizar estoque.");
        }
      }
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar estoque.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
      <PageHeader
        eyebrow="Opera��es"
        title="Estoque"
      />

      {/* Grid de KPIs de Estoque */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-card rounded-lg p-4 border border-border/60">
          <span className="text-xs font-semibold text-muted-foreground">Total de SKUs</span>
          <div className="text-2xl font-bold text-foreground mt-1">{metrics.totalSKUs}</div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border/60">
          <span className="text-xs font-semibold text-muted-foreground">Estoque em Mãos</span>
          <div className="text-2xl font-bold text-foreground mt-1">{metrics.totalOnHand} un.</div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border/60">
          <span className="text-xs font-semibold text-muted-foreground">Estoque Crítico</span>
          <div className="text-2xl font-bold text-warning-foreground mt-1">{metrics.criticalCount}</div>
        </div>
      </div>

      {/* Seletor de Armazém / Local de Estoque (Omni-Hub ERP V122) */}
      {locations.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-2">
            <Box className="size-3.5 text-primary" /> Armazém:
          </span>
          <button
            type="button"
            onClick={() => handleSelectLocation("all")}
            className={cn(
              "px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0",
              selectedLocationId === "all"
                ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                : "border-border/60 bg-card hover:bg-muted/40 text-muted-foreground"
            )}
          >
            Todos os Armazéns
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelectLocation(loc.id)}
              className={cn(
                "px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-2",
                selectedLocationId === loc.id
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border/60 bg-card hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <span>{loc.name}</span>
              {loc.is_default && (
                <span className="text-xs opacity-75 font-mono">(Principal)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── TOOLBAR CANÔNICA SOBERANA Waesy ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: "Todos", count: stock.length },
          { id: "available", label: "Regular", count: stock.filter((v) => (v.stock_on_hand ?? 0) > 5).length },
          { id: "critical", label: "Crítico", count: metrics.criticalCount },
          { id: "out_of_stock", label: "Esgotado", count: stock.filter((v) => (v.stock_on_hand ?? 0) <= 0).length },
        ]}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        searchPlaceholder="Buscar por SKU ou Nome do Produto..."
        searchValue={search}
        onSearchChange={setSearch}
        secondaryActions={[
          {
            label: "Scanner",
            icon: ScanBarcode,
            onClick: () => setScannerOpen(true), // focus-visible:
          },
          {
            label: `Alertas (${metrics.criticalCount})`,
            icon: AlertTriangle,
            onClick: () => router.navigate({ to: "/workspace/estoque/alertas" }),
          },
          {
            label: "Histórico",
            icon: History,
            onClick: () => router.navigate({ to: "/workspace/estoque/movimentos" }),
          },
        ]}
      />

      {/* ── LISTAGEM DE ESTOQUE: DUAL-VIEW MOBILE / DESKTOP ── */}
      {stock.length === 0 ? (
        <EmptyState title="Sem variações cadastradas" />
      ) : (
        <>
          {/* Visualização Mobile: Cards Verticais Independentes (block md:hidden) */}
          <div className="block md:hidden space-y-3 mb-6">
            {filteredStock.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                Nenhum SKU encontrado para os filtros aplicados.
              </div>
            ) : (
              filteredStock.map((variant) => {
                const onHand = variant.stock_on_hand ?? 0;
                const available = Math.max(0, onHand);

                return (
                  <div
                    key={variant.id}
                    className="rounded-lg border border-border/60 bg-card p-4 space-y-4 shadow-2xs"
                  >
                    {/* Topo do Card: SKU e Nível */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-muted/60 text-foreground border border-border/40">
                        {variant.sku}
                      </span>
                      <div>
                        {available <= 0 ? (
                          <Badge variant="destructive" className="text-xs font-semibold px-2 py-1">
                            Esgotado
                          </Badge>
                        ) : available <= 5 ? (
                          <Badge variant="warning" className="text-xs font-semibold px-2 py-1">
                            Crítico
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs font-semibold px-2 py-1">
                            Regular
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Título do Produto */}
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {variant.products?.title || "Produto sem título"}
                      </h3>
                      {variant.products?.status !== "published" && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Inativo
                        </Badge>
                      )}
                    </div>

                    {/* Saldo Disponível */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
                      <span className="text-xs font-medium text-muted-foreground">Saldo disponível em mãos</span>
                      <span className="text-xl font-mono font-black text-foreground">
                        {available}{" "}
                        <span className="text-xs font-normal text-muted-foreground">un.</span>
                      </span>
                    </div>

                    {/* Ações Rápidas de Estoque Touch Ergonomic (44px) */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenMovementModal(variant, "purchase")}
                        className="h-11 flex-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <Plus className="size-4 mr-1" /> Entrada
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenMovementModal(variant, "damage")}
                        className="h-11 flex-1 rounded-lg text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                      >
                        <Minus className="size-4 mr-1" /> Avaria
                      </Button>

                      <StockAuditDialog
                        variant={variant}
                        className="h-11 px-4 rounded-lg text-xs font-semibold border-border/60 hover:bg-muted/40 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Visualização Desktop: Tabela de Alta Densidade (hidden md:block) */}
          <div className="hidden md:block bg-card rounded-lg border border-border/60 overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Em Mãos (Disponível)</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead className="text-center">Operar Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((variant) => {
                  const onHand = variant.stock_on_hand ?? 0;
                  const available = Math.max(0, onHand);

                  return (
                    <TableRow key={variant.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{variant.sku}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {variant.products?.title || "Produto sem título"}
                          </span>
                          {variant.products?.status !== "published" && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-bold text-sm">{available}</TableCell>

                      <TableCell className="text-center">
                        {available <= 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            Esgotado
                          </Badge>
                        ) : available <= 5 ? (
                          <Badge variant="warning" className="text-xs">
                            Crítico
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            Regular
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 px-3 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                            onClick={() => handleOpenMovementModal(variant, "purchase")}
                          >
                            <Plus className="size-3.5 mr-1" /> Entrada
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                            onClick={() => handleOpenMovementModal(variant, "damage")}
                          >
                            <Minus className="size-3.5 mr-1" /> Avaria
                          </Button>
                          <StockAuditDialog variant={variant} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredStock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum SKU encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

 {/* SheetPage de Movimentação por Linha */}
 <SheetPage
 open={Boolean(selectedVariant)}
 onOpenChange={(open) => !open && setSelectedVariant(null)}
 title="Movimentação de Estoque"
 description={`SKU: ${selectedVariant?.sku || ""} (${selectedVariant?.products?.title || ""})`}
 size="default"
 footer={
 <div className="flex items-center justify-between w-full">
 <Button
 type="button"
 variant="outline"
 onClick={() => setSelectedVariant(null)}
 disabled={isUpdating}
 className="rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={handleExecuteMovement}
 disabled={isUpdating}
 className="rounded-lg text-xs font-bold bg-primary text-primary-foreground"
 >
 {isUpdating ? "Gravando..." : "Confirmar Movimentação"}
 </Button>
 </div>
 }
 >
 <form onSubmit={handleExecuteMovement} className="space-y-4 py-2">
  {locations.length > 0 && movementType !== "transfer" && (
    <div className="space-y-2">
      <Label className="text-xs font-bold">Armazém / Local de Estoque</Label>
      <Select
        value={selectedLocationId === "all" ? (locations.find((l) => l.is_default)?.id || locations[0]?.id || "") : selectedLocationId}
        onValueChange={setSelectedLocationId}
      >
        <SelectTrigger className="h-10 rounded-lg text-xs">
          <SelectValue placeholder="Selecione o local" />
        </SelectTrigger>
        <SelectContent className="rounded-lg">
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id} className="text-xs">
              {loc.name} {loc.is_default ? "(Principal)" : `(${loc.type})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}

  {locations.length > 0 && movementType === "transfer" && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground">Origem (Saída)</Label>
        <Select
          value={selectedLocationId === "all" ? (locations.find((l) => l.is_default)?.id || locations[0]?.id || "") : selectedLocationId}
          onValueChange={setSelectedLocationId}
        >
          <SelectTrigger className="h-10 rounded-lg text-xs">
            <SelectValue placeholder="Armazém de Origem" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} className="text-xs">
                {loc.name} {loc.is_default ? "(Principal)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground">Destino (Entrada)</Label>
        <Select value={destLocationId} onValueChange={setDestLocationId}>
          <SelectTrigger className="h-10 rounded-lg text-xs">
            <SelectValue placeholder="Armazém de Destino" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {locations
              .filter((loc) => loc.id !== (selectedLocationId === "all" ? (locations.find((l) => l.is_default)?.id || locations[0]?.id || "") : selectedLocationId))
              .map((loc) => (
                <SelectItem key={loc.id} value={loc.id} className="text-xs">
                  {loc.name} {loc.is_default ? "(Principal)" : ""}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )}

 <div className="space-y-2">
 <Label className="text-xs font-bold">Tipo de Movimentação</Label>
 <Select value={movementType} onValueChange={(val: any) => setMovementType(val)}>
 <SelectTrigger className="h-10 rounded-lg text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="purchase">Entrada por Compra (Fornecedor)</SelectItem>
 <SelectItem value="adjustment">Ajuste Manual de Inventário</SelectItem>
 <SelectItem value="damage">Perda / Avaria (Saída Físico)</SelectItem>
 <SelectItem value="transfer">Transferência entre Filiais</SelectItem>
 <SelectItem value="return">Devolução de Cliente</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Quantidade *</Label>
 <Input
 type="number"
 min="1"
 value={qtyInput}
 onChange={(e) => setQtyInput(e.target.value)}
 required
 className="h-10 rounded-lg text-xs font-mono font-bold"
 />
 <p className="text-xs text-muted-foreground">
 {movementType === "damage"
 ? "A quantidade será deduzida automaticamente do saldo em mãos."
 : "A quantidade será adicionada ao saldo em mãos."}
 </p>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">
 Justificativa / Observação{" "}
 {(movementType === "damage" || movementType === "transfer") && "*"}
 </Label>
 <Input
 placeholder="Ex: Nota fiscal 4092, caixa avariada no frete..."
 value={noteInput}
 onChange={(e) => setNoteInput(e.target.value)}
 required={movementType === "damage" || movementType === "transfer"}
 className="h-10 rounded-lg text-xs"
 />
 </div>
 </form>
 </SheetPage>

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(result) => {
          setSearch(result.raw);
          setScannerOpen(false);
          toast.info(`Código capturado: ${result.raw}`);
        }}
        title="Scanner de Código de Barras"
      />
 </div>
 );
}
