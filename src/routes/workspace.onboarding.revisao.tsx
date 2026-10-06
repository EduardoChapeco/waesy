import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Package, CheckCircle2, Camera, Layers, Barcode, Table, Plus, Trash2, ArrowRight, ShieldCheck, Search, ExternalLink, Loader2, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchMasterCatalog, importMasterCatalogProduct, importProductsTraditional, approveOnboardingProducts, getOnboardingSession } from "@/services/multimodal-onboarding.functions";
import type { GlobalMasterCatalogItemDTO } from "@/types/squads-and-onboarding";

export const Route = createFileRoute("/workspace/onboarding/revisao")({
  head: () => ({
    meta: [
      {
        title: "Revisão de Onboarding Multimodal e Master Catalog | Waesy",
      },
    ],
  }),
  component: OnboardingReviewPage,
});

interface ExtractedItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  dietary_tags: string[];
}

export function OnboardingReviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"multimodal" | "master_catalog" | "traditional">("multimodal");

  // Estado Multimodal (dados reais obtidos da sessão de visão)
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const [isApproving, setIsApproving] = useState(false);

  // Estado Master Catalog (Bipagem & Busca)
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<GlobalMasterCatalogItemDTO[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Estado Tradicional Manual
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("Geral");
  const [manualPrice, setManualPrice] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    const querySessionId = new URLSearchParams(window.location.search).get("session_id");
    if (querySessionId && querySessionId !== sessionId) {
      setSessionId(querySessionId);
      void loadOnboardingSession(querySessionId);
    }
    if (activeTab === "master_catalog") {
      loadMasterCatalogItems();
    }
  }, [activeTab]);

  async function loadOnboardingSession(id: string) {
    setIsLoadingSession(true);
    try {
      const session = await getOnboardingSession({ data: { session_id: id } });
      setSessionStatus(session.status);
      const extracted = Array.isArray(session.extracted_products) ? session.extracted_products : [];
      setItems(extracted.map((item: any, index: number) => ({
        id: String(item.temp_id || item.id || `extracted-${index}`),
        name: String(item.name || ""),
        category: String(item.category || "Geral"),
        description: String(item.description || ""),
        price_cents: Number.isFinite(Number(item.price_cents)) ? Number(item.price_cents) : 0,
        compare_at_cents: item.compare_at_cents == null ? null : Number(item.compare_at_cents),
        dietary_tags: Array.isArray(item.dietary_tags) ? item.dietary_tags : [],
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a sessão de onboarding.");
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function loadMasterCatalogItems(query = "", barcode = "") {
    setIsSearchingCatalog(true);
    try {
      const results = await searchMasterCatalog({
        data: {
          query: query || undefined,
          barcode: barcode || undefined,
          limit: 24,
        },
      });
      setCatalogItems(results as GlobalMasterCatalogItemDTO[]);
    } catch {
      toast.error("Erro ao consultar Catálogo Mestre.");
    } finally {
      setIsSearchingCatalog(false);
    }
  }

  const handleUpdateItem = (id: string, field: keyof ExtractedItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.success("Item removido da lista.");
  };

  const handleApproveAll = async () => {
    if (items.length === 0) {
      toast.error("Nenhum produto para aprovar.");
      return;
    }
    setIsApproving(true);
    try {
      await approveOnboardingProducts({
        data: {
          session_id: sessionId || undefined,
          approved_products: items.map((it) => ({
            name: it.name,
            category: it.category,
            description: it.description,
            price_cents: it.price_cents,
            compare_at_cents: it.compare_at_cents,
            dietary_tags: it.dietary_tags,
          })),
        },
      });

      toast.success(`${items.length} produtos aprovados e cadastrados com sucesso!`);
      navigate({ to: "/workspace/catalogo/produtos/novo" as any });
    } catch {
      toast.error("Erro ao aprovar produtos.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleImportSku = async (sku: GlobalMasterCatalogItemDTO) => {
    setImportingId(sku.id);
    try {
      await importMasterCatalogProduct({
        data: {
          catalog_id: sku.id,
        },
      });
      toast.success(`"${sku.name}" adicionado à sua loja em 1 clique!`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar produto.");
    } finally {
      setImportingId(null);
    }
  };

  const handleAddManualProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPrice) {
      toast.error("Nome e preço são obrigatórios.");
      return;
    }
    setIsSavingManual(true);
    try {
      const priceCents = Math.round(parseFloat(manualPrice.replace(",", ".")) * 100);
      await importProductsTraditional({
        data: {
          products: [
            {
              title: manualName.trim(),
              category: manualCategory,
              description: manualDescription,
              price_cents: priceCents,
            },
          ],
        },
      });
      toast.success("Produto cadastrado manualmente com sucesso!");
      setManualName("");
      setManualPrice("");
      setManualDescription("");
    } catch {
      toast.error("Erro no cadastro manual.");
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-full bg-background text-foreground pb-20">
      {/* TopBar Operacional */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            <Cpu className="size-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              Onboarding e Ingestão de Catálogo
            </h1>
            <p className="text-xs text-muted-foreground">
              OCR Multimodal · Master SKU Catalog · Modo Tradicional 100% Opcional
            </p>
          </div>
        </div>

        {/* Abas Superiores sem scrollbar visível */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-muted/40 p-1 rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("multimodal")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9 flex items-center gap-2 ${
              activeTab === "multimodal"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="size-3.5" />
            <span>Revisão Multimodal</span>
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              {items.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("master_catalog")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9 flex items-center gap-2 ${
              activeTab === "master_catalog"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Barcode className="size-3.5" />
            <span>Master Catalog (500 SKUs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("traditional")}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9 flex items-center gap-2 ${
              activeTab === "traditional"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table className="size-3.5" />
            <span>Modo Tradicional (Sem IA)</span>
          </button>
        </nav>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-4 md:px-0 py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
        {/* ABA 1: REVISÃO MULTIMODAL HUMAN-IN-THE-LOOP */}
        {activeTab === "multimodal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Imagem Original do Cardápio */}
            <section className="lg:col-span-5 space-y-4">
              <div className="rounded-lg bg-card border border-border/80 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Cardápio Capturado (OCR Visual)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Gemini 2.5 Flash
                  </Badge>
                </div>
                <div className="relative aspect-[3/4] bg-muted/30 flex flex-col items-center justify-center p-6 text-center border border-border/40 rounded-lg overflow-hidden">
                  <Camera className="size-12 text-muted-foreground/40 mb-3" />
                  <p className="text-xs font-bold text-foreground">Documento Processado via OCR</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLoadingSession ? "Carregando sessão persistida…" : sessionStatus ? `Status: ${sessionStatus}` : "Nenhuma sessão vinculada"}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent p-4">
                    <p className="text-xs text-foreground font-medium">Fonte persistida da sessão</p>
                    <p className="text-xs text-muted-foreground">Apenas dados retornados pelo processamento são exibidos.</p>
                  </div>
                </div>
              </div>

              {/* Card Resumo do Niche Detector */}
              <div className="rounded-lg bg-card border border-border/80 p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>Diagnóstico do The Visual Parser</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sessionStatus ? "O diagnóstico será exibido quando existir na sessão persistida." : "Abra esta tela com uma sessão de onboarding para carregar o diagnóstico real."}
                </p>
              </div>
            </section>

            {/* Coluna Direita: Tabela de Itens Extraídos Lado a Lado */}
            <section className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Itens Extraídos (Human-in-the-Loop)</h2>
                  <p className="text-xs text-muted-foreground">Edite os campos diretamente antes de publicar na loja</p>
                </div>
                <Button
                  onClick={handleApproveAll}
                  disabled={isApproving || items.length === 0}
                  className="h-11 rounded-lg px-5 font-semibold text-xs bg-foreground text-background hover:opacity-90 transition-opacity gap-2"
                >
                  {isApproving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  <span>Aprovar Todos ({items.length})</span>
                </Button>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 p-8 text-center space-y-2 bg-card/40">
                    <Package className="size-8 mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">Nenhum item pendente de revisão</p>
                    <p className="text-xs text-muted-foreground">Envie fotos na etapa multimodal ou utilize o catálogo mestre ao lado para adicionar produtos.</p>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-card border border-border/80 p-4 space-y-3 shadow-xs transition-colors hover:border-foreground/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Nome do Prato/Produto</label>
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                            className="h-9 rounded-lg text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
                          <Input
                            value={(item.price_cents / 100).toFixed(2).replace(".", ",")}
                            onChange={(e) => {
                              const val = Math.round(parseFloat(e.target.value.replace(",", ".") || "0") * 100);
                              handleUpdateItem(item.id, "price_cents", val);
                            }}
                            className="h-9 rounded-lg text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Descrição e Ingredientes</label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                          className="h-9 rounded-lg text-xs text-muted-foreground"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* ABA 2: MASTER CATALOG GLOBAL (500 SKUs COM EAN E FOTOS) */}
        {activeTab === "master_catalog" && (
          <div className="space-y-6">
            <div className="rounded-lg bg-card border border-border/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Barcode className="size-4" />
                    <span>Catálogo Mestre Centralizado (SKU Hub)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Mais de 500 produtos populares com fotos WebP, EAN-13 oficial e tributação NCM/CEST pronta
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou marca..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        loadMasterCatalogItems(e.target.value, barcodeQuery);
                      }}
                      className="h-10 pl-9 rounded-lg text-xs"
                    />
                  </div>
                  <div className="relative w-40">
                    <Barcode className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Bipar EAN..."
                      value={barcodeQuery}
                      onChange={(e) => {
                        setBarcodeQuery(e.target.value);
                        loadMasterCatalogItems(searchQuery, e.target.value);
                      }}
                      className="h-10 pl-9 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de SKUs Populares */}
            {isSearchingCatalog ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">Consultando catálogo global...</span>
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <p className="text-sm font-medium">Nenhum produto localizado para os filtros informados.</p>
                <p className="text-xs">Tente buscar por "Coca-Cola", "Heineken", "Nestlé" ou "Doritos".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {catalogItems.map((sku) => (
                  <div
                    key={sku.id}
                    className="rounded-lg bg-card border border-border/80 p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-foreground/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="aspect-square rounded-lg bg-muted/20 overflow-hidden flex items-center justify-center p-2">
                        {sku.image_urls?.[0] ? (
                          <img
                            src={sku.image_urls[0]}
                            alt={sku.name}
                            className="size-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-muted/40 rounded-lg text-muted-foreground">
                            <Package className="size-6 text-muted-foreground/60" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          {sku.category}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">{sku.barcode_ean}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-foreground line-clamp-2">{sku.name}</h3>
                      <p className="text-xs text-muted-foreground">Marca: {sku.brand_name} · NCM: {sku.ncm_code}</p>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        R$ {((sku.suggested_price_cents || 0) / 100).toFixed(2).replace(".", ",")}
                      </span>
                      <Button
                        size="sm"
                        disabled={importingId === sku.id}
                        onClick={() => handleImportSku(sku)}
                        className="h-8 rounded-lg text-xs font-medium px-3 bg-foreground text-background hover:opacity-90 gap-2"
                      >
                        {importingId === sku.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Plus className="size-3" />
                        )}
                        <span>Adicionar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: MODO TRADICIONAL MANUAL (IA 100% OPCIONAL) */}
        {activeTab === "traditional" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="rounded-lg bg-card border border-border/80 p-6 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Table className="size-4 text-muted-foreground" />
                  <span>Cadastro Manual Passo a Passo (Sem IA)</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Garantia de autonomia: preencha os dados no formulário tradicional ou importe por planilha CSV.
                </p>
              </div>

              <form onSubmit={handleAddManualProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Nome do Produto *</label>
                  <Input
                    placeholder="Ex: Suco Natural de Laranja 500ml"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Categoria</label>
                    <Input
                      placeholder="Ex: Bebidas"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Preço de Venda (R$) *</label>
                    <Input
                      placeholder="Ex: 12,50"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="h-11 rounded-lg text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Descrição do Produto</label>
                  <Input
                    placeholder="Ex: Suco 100% fruta espremido na hora sem adição de açúcar."
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="h-11 rounded-lg text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSavingManual}
                  className="w-full h-11 rounded-lg font-semibold text-xs bg-foreground text-background hover:opacity-90 gap-2"
                >
                  {isSavingManual ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  <span>Cadastrar Produto Manualmente</span>
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
