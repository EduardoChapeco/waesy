import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 DollarSign,
 Plus,
 Search,
 Percent,
 TrendingDown,
 TrendingUp,
 Tag,
 ExternalLink,
 Edit2,
 Trash2,
 CheckCircle2,
 Package,
 Layers,
 Link as LinkIcon,
 Copy,
 Save,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/state/states";
import {
 listPriceTables,
 createPriceTable,
 updatePriceTable,
 deletePriceTable,
 listPriceTableItems,
 upsertPriceTableItem,
 type PriceTableDTO,
 type PriceTableItemDTO,
} from "@/services/price-tables.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/catalogo/tabelas")({
 head: () => ({ meta: [{ title: "Tabelas de Preços (B2B, Atacado, Varejo) | Workspace" }] }),
 loader: async () => {
   try {
 const tables = await listPriceTables().catch(() => []);
 return { tables };
   } catch (err) {
     console.error("[loader:workspace.catalogo.tabelas] Unhandled loader error:", err);
     return { tables: null };
   }
 },
 component: WorkspacePriceTablesPage,
});

function WorkspacePriceTablesPage() {
 const { tables: initialTables } = ((Route.useLoaderData?.() as any) || {});
 const [tables, setTables] = useState<PriceTableDTO[]>(initialTables || []);
 const [selectedTable, setSelectedTable] = useState<PriceTableDTO | null>(
 initialTables && initialTables.length > 0 ? initialTables[0] : null,
 );
 const [tableItems, setTableItems] = useState<PriceTableItemDTO[]>([]);
 const [isLoadingItems, setIsLoadingItems] = useState(false);
 const [searchItemQuery, setSearchItemQuery] = useState("");

 // Modais de Criação / Edição
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [tableName, setTableName] = useState("");
 const [tableCode, setTableCode] = useState("");
 const [tableDesc, setTableDesc] = useState("");
 const [adjustmentType, setAdjustmentType] = useState<any>("percentage_discount");
 const [adjustmentValue, setAdjustmentValue] = useState("10");
 const [isDefault, setIsDefault] = useState(false);

 // Carrega itens da tabela selecionada
 const loadItems = async (tableId: string) => {
 setIsLoadingItems(true);
 try {
 const items = await listPriceTableItems({ data: { priceTableId: tableId } });
 setTableItems(items);
 } catch {
 toast.error("Erro ao carregar produtos da tabela.");
 } finally {
 setIsLoadingItems(false);
 }
 };

 const handleSelectTable = (table: PriceTableDTO) => {
 setSelectedTable(table);
 loadItems(table.id);
 };

 const refreshTables = async () => {
 const updated = await listPriceTables().catch(() => []);
 setTables(updated);
 if (updated.length > 0 && (!selectedTable || !updated.some((t) => t.id === selectedTable.id))) {
 setSelectedTable(updated[0]);
 loadItems(updated[0].id);
 }
 };

 const handleOpenCreate = () => {
 setTableName("");
 setTableCode("");
 setTableDesc("");
 setAdjustmentType("percentage_discount");
 setAdjustmentValue("10");
 setIsDefault(false);
 setIsModalOpen(true);
 };

 const handleSaveTable = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!tableName.trim() || !tableCode.trim()) {
 toast.error("Preencha nome e código da tabela.");
 return;
 }

 setIsSubmitting(true);
 try {
 await createPriceTable({
 data: {
 name: tableName,
 code: tableCode,
 description: tableDesc,
 adjustment_type: adjustmentType,
 adjustment_value: Number(adjustmentValue) || 0,
 is_default: isDefault,
 },
 });
 toast.success("Tabela de preços criada com sucesso!");
 setIsModalOpen(false);
 await refreshTables();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao criar tabela.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleInlinePriceChange = (productId: string, newPriceCents: number) => {
 setTableItems((prev) =>
 prev.map((item) =>
 item.product_id === productId
 ? { ...item, custom_price_cents: newPriceCents }
 : item,
 ),
 );
 };

 const handleSaveInlineItem = async (item: PriceTableItemDTO) => {
 if (!selectedTable) return;
 try {
 await upsertPriceTableItem({
 data: {
 priceTableId: selectedTable.id,
 productId: item.product_id,
 customPriceCents: item.custom_price_cents,
 minQuantity: item.min_quantity || 1,
 },
 });
 toast.success(`Preço de "${item.product_name}" atualizado nesta tabela!`);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar preço customizado.");
 }
 };

 const handleCopyLink = (code: string) => {
 if (typeof window !== "undefined") {
 const url = `${window.location.origin}/perfil-da-loja?tabela=${code}`;
 navigator.clipboard.writeText(url);
 toast.success("Link exclusivo da vitrine com esta tabela copiado!");
 }
 };

 const filteredItems = useMemo(() => {
 if (!searchItemQuery.trim()) return tableItems;
 const q = searchItemQuery.toLowerCase();
 return tableItems.filter(
 (item) =>
 item.product_name.toLowerCase().includes(q) ||
 (item.product_sku && item.product_sku.toLowerCase().includes(q)),
 );
 }, [tableItems, searchItemQuery]);

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
 <PageHeader
 eyebrow="Catálogo"
 title="Tabelas de Preços"
 actions={
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-xs font-mono bg-card">
 {tables.length} {tables.length === 1 ? "tabela" : "tabelas"}
 </Badge>
 <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 font-bold text-xs">
 <Plus className="size-3.5" />
 Nova Tabela
 </Button>
 </div>
 }
 />

 {/* Grid Principal: Lista Lateral de Tabelas + Edição In-Page de Preços */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
 {/* Coluna 1: Lista de Tabelas (4 cols) */}
 <div className="lg:col-span-4 space-y-2.5">
 <div className="space-y-2">
 {tables.map((tbl) => {
 const isSelected = selectedTable?.id === tbl.id;
 return (
 <div
 key={tbl.id}
 onClick={() => handleSelectTable(tbl)}
 className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
 isSelected
 ? "bg-card border-primary ring-2 ring-primary/10 shadow-xs"
 : "bg-card/60 border-border/60 hover:bg-card"
 }`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm text-foreground">{tbl.name}</span>
 {tbl.is_default && (
 <Badge variant="secondary" className="text-[10px]">
 Padrão
 </Badge>
 )}
 </div>
 <Badge variant="outline" className="text-[10px] font-mono uppercase">
 {tbl.code}
 </Badge>
 </div>

 {tbl.description && (
 <p className="text-xs text-muted-foreground line-clamp-1">{tbl.description}</p>
 )}

 <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
 <div className="flex items-center gap-1.5 text-muted-foreground">
 {tbl.adjustment_type === "percentage_discount" && (
 <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
 <TrendingDown className="size-3.5" />
 -{tbl.adjustment_value}% Desconto
 </span>
 )}
 {tbl.adjustment_type === "percentage_markup" && (
 <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
 <TrendingUp className="size-3.5" />
 +{tbl.adjustment_value}% Acréscimo
 </span>
 )}
 {tbl.adjustment_type === "none" && <span>Preços Base</span>}
 {tbl.adjustment_type === "custom_prices" && <span>Preços Fixos</span>}
 </div>

 <Button
 variant="ghost"
 size="icon"
 onClick={(e) => {
 e.stopPropagation();
 handleCopyLink(tbl.code);
 }}
 className="size-7 text-muted-foreground hover:text-foreground"
 title="Copiar Link da Vitrine"
 >
 <Copy className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Coluna 2: Edição In-Page de Preços dos Produtos (8 cols) */}
 <div className="lg:col-span-8 space-y-4">
 {selectedTable ? (
 <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base sm:text-lg font-bold text-foreground">
 {selectedTable.name}
 </h2>
 <Badge variant="outline" className="font-mono text-xs">
 ?tabela={selectedTable.code}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 Ajuste os preços dos produtos para esta tabela. Você pode usar a regra geral da tabela ou digitar preços fixos.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleCopyLink(selectedTable.code)}
 className="h-8 text-xs font-bold gap-1.5"
 >
 <LinkIcon className="size-3.5" />
 Link da Vitrine
 </Button>
 </div>
 </div>

 {/* Busca de Produtos */}
 <div className="relative">
 <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 value={searchItemQuery}
 onChange={(e) => setSearchItemQuery(e.target.value)}
 placeholder="Buscar produto por nome ou SKU..."
 className="pl-9 h-9 text-xs"
 />
 </div>

              {/* ── LISTAGEM DE PRODUTOS DA TABELA: DUAL-VIEW MOBILE / DESKTOP ── */}
              {/* Visualização Mobile: Cards Verticais Independentes (block md:hidden) */}
              <div className="block md:hidden space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {isLoadingItems
                      ? "Carregando catálogo de produtos..."
                      : "Nenhum produto encontrado."}
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.product_id}
                      className="rounded-2xl border border-border/50 bg-background p-3.5 space-y-3 shadow-2xs"
                    >
                      {/* Topo do Card: Imagem e Dados do Produto */}
                      <div className="flex items-center gap-3">
                        {item.product_image_url ? (
                          <img
                            src={item.product_image_url}
                            alt={item.product_name}
                            className="size-12 rounded-xl object-cover shrink-0 border border-border/40"
                          />
                        ) : (
                          <div className="size-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40">
                            <Package className="size-6 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base text-foreground leading-snug truncate">
                            {item.product_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.product_sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                SKU: {item.product_sku}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              • Base: <strong className="font-mono text-foreground">{formatMoney(item.base_price_cents)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Campo de Ajuste de Preço Touch (44px) */}
                      <div className="pt-2 border-t border-border/30 space-y-1.5">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Preço nesta Tabela (R$)
                        </Label>
                        <div className="flex items-center gap-2">
                          <CurrencyField
                            value={item.custom_price_cents}
                            onChange={(cents) => {
                              handleInlinePriceChange(item.product_id, cents ?? 0);
                            }}
                            onEnter={() => handleSaveInlineItem(item)}
                            placeholder="0,00"
                            className="h-11 rounded-xl text-base font-mono font-bold flex-1 bg-card border-border/70"
                          />
                          <Button
                            type="button"
                            onClick={() => handleSaveInlineItem(item)}
                            className="h-11 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shrink-0 cursor-pointer shadow-2xs"
                          >
                            <Save className="size-4" />
                            <span>Salvar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Visualização Desktop: Tabela de Produtos com Edição Inline (hidden md:block) */}
              <div className="hidden md:block rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Produto</th>
                      <th className="py-2.5 px-3 text-right">Preço Base</th>
                      <th className="py-2.5 px-3 text-right">Preço nesta Tabela</th>
                      <th className="py-2.5 px-3 text-center w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          {isLoadingItems
                            ? "Carregando catálogo de produtos..."
                            : "Nenhum produto encontrado."}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.product_id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              {item.product_image_url ? (
                                <img
                                  src={item.product_image_url}
                                  alt={item.product_name}
                                  className="size-8 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <Package className="size-4 text-muted-foreground/50" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-foreground block truncate">
                                  {item.product_name}
                                </span>
                                {item.product_sku && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    SKU: {item.product_sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {formatMoney(item.base_price_cents)}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end w-36 ml-auto">
                              <CurrencyField
                                compact
                                value={item.custom_price_cents}
                                onChange={(cents) => {
                                  handleInlinePriceChange(item.product_id, cents ?? 0);
                                }}
                                onEnter={() => handleSaveInlineItem(item)}
                                placeholder="0,00"
                                className="text-right font-mono font-bold bg-background text-xs"
                              />
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveInlineItem(item)}
                              className="size-7 text-primary hover:bg-primary/10"
                              title="Salvar Preço (Enter)"
                            >
                              <Save className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
 ) : (
 <EmptyState
 title="Selecione ou crie uma tabela de preços"
 description="Gerencie regras comerciais personalizadas para B2B, atacado, representantes e clientes VIP."
 />
 )}
 </div>
 </div>

 {/* Drawer Lateral no Desktop / Fullscreen no Mobile: Criar Tabela */}
 <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col justify-between overflow-y-auto no-scrollbar">
 <div>
 <SheetHeader className="pb-4">
 <SheetTitle>Nova Tabela de Preços</SheetTitle>
 <SheetDescription>
 Configure listas diferenciadas para Varejo, Atacado, Revenda, Vendedores ou Clientes VIP.
 </SheetDescription>
 </SheetHeader>

 <form id="price-table-form" onSubmit={handleSaveTable} className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs">Nome da Tabela</Label>
 <Input
 value={tableName}
 onChange={(e) => setTableName(e.target.value)}
 placeholder="Ex: Atacado Distribuidor, Revenda B2B"
 className="text-xs"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Código / Slug da Vitrine</Label>
 <Input
 value={tableCode}
 onChange={(e) => setTableCode(e.target.value)}
 placeholder="Ex: atacado, revenda, vip"
 className="text-xs font-mono"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs">Tipo de Regra</Label>
 <Select value={adjustmentType} onValueChange={setAdjustmentType}>
 <SelectTrigger className="text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="percentage_discount">Desconto (%)</SelectItem>
 <SelectItem value="percentage_markup">Acréscimo (%)</SelectItem>
 <SelectItem value="custom_prices">Preços Fixos</SelectItem>
 <SelectItem value="none">Preço Base (0%)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Valor do Ajuste (%)</Label>
 <Input
 type="number"
 step="0.1"
 value={adjustmentValue}
 onChange={(e) => setAdjustmentValue(e.target.value)}
 placeholder="10"
 className="text-xs font-mono"
 disabled={adjustmentType === "none" || adjustmentType === "custom_prices"}
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Descrição / Observação</Label>
 <Input
 value={tableDesc}
 onChange={(e) => setTableDesc(e.target.value)}
 placeholder="Ex: Válido para compras de CNPJ acima de R$ 500"
 className="text-xs"
 />
 </div>
 </form>
 </div>

 <SheetFooter className="pt-4 border-t border-border/40">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsModalOpen(false)}
 className="text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 form="price-table-form"
 disabled={isSubmitting}
 className="text-xs font-bold"
 >
 {isSubmitting ? "Salvando..." : "Criar Tabela"}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </div>
 );
}
