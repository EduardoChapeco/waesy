import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  ChefHat,
  Printer,
  Trash2,
  Package,
  TrendingDown,
  ShoppingBag,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Thermometer,
  FileText,
  Truck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import {
  listSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  listRecipes,
  createRecipe,
  createProductionOrder,
  listWasteLogs,
  registerWaste,
  recordSupplyPurchaseEntry,
  listSuppliers,
  listExpirationLabels,
} from "@/services/gastronomy-supplies.functions";
import { ThermalExpirationTicketModal } from "@/components/kitchen/thermal-expiration-ticket";

interface GastronomyPantryHubProps {
  storeId?: string;
  storeName?: string;
  nicheId?: string;
}

export function GastronomyPantryHub({
  storeId,
  storeName = "Waesy Gastronomia",
  nicheId = "gastronomy",
}: GastronomyPantryHubProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"supplies" | "recipes" | "production" | "waste" | "labels">("supplies");

  // Filtros de Despensa
  const [suppliesSearch, setSuppliesSearch] = useState("");
  const [suppliesCategory, setSuppliesCategory] = useState<string>("all");
  const [suppliesLowStockOnly, setSuppliesLowStockOnly] = useState(false);

  // Modais
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [selectedRecipeForProduction, setSelectedRecipeForProduction] = useState<any>(null);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplyForPurchase, setSelectedSupplyForPurchase] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketData, setTicketData] = useState<{
    title: string;
    batchCode: string;
    expiresAt: string;
    storageTemperature: string;
    responsibleName: string;
  } | null>(null);

  // Queries
  const { data: supplies = [], isLoading: isLoadingSupplies } = useQuery({
    queryKey: ["gastronomy-supplies", suppliesCategory, suppliesSearch, suppliesLowStockOnly],
    queryFn: () =>
      listSupplies({
        category: suppliesCategory === "all" ? undefined : (suppliesCategory as any),
        search: suppliesSearch,
        lowStockOnly: suppliesLowStockOnly,
      }),
  });

  const { data: recipes = [], isLoading: isLoadingRecipes } = useQuery({
    queryKey: ["gastronomy-recipes"],
    queryFn: () => listRecipes({}),
  });

  const { data: wasteData, isLoading: isLoadingWaste } = useQuery({
    queryKey: ["gastronomy-waste"],
    queryFn: () => listWasteLogs({ limit: 40 }),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["gastronomy-suppliers"],
    queryFn: () => listSuppliers({}),
  });

  const { data: printedLabels = [], isLoading: isLoadingLabels } = useQuery({
    queryKey: ["gastronomy-labels"],
    queryFn: () => listExpirationLabels({ limit: 20 }),
  });

  // Métricas do Topo
  const metrics = useMemo(() => {
    const list = Array.isArray(supplies) ? supplies : [];
    const totalCount = list.length;
    const lowCount = list.filter((s: any) => s.is_low_stock).length;
    let totalInventoryValueCents = 0;

    for (const s of list) {
      const stock = Number(s.stock_on_hand || 0);
      const cost = Number(s.cost_cents_per_unit || 0);
      totalInventoryValueCents += Math.round(stock * cost);
    }

    return {
      totalCount,
      lowCount,
      totalInventoryValueCents,
      recipesCount: Array.isArray(recipes) ? recipes.length : 0,
      monthlyLossCents: wasteData?.total_loss_cents || 0,
    };
  }, [supplies, recipes, wasteData]);

  // Form State: Novo Insumo
  const [supplyName, setSupplyName] = useState("");
  const [supplyCategory, setSupplyCategory] = useState<"ingredient" | "packaging" | "chemical" | "other">("ingredient");
  const [supplyUnit, setSupplyUnit] = useState<"g" | "kg" | "ml" | "l" | "un">("un");
  const [supplyStock, setSupplyStock] = useState("0");
  const [supplyMinAlert, setSupplyMinAlert] = useState("0");
  const [supplyCost, setSupplyCost] = useState("0,00");
  const [supplyShelfLife, setSupplyShelfLife] = useState("3");
  const [supplyStorageTemp, setSupplyStorageTemp] = useState("Refrigerado 0°C a 4°C");

  // Form State: Nova Receita
  const [recipeName, setRecipeName] = useState("");
  const [recipeType, setRecipeType] = useState<"sub_recipe" | "product_dish">("sub_recipe");
  const [recipeYieldQty, setRecipeYieldQty] = useState("1");
  const [recipeYieldUnit, setRecipeYieldUnit] = useState<"un" | "kg" | "l" | "porcoes" | "g" | "ml">("un");
  const [recipeTimeMinutes, setRecipeTimeMinutes] = useState("20");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeChefNotes, setRecipeChefNotes] = useState("");
  const [recipeShelfLifeHours, setRecipeShelfLifeHours] = useState("72");
  const [recipeStorageInstructions, setRecipeStorageInstructions] = useState("Etiquetar e refrigerar entre 0°C e 4°C");
  const [recipeItems, setRecipeItems] = useState<{ supplyId: string; quantity: number; unit: any; notes?: string }[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [newIngredientSupplyId, setNewIngredientSupplyId] = useState<string>("");
  const [newIngredientQty, setNewIngredientQty] = useState<string>("1");
  const [purchaseConversionFactor, setPurchaseConversionFactor] = useState<string>("1");

  const hubTerms = useMemo(() => {
    if (nicheId === "services" || nicheId === "health_beauty") {
      return {
        suppliesTab: "Almoxarifado & Químicos",
        recipesTab: "Protocolos, Kits & POP",
        subRecipeBadge: "Mistura / Kit Técnico",
        dishBadge: "Protocolo de Serviço",
        produceAction: "Preparar Kit / Mistura",
        popLabel: "POP (Protocolo de Aplicação Passo a Passo)",
        guideTitle: "Arquitetura Recursiva: Insumos → Misturas/Kits → Procedimentos & Agenda",
        guideDesc: "Cadastre frascos/químicos no almoxarifado, monte misturas ou kits esterilizados e vincule aos serviços para baixa automática e cálculo de margem real.",
      };
    }
    if (nicheId === "automotive") {
      return {
        suppliesTab: "Fluidos, Peças & Insumos",
        recipesTab: "Kits de Revisão & POP",
        subRecipeBadge: "Kit de Bancada",
        dishBadge: "Ordem de Serviço",
        produceAction: "Montar Kit na Bancada",
        popLabel: "POP (Checklist Técnico de Bancada)",
        guideTitle: "Arquitetura Recursiva: Fluidos/Peças → Kits de Revisão → Serviços/OS",
        guideDesc: "Controle tambores por litro/ml com fator de conversão na compra, monte kits de revisão e vincule às Ordens de Serviço.",
      };
    }
    if (nicheId === "retail") {
      return {
        suppliesTab: "Insumos & Embalagens",
        recipesTab: "Cestas, Kits & Montagem",
        subRecipeBadge: "Sub-Kit / Base",
        dishBadge: "Kit / Cesta Final",
        produceAction: "Montar Lote de Kits",
        popLabel: "POP (Padrão de Montagem e Embalagem)",
        guideTitle: "Arquitetura Recursiva: Itens Base → Sub-Kits → Cestas & Variações",
        guideDesc: "Vincule itens e embalagens a kits compostos ou variações de produtos. Ao esgotar um item gargalo, o kit é pausado automaticamente.",
      };
    }
    return {
      suppliesTab: "Insumos & Despensa",
      recipesTab: "Fichas Técnicas & POP",
      subRecipeBadge: "Sub-Receita (Base/Molho/Massa)",
      dishBadge: "Prato Final do Cardápio",
      produceAction: "Produzir Lote na Cozinha",
      popLabel: "POP (Modo de Preparo Passo a Passo)",
      guideTitle: "Arquitetura Recursiva: Insumos → Sub-Receitas (Chilli/Massas) → Pratos & Sabores",
      guideDesc: "Produza lotes de sub-receitas (que entram automaticamente no estoque como insumos compostos) e vincule-os ao produto principal ou a sabores/adicionais específicos.",
    };
  }, [nicheId]);

  // Form State: Ordem de Produção
  const [productionBatches, setProductionBatches] = useState("1");
  const [productionChef, setProductionChef] = useState("Cozinha");
  const [productionNotes, setProductionNotes] = useState("");

  // Form State: Desperdício
  const [wasteSupplyId, setWasteSupplyId] = useState<string>("");
  const [wasteQty, setWasteQty] = useState("1");
  const [wasteReason, setWasteReason] = useState<"expired" | "spoiled" | "burnt" | "dropped" | "prep_error" | "customer_returned" | "other">("spoiled");
  const [wasteReasonDesc, setWasteReasonDesc] = useState("");
  const [wasteOperator, setWasteOperator] = useState("Operador");

  // Form State: Entrada de Compras
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseTotalCost, setPurchaseTotalCost] = useState("0,00");
  const [purchaseInvoice, setPurchaseInvoice] = useState("");
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");

  // Mutations
  const createSupplyMutation = useMutation({
    mutationFn: createSupply,
    onSuccess: () => {
      toast.success("Insumo cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gastronomy-supplies"] });
      queryClient.invalidateQueries({ queryKey: ["store-supplies-active"] });
      setIsSupplyModalOpen(false);
      resetSupplyForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar insumo."),
  });

  const updateRecipeMutation = useMutation({
    mutationFn: updateRecipe,
    onSuccess: () => {
      toast.success("Ficha técnica atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gastronomy-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["store-recipes-sub"] });
      setIsRecipeModalOpen(false);
      resetRecipeForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar ficha técnica."),
  });

  const createRecipeMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      toast.success("Ficha técnica cadastrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gastronomy-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["store-recipes-sub"] });
      setIsRecipeModalOpen(false);
      resetRecipeForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar receita."),
  });

  const executeProductionMutation = useMutation({
    mutationFn: createProductionOrder,
    onSuccess: (data: any) => {
      toast.success(`Lote ${data.batch_code} produzido! Estoques atualizados.`);
      queryClient.invalidateQueries({ queryKey: ["gastronomy-supplies"] });
      queryClient.invalidateQueries({ queryKey: ["gastronomy-labels"] });
      setIsProductionModalOpen(false);

      // Abre modal de etiqueta térmica para impressão imediata
      setTicketData({
        title: selectedRecipeForProduction?.name || "Preparo",
        batchCode: data.batch_code,
        expiresAt: data.expires_at,
        storageTemperature: selectedRecipeForProduction?.storage_instructions || "Refrigerado 0°C a 4°C",
        responsibleName: productionChef,
      });
      setIsTicketModalOpen(true);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao registrar produção."),
  });

  const registerWasteMutation = useMutation({
    mutationFn: registerWaste,
    onSuccess: () => {
      toast.success("Perda registrada com sucesso no livro de desperdício!");
      queryClient.invalidateQueries({ queryKey: ["gastronomy-supplies"] });
      queryClient.invalidateQueries({ queryKey: ["gastronomy-waste"] });
      setIsWasteModalOpen(false);
      setWasteQty("1");
      setWasteReasonDesc("");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao registrar perda."),
  });

  const purchaseEntryMutation = useMutation({
    mutationFn: recordSupplyPurchaseEntry,
    onSuccess: () => {
      toast.success("Entrada de estoque realizada e custo médio atualizado!");
      queryClient.invalidateQueries({ queryKey: ["gastronomy-supplies"] });
      setIsPurchaseModalOpen(false);
      setPurchaseQty("1");
      setPurchaseTotalCost("0,00");
      setPurchaseInvoice("");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao registrar compras."),
  });

  const resetSupplyForm = () => {
    setSupplyName("");
    setSupplyCategory("ingredient");
    setSupplyUnit("un");
    setSupplyStock("0");
    setSupplyMinAlert("0");
    setSupplyCost("0,00");
    setSupplyShelfLife("3");
    setSupplyStorageTemp("Refrigerado 0°C a 4°C");
    setEditingSupply(null);
  };

  const resetRecipeForm = () => {
    setRecipeName("");
    setRecipeType("sub_recipe");
    setRecipeYieldQty("1");
    setRecipeYieldUnit("un");
    setRecipeTimeMinutes("20");
    setRecipeInstructions("");
    setRecipeChefNotes("");
    setRecipeShelfLifeHours("72");
    setRecipeStorageInstructions("Etiquetar e refrigerar entre 0°C e 4°C");
    setRecipeItems([]);
    setEditingRecipeId(null);
    setNewIngredientSupplyId("");
    setNewIngredientQty("1");
  };

  const handleOpenTicketForSupply = (supply: any) => {
    const hours = Number(supply.standard_shelf_life_days || 3) * 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const batchCode = `INS-${Date.now().toString().slice(-6)}`;

    setTicketData({
      title: supply.name,
      batchCode,
      expiresAt,
      storageTemperature: supply.storage_temperature || "Refrigerado 0°C a 4°C",
      responsibleName: "Cozinha",
    });
    setIsTicketModalOpen(true);
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* ── Guia Arquitetural de Composição Recursiva ── */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground flex items-center gap-2">
            <ChefHat className="size-4 text-primary shrink-0" />
            <span>{hubTerms.guideTitle}</span>
          </p>
          <p className="text-2xs text-muted-foreground">{hubTerms.guideDesc}</p>
        </div>
        <Badge variant="outline" className="text-2xs font-mono shrink-0 self-start sm:self-center">
          Kardex + Auto-Pause Ativo
        </Badge>
      </div>

      {/* ── KPI Strip Superior ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Boxes className="size-3 text-primary" />
            <span>Insumos Ativos</span>
          </span>
          <p className="text-xl font-extrabold font-mono text-foreground">{metrics.totalCount}</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="size-3 text-warning-strong" />
            <span>Estoque Crítico</span>
          </span>
          <p className="text-xl font-extrabold font-mono text-foreground">
            {metrics.lowCount > 0 ? (
              <span className="text-warning-strong">{metrics.lowCount} insumos</span>
            ) : (
              <span>0 em alerta</span>
            )}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ChefHat className="size-3 text-primary" />
            <span>Fichas Técnicas</span>
          </span>
          <p className="text-xl font-extrabold font-mono text-foreground">{metrics.recipesCount}</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/80 shadow-2xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingDown className="size-3 text-destructive" />
            <span>Perdas Registradas</span>
          </span>
          <p className="text-xl font-extrabold font-mono text-foreground">
            {formatMoney(metrics.monthlyLossCents)}
          </p>
        </div>
      </div>

      {/* ── Navegação de Abas do Módulo ── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
          <TabsList className="bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="supplies" className="gap-2 text-xs font-bold rounded-lg cursor-pointer">
              <Boxes className="size-3.5" />
              <span>{hubTerms.suppliesTab}</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2 text-xs font-bold rounded-lg cursor-pointer">
              <ChefHat className="size-3.5" />
              <span>{hubTerms.recipesTab}</span>
            </TabsTrigger>
            <TabsTrigger value="waste" className="gap-2 text-xs font-bold rounded-lg cursor-pointer">
              <TrendingDown className="size-3.5" />
              <span>Desperdício & Perdas</span>
            </TabsTrigger>
            <TabsTrigger value="labels" className="gap-2 text-xs font-bold rounded-lg cursor-pointer">
              <Printer className="size-3.5" />
              <span>Etiquetas de Validade</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "supplies" && (
              <Button
                size="sm"
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  resetSupplyForm();
                  setIsSupplyModalOpen(true);
                }}
              >
                <Plus className="size-4" />
                <span>Novo Insumo</span>
              </Button>
            )}

            {activeTab === "recipes" && (
              <Button
                size="sm"
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  resetRecipeForm();
                  setIsRecipeModalOpen(true);
                }}
              >
                <Plus className="size-4" />
                <span>Nova Ficha Técnica</span>
              </Button>
            )}

            {activeTab === "waste" && (
              <Button
                size="sm"
                variant="destructive"
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setIsWasteModalOpen(true)}
              >
                <TrendingDown className="size-4" />
                <span>Registrar Perda</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── ABA 1: INSUMOS & DESPENSA ── */}
        <TabsContent value="supplies" className="space-y-4 mt-0">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-lg bg-card border border-border/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar farinha, queijo, caixa, tempero..."
                value={suppliesSearch}
                onChange={(e) => setSuppliesSearch(e.target.value)}
                className="pl-9 h-10 text-xs rounded-lg border-border/80"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={suppliesCategory} onValueChange={setSuppliesCategory}>
                <SelectTrigger className="h-10 text-xs rounded-lg w-full sm:w-44">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="ingredient">Ingredientes</SelectItem>
                  <SelectItem value="packaging">Embalagens</SelectItem>
                  <SelectItem value="chemical">Limpeza / Químicos</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant={suppliesLowStockOnly ? "secondary" : "outline"}
                size="sm"
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSuppliesLowStockOnly(!suppliesLowStockOnly)}
              >
                <AlertTriangle className="size-3.5 mr-1" />
                <span>Estoque Baixo</span>
              </Button>
            </div>
          </div>

          {/* Tabela de Insumos */}
          <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
            {isLoadingSupplies ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Carregando catálogo de insumos da despensa...
              </div>
            ) : supplies.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Boxes className="size-8 text-muted-foreground mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Nenhum insumo encontrado</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Cadastre as matérias-primas e embalagens consumidas para ter controle de custo, ficha técnica e reposição.
                </p>
                <Button
                  size="sm"
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setIsSupplyModalOpen(true)}
                >
                  <Plus className="size-4" />
                  <span>Cadastrar Primeiro Insumo</span>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Insumo</TableHead>
                    <TableHead className="text-xs font-bold">Categoria</TableHead>
                    <TableHead className="text-xs font-bold text-right">Estoque em Mãos</TableHead>
                    <TableHead className="text-xs font-bold text-right">Custo Unitário</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(supplies as any[]).map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{s.name}</span>
                          {s.is_composite && (
                            <Badge variant="outline" className="text-3xs font-mono">
                              Sub-Receita
                            </Badge>
                          )}
                        </div>
                        {s.suppliers?.trade_name && (
                          <span className="text-2xs text-muted-foreground block mt-1">
                            Fornecedor: {s.suppliers.trade_name}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground capitalize">
                        {s.category === "ingredient" ? "Ingrediente" : s.category === "packaging" ? "Embalagem" : s.category}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-right font-bold text-foreground">
                        {s.stock_on_hand} {s.unit}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-right text-muted-foreground">
                        {formatMoney(s.cost_cents_per_unit)} / {s.unit}
                      </TableCell>

                      <TableCell className="text-center">
                        {s.is_out_of_stock ? (
                          <Badge variant="destructive" className="text-2xs font-bold uppercase">
                            Esgotado
                          </Badge>
                        ) : s.is_low_stock ? (
                          <Badge variant="warning" className="text-2xs font-bold uppercase">
                            Alerta (≤ {s.min_stock_alert} {s.unit})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-2xs font-mono">
                            Regular
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-2xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => {
                              setSelectedSupplyForPurchase(s);
                              setPurchaseQty("10");
                              setIsPurchaseModalOpen(true);
                            }}
                          >
                            <Truck className="size-3" />
                            <span>Entrada</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-2xs font-semibold gap-1 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => handleOpenTicketForSupply(s)}
                            title="Imprimir Etiqueta de Validade"
                          >
                            <Printer className="size-3" />
                            <span>Etiqueta</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── ABA 2: FICHAS TÉCNICAS & POP ── */}
        <TabsContent value="recipes" className="space-y-4 mt-0">
          {isLoadingRecipes ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Carregando fichas técnicas e procedimentos operacionais...
            </div>
          ) : recipes.length === 0 ? (
            <div className="p-12 text-center space-y-3 rounded-lg border border-border/80 bg-card shadow-2xs">
              <ChefHat className="size-8 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Nenhuma ficha técnica cadastrada</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Cadastre sub-receitas (ex: massa de pizza, molhos, chilli) e fichas de pratos com tempo de preparo e modo de fazer.
              </p>
              <Button
                size="sm"
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setIsRecipeModalOpen(true)}
              >
                <Plus className="size-4" />
                <span>Criar Nova Ficha Técnica</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(recipes as any[]).map((r: any) => (
                <div key={r.id} className="p-5 rounded-lg border border-border/80 bg-card shadow-2xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">{r.name}</h4>
                        <Badge variant="outline" className="text-3xs font-mono uppercase">
                          {r.type === "sub_recipe" ? hubTerms.subRecipeBadge : hubTerms.dishBadge}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-2xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{r.preparation_time_minutes} min</span>
                        </span>
                        <span>•</span>
                        <span>Rendimento: <strong className="font-mono text-foreground">{r.yield_quantity} {r.yield_unit}</strong></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xs text-muted-foreground block">Custo por {r.yield_unit}:</span>
                      <span className="text-sm font-bold font-mono text-foreground">
                        {formatMoney(r.cost_cents_per_yield_unit)}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Ingredientes */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/60 space-y-2 text-xs">
                    <span className="text-2xs font-bold uppercase text-muted-foreground block">Ingredientes / Composição:</span>
                    {r.recipe_items?.length > 0 ? (
                      <div className="divide-y divide-border/40">
                        {r.recipe_items.map((item: any) => (
                          <div key={item.id} className="py-1 flex items-center justify-between text-2xs">
                            <span className="text-foreground">{item.supplies?.name || "Insumo"}</span>
                            <span className="font-mono text-muted-foreground">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xs text-muted-foreground">Nenhum ingrediente vinculado.</p>
                    )}
                  </div>

                  {/* POP: Instruções */}
                  {r.prep_instructions && (
                    <div className="text-2xs text-muted-foreground border-l-2 border-primary/40 pl-3 py-1 whitespace-pre-line">
                      <strong className="text-foreground block mb-1">POP (Modo de Preparo):</strong>
                      {r.prep_instructions}
                    </div>
                  )}

                  {/* Ações */}
                  {/* Ações */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setEditingRecipeId(r.id);
                        setRecipeName(r.name || "");
                        setRecipeType(r.type || "sub_recipe");
                        setRecipeYieldQty(String(r.yield_quantity || 1));
                        setRecipeYieldUnit(r.yield_unit || "un");
                        setRecipeTimeMinutes(String(r.preparation_time_minutes || 20));
                        setRecipeInstructions(r.prep_instructions || "");
                        setRecipeChefNotes(r.chef_notes || "");
                        setRecipeShelfLifeHours(String(r.standard_shelf_life_hours || 72));
                        setRecipeStorageInstructions(r.storage_instructions || "Etiquetar e refrigerar entre 0°C e 4°C");
                        setRecipeItems(
                          Array.isArray(r.recipe_items)
                            ? r.recipe_items.map((ri: any) => ({
                                supplyId: ri.supply_id || ri.supplies?.id,
                                quantity: Number(ri.quantity || 1),
                                unit: ri.unit || ri.supplies?.unit || "un",
                                notes: ri.notes || undefined,
                              }))
                            : [],
                        );
                        setIsRecipeModalOpen(true);
                      }}
                    >
                      <span>Editar Composição</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        setSelectedRecipeForProduction(r);
                        setProductionBatches("1");
                        setIsProductionModalOpen(true);
                      }}
                    >
                      <ChefHat className="size-3.5" />
                      <span>{hubTerms.produceAction}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ABA 3: DESPERDÍCIO & PERDAS ── */}
        <TabsContent value="waste" className="space-y-4 mt-0">
          <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
            {isLoadingWaste ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Carregando registros de perdas e descarte...
              </div>
            ) : wasteData?.logs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="size-8 text-primary mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Zero registros de perdas no período</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Excelente controle operacional. Sempre que houver avaria, vencimento ou queima no preparo, registre aqui.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setIsWasteModalOpen(true)}
                >
                  <TrendingDown className="size-4" />
                  <span>Registrar Primeira Perda</span>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Data & Hora</TableHead>
                    <TableHead className="text-xs font-bold">Item Descartado</TableHead>
                    <TableHead className="text-xs font-bold">Motivo</TableHead>
                    <TableHead className="text-xs font-bold text-right">Qtd. Perdida</TableHead>
                    <TableHead className="text-xs font-bold text-right">Prejuízo Calculado</TableHead>
                    <TableHead className="text-xs font-bold">Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteData?.logs.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(log.logged_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-foreground">
                        {log.supplies?.name || log.products?.title || "Item Diverso"}
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-3xs uppercase font-mono">
                          {log.reason === "burnt"
                            ? "Queimou"
                            : log.reason === "expired"
                            ? "Vencido"
                            : log.reason === "spoiled"
                            ? "Estragou"
                            : log.reason === "dropped"
                            ? "Queda no Chão"
                            : log.reason === "prep_error"
                            ? "Erro de Montagem"
                            : log.reason}
                        </Badge>
                        {log.reason_description && (
                          <span className="text-2xs text-muted-foreground block mt-1">
                            {log.reason_description}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-right font-bold text-foreground">
                        {log.quantity} {log.unit}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-right font-bold text-destructive">
                        {formatMoney(log.cost_loss_cents)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {log.reported_by}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── ABA 4: ETIQUETAS DE VALIDADE ── */}
        <TabsContent value="labels" className="space-y-4 mt-0">
          <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
            {isLoadingLabels ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                Carregando histórico de etiquetas emitidas...
              </div>
            ) : printedLabels.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Printer className="size-8 text-muted-foreground mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Nenhuma etiqueta emitida recentemente</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Ao produzir lotes ou abrir embalagens de insumos, emita etiquetas térmicas para garantir o padrão sanitário.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Produto / Preparo</TableHead>
                    <TableHead className="text-xs font-bold">Lote</TableHead>
                    <TableHead className="text-xs font-bold">Fabricação</TableHead>
                    <TableHead className="text-xs font-bold">Validade</TableHead>
                    <TableHead className="text-xs font-bold">Conservação</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(printedLabels as any[]).map((label: any) => (
                    <TableRow key={label.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs font-bold text-foreground">{label.title}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{label.batch_code}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(label.manufactured_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-foreground">
                        {new Date(label.expires_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{label.storage_temperature}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-2xs font-semibold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            setTicketData({
                              title: label.title,
                              batchCode: label.batch_code,
                              expiresAt: label.expires_at,
                              storageTemperature: label.storage_temperature,
                              responsibleName: label.responsible_name,
                            });
                            setIsTicketModalOpen(true);
                          }}
                        >
                          <Printer className="size-3" />
                          <span>Reimprimir</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: CADASTRAR NOVO INSUMO ── */}
      <Dialog open={isSupplyModalOpen} onOpenChange={setIsSupplyModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-md">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <span>Cadastrar Novo Insumo na Despensa</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre a matéria-prima ou embalagem para compor fichas técnicas e controlar estoque.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nome do Insumo</Label>
              <Input
                placeholder="Ex: Queijo Mussarela Ralado, Farinha de Trigo"
                value={supplyName}
                onChange={(e) => setSupplyName(e.target.value)}
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Categoria</Label>
                <Select value={supplyCategory} onValueChange={(v: any) => setSupplyCategory(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="ingredient">Ingrediente</SelectItem>
                    <SelectItem value="packaging">Embalagem</SelectItem>
                    <SelectItem value="chemical">Limpeza / Químico</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Unidade de Medida</Label>
                <Select value={supplyUnit} onValueChange={(v: any) => setSupplyUnit(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="l">Litro (l)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Estoque Atual em Mãos</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={supplyStock}
                  onChange={(e) => setSupplyStock(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Alerta de Estoque Mínimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={supplyMinAlert}
                  onChange={(e) => setSupplyMinAlert(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Custo Unitário (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={supplyCost}
                  onChange={(e) => setSupplyCost(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Validade Aberto (Dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={supplyShelfLife}
                  onChange={(e) => setSupplyShelfLife(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Condição de Armazenagem</Label>
              <Input
                value={supplyStorageTemp}
                onChange={(e) => setSupplyStorageTemp(e.target.value)}
                placeholder="Ex: Refrigerado 0°C a 4°C"
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsSupplyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              disabled={createSupplyMutation.isPending}
              onClick={() => {
                const costVal = parseFloat(supplyCost.replace(",", "."));
                const costCents = isNaN(costVal) ? 0 : Math.round(costVal * 100);

                createSupplyMutation.mutate({
                  name: supplyName,
                  category: supplyCategory,
                  unit: supplyUnit,
                  stockOnHand: parseFloat(supplyStock) || 0,
                  minStockAlert: parseFloat(supplyMinAlert) || 0,
                  costCentsPerUnit: costCents,
                  standardShelfLifeDays: parseInt(supplyShelfLife) || 3,
                  storageTemperature: supplyStorageTemp,
                });
              }}
            >
              {createSupplyMutation.isPending ? "Cadastrando..." : "Cadastrar Insumo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: NOVA FICHA TÉCNICA ── */}
      <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-card rounded-lg border border-border shadow-md">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ChefHat className="size-4 text-primary" />
              <span>{editingRecipeId ? "Editar Ficha Técnica / Receita" : "Cadastrar Ficha Técnica / Receita"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a composição, rendimento e procedimento operacional padrão (POP).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-96 overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nome da Receita</Label>
              <Input
                placeholder="Ex: Chilli Especial, Massa de Pizza Artesanal, Maionese Verde"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Tipo de Receita</Label>
                <Select value={recipeType} onValueChange={(v: any) => setRecipeType(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="sub_recipe">Sub-Receita (Ingrediente Composto)</SelectItem>
                    <SelectItem value="product_dish">Prato Final do Cardápio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Tempo de Preparo (Min)</Label>
                <Input
                  type="number"
                  min="1"
                  value={recipeTimeMinutes}
                  onChange={(e) => setRecipeTimeMinutes(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Rendimento por Lote</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={recipeYieldQty}
                  onChange={(e) => setRecipeYieldQty(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Unidade do Rendimento</Label>
                <Select value={recipeYieldUnit} onValueChange={(v: any) => setRecipeYieldUnit(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="un">Unidades (Discos, Pães)</SelectItem>
                    <SelectItem value="porcoes">Porções</SelectItem>
                    <SelectItem value="kg">Quilos (kg)</SelectItem>
                    <SelectItem value="l">Litros (l)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              {/* ── Construtor de Ingredientes / Insumos da Ficha Técnica ── */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/80 space-y-3 mb-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Ingredientes / Insumos da Receita ({recipeItems.length})
                  </Label>
                  <span className="text-2xs font-mono text-muted-foreground">
                    Custo Lote:{" "}
                    <strong className="text-foreground">
                      {formatMoney(
                        recipeItems.reduce((acc, item) => {
                          const sup = (supplies as any[]).find((s: any) => s.id === item.supplyId);
                          return acc + Math.round(Number(item.quantity || 0) * Number(sup?.cost_cents_per_unit || 0));
                        }, 0),
                      )}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-7 space-y-1">
                    <span className="text-2xs text-muted-foreground block">Selecionar Insumo da Despensa</span>
                    <Select value={newIngredientSupplyId} onValueChange={setNewIngredientSupplyId}>
                      <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg">
                        <SelectValue placeholder="Escolha um insumo..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg max-h-56">
                        {(supplies as any[]).map((s: any) => (
                          <SelectItem key={`rec-sup-${s.id}`} value={s.id} className="text-xs">
                            {s.name} ({formatMoney(s.cost_cents_per_unit)}/{s.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-2xs text-muted-foreground block">Qtd Usada</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newIngredientQty}
                      onChange={(e) => setNewIngredientQty(e.target.value)}
                      className="h-11 min-h-11 text-xs rounded-lg font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-11 min-h-11 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={!newIngredientSupplyId}
                      onClick={() => {
                        const sup = (supplies as any[]).find((s: any) => s.id === newIngredientSupplyId);
                        if (!sup) return;
                        const qty = parseFloat(newIngredientQty) || 1;
                        setRecipeItems((prev) => [
                          ...prev.filter((i) => i.supplyId !== sup.id),
                          {
                            supplyId: sup.id,
                            quantity: qty,
                            unit: sup.unit || "un",
                          },
                        ]);
                        setNewIngredientSupplyId("");
                        setNewIngredientQty("1");
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {recipeItems.length > 0 ? (
                  <div className="divide-y divide-border/50 rounded-md border border-border/60 bg-card px-3 py-1">
                    {recipeItems.map((item) => {
                      const sup = (supplies as any[]).find((s: any) => s.id === item.supplyId);
                      const lineCost = Math.round(Number(item.quantity || 0) * Number(sup?.cost_cents_per_unit || 0));
                      return (
                        <div key={item.supplyId} className="py-2 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-foreground">{sup?.name || "Insumo"}</span>
                            <span className="text-2xs font-mono text-muted-foreground ml-2">
                              {item.quantity} {item.unit} ({formatMoney(lineCost)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRecipeItems((prev) => prev.filter((i) => i.supplyId !== item.supplyId))}
                            className="h-11 min-h-11 sm:h-8 sm:min-h-0 px-3 rounded text-2xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Remover
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground">
                    Adicione os insumos consumidos por lote (ex: Carne Moída, Feijão, Tempero para Chilli).
                  </p>
                )}
              </div>

              <Label className="text-xs font-semibold text-foreground">{hubTerms.popLabel}</Label>
              <textarea
                rows={3}
                value={recipeInstructions}
                onChange={(e) => setRecipeInstructions(e.target.value)}
                placeholder="1. Peneirar a farinha. 2. Bater os ovos por 5 minutos..."
                className="w-full p-3 rounded-lg border border-border/80 bg-background text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsRecipeModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              disabled={createRecipeMutation.isPending}
              onClick={() => {
                if (editingRecipeId) {
                  updateRecipeMutation.mutate({
                    recipeId: editingRecipeId,
                    name: recipeName,
                    type: recipeType,
                    yieldQuantity: parseFloat(recipeYieldQty) || 1,
                    yieldUnit: recipeYieldUnit,
                    preparationTimeMinutes: parseInt(recipeTimeMinutes) || 20,
                    prepInstructions: recipeInstructions,
                    chefNotes: recipeChefNotes,
                    standardShelfLifeHours: parseInt(recipeShelfLifeHours) || 72,
                    storageInstructions: recipeStorageInstructions,
                    items: recipeItems,
                  });
                  return;
                }
                createRecipeMutation.mutate({
                  name: recipeName,
                  type: recipeType,
                  yieldQuantity: parseFloat(recipeYieldQty) || 1,
                  yieldUnit: recipeYieldUnit,
                  preparationTimeMinutes: parseInt(recipeTimeMinutes) || 20,
                  prepInstructions: recipeInstructions,
                  chefNotes: recipeChefNotes,
                  standardShelfLifeHours: parseInt(recipeShelfLifeHours) || 72,
                  storageInstructions: recipeStorageInstructions,
                  items: recipeItems,
                });
              }}
            >
              {createRecipeMutation.isPending ? "Cadastrando..." : "Salvar Ficha Técnica"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ORDEM DE PRODUÇÃO (COZINHA) ── */}
      <Dialog open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-md">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ChefHat className="size-4 text-primary" />
              <span>Ordem de Produção: {selectedRecipeForProduction?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Abate automaticamente os ingredientes do estoque e gera etiqueta de validade sanitária.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Quantos lotes foram produzidos?</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={productionBatches}
                onChange={(e) => setProductionBatches(e.target.value)}
                className="h-10 text-xs rounded-lg font-mono"
              />
              <span className="text-2xs text-muted-foreground block mt-1">
                Rendimento previsto:{" "}
                <strong className="font-mono text-foreground">
                  {(Number(selectedRecipeForProduction?.yield_quantity || 1) * Number(productionBatches || 1)).toFixed(1)}{" "}
                  {selectedRecipeForProduction?.yield_unit}
                </strong>
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Cozinheiro / Responsável</Label>
              <Input
                value={productionChef}
                onChange={(e) => setProductionChef(e.target.value)}
                placeholder="Ex: Chef Carlos, Equipe Noite"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Observações do Lote (Opcional)</Label>
              <Input
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                placeholder="Ex: Temperatura 22°C, lote extra para final de semana"
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsProductionModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              disabled={executeProductionMutation.isPending}
              onClick={() => {
                if (!selectedRecipeForProduction) return;
                executeProductionMutation.mutate({
                  recipeId: selectedRecipeForProduction.id,
                  batchesCount: parseFloat(productionBatches) || 1,
                  producedBy: productionChef,
                  notes: productionNotes,
                });
              }}
            >
              {executeProductionMutation.isPending ? "Processando..." : "Confirmar e Imprimir Etiqueta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: REGISTRAR DESPERDÍCIO / PERDA ── */}
      <Dialog open={isWasteModalOpen} onOpenChange={setIsWasteModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-md">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <TrendingDown className="size-4 text-destructive" />
              <span>Registrar Perda / Desperdício</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Abate a quantidade do estoque e registra a perda financeira no relatório gerencial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Qual insumo foi descartado?</Label>
              <Select value={wasteSupplyId} onValueChange={setWasteSupplyId}>
                <SelectTrigger className="h-10 text-xs rounded-lg">
                  <SelectValue placeholder="Selecione o insumo..." />
                </SelectTrigger>
                <SelectContent className="rounded-lg max-h-60">
                  {(supplies as any[]).map((s: any) => (
                    <SelectItem key={`waste-${s.id}`} value={s.id} className="text-xs">
                      {s.name} (Saldo: {s.stock_on_hand} {s.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Quantidade Descartada</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Motivo do Descarte</Label>
                <Select value={wasteReason} onValueChange={(v: any) => setWasteReason(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="spoiled">Estragou / Azêdo</SelectItem>
                    <SelectItem value="burnt">Queimou no Fogo / Forno</SelectItem>
                    <SelectItem value="expired">Prazo de Validade Venceu</SelectItem>
                    <SelectItem value="dropped">Caiu no Chão / Contaminação</SelectItem>
                    <SelectItem value="prep_error">Erro no Preparo / Montagem</SelectItem>
                    <SelectItem value="other">Outro Motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Detalhes do Ocorrido</Label>
              <Input
                placeholder="Ex: Forno desregulou durante o pico, queijo azedou por falha na geladeira"
                value={wasteReasonDesc}
                onChange={(e) => setWasteReasonDesc(e.target.value)}
                className="h-10 text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsWasteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              disabled={registerWasteMutation.isPending || !wasteSupplyId}
              onClick={() => {
                registerWasteMutation.mutate({
                  supplyId: wasteSupplyId,
                  quantity: parseFloat(wasteQty) || 1,
                  reason: wasteReason,
                  reasonDescription: wasteReasonDesc,
                  reportedBy: wasteOperator,
                });
              }}
            >
              {registerWasteMutation.isPending ? "Registrando..." : "Registrar Descarte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ENTRADA DE COMPRAS DE INSUMO ── */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-md">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <span>Entrada de Compras: {selectedSupplyForPurchase?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Entrada de mercadorias no estoque com recálculo automático do custo médio ponderado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Quantidade Recebida ({selectedSupplyForPurchase?.unit})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Valor Total Pago (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={purchaseTotalCost}
                  onChange={(e) => setPurchaseTotalCost(e.target.value)}
                  className="h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/70 space-y-2 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Fator de Conversão da Embalagem (ex: Caixa c/ 12 = 12, Saco 25kg = 25000g)
                  </Label>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={purchaseConversionFactor}
                  onChange={(e) => setPurchaseConversionFactor(e.target.value)}
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
                <p className="text-2xs text-muted-foreground font-mono">
                  Entrada líquida no Kardex:{" "}
                  <strong className="text-foreground">
                    +{((parseFloat(purchaseQty) || 0) * (parseFloat(purchaseConversionFactor) || 1)).toFixed(2)}{" "}
                    {selectedSupplyForPurchase?.unit}
                  </strong>
                </p>
              </div>
              <Label className="text-xs font-semibold text-foreground">Número da Nota Fiscal (NF)</Label>
              <Input
                placeholder="Ex: NF-10492"
                value={purchaseInvoice}
                onChange={(e) => setPurchaseInvoice(e.target.value)}
                className="h-10 text-xs rounded-lg font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setIsPurchaseModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              disabled={purchaseEntryMutation.isPending}
              onClick={() => {
                if (!selectedSupplyForPurchase) return;
                const costVal = parseFloat(purchaseTotalCost.replace(",", "."));
                const totalCents = isNaN(costVal) ? 0 : Math.round(costVal * 100);

                purchaseEntryMutation.mutate({
                  supplyId: selectedSupplyForPurchase.id,
                  quantity: parseFloat(purchaseQty) || 1,
                  conversionFactor: parseFloat(purchaseConversionFactor) || 1,
                  totalCostCents: totalCents,
                  invoiceNumber: purchaseInvoice,
                });
              }}
            >
              {purchaseEntryMutation.isPending ? "Processando..." : "Confirmar Entrada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: ETIQUETA TÉRMICA ── */}
      {ticketData && (
        <ThermalExpirationTicketModal
          open={isTicketModalOpen}
          onOpenChange={setIsTicketModalOpen}
          title={ticketData.title}
          batchCode={ticketData.batchCode}
          expiresAt={ticketData.expiresAt}
          storageTemperature={ticketData.storageTemperature}
          responsibleName={ticketData.responsibleName}
          storeName={storeName}
          nicheId={nicheId}
        />
      )}
    </div>
  );
}
