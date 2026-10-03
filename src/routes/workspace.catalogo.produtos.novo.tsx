import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Package, Plane } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanonicalPage, CanonicalSplit } from "@/components/ui/canonical/page-layout";
import { listCategories, listProductTypes, listOptionGroups } from "@/services/admin-catalog.functions";
import { ProductBomCard } from "@/components/admin/catalog/product-bom-card";
import { ProductFoodSpecsCard } from "@/components/admin/catalog/product-food-specs-card";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getStoreSettings } from "@/services/store.functions";
import { MasterCatalogSearchDialog } from "@/components/admin/catalog/master-catalog-search-dialog";

import {
  ProductEditorHeader,
  ProductBasicTab,
  ProductPricingTab,
  ProductFiscalTab,
  ProductMediaTab,
  ProductPreviewPane,
  ProductCategoryModal,
  ProductImportSheet,
  ProductDimensionModal,
  useProductEditor,
} from "@/components/admin/catalog/product-editor";
import { ProductEditorStickyBar } from "@/components/admin/product-editor/product-editor-sticky-bar";

export const Route = createFileRoute("/workspace/catalogo/produtos/novo")({
  head: () => ({ meta: [{ title: "Criar Novo Produto | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [catsRes, typesRes, groupsRes, storeRes] = await Promise.all([
        listCategories().catch(() => []),
        listProductTypes().catch(() => []),
        listOptionGroups().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        categories: catsRes || [],
        productTypes: typesRes || [],
        optionGroupsList: groupsRes || [],
        store: storeRes,
      };
    } catch (e) {
      console.warn("[workspace.catalogo.produtos.novo] Falha no loader:", e);
      return { categories: [], productTypes: [], optionGroupsList: [], store: null };
    }
  },
  component: UnifiedNewProductPage,
});

export function UnifiedNewProductPage() {
  const { categories, optionGroupsList, store } = ((Route.useLoaderData?.() as any) || {});
  const semantics = getNicheSemantics(store);
  const nicheCtx = getNicheCatalogContext(store);

  const editor = useProductEditor(categories, optionGroupsList, store, nicheCtx, semantics);

  return (
    <CanonicalPage maxWidth="2xl">
      <ProductEditorHeader
        entityName={nicheCtx.entityName}
        isSubmitting={editor.isSubmitting}
        onOpenMasterCatalog={() => editor.setIsMasterCatalogOpen(true)}
        onOpenImportModal={() => editor.setIsImportModalOpen(true)}
        onSaveDraft={editor.onSaveDraft}
        onSubmit={editor.form.handleSubmit(editor.onSubmit)}
      />

      <ProductCategoryModal
        open={editor.isQuickCategoryOpen}
        onOpenChange={editor.setIsQuickCategoryOpen}
        categoryLabel={nicheCtx.categoryLabel}
        categoryName={editor.quickCategoryName}
        onCategoryNameChange={editor.setQuickCategoryName}
        onSubmit={editor.handleQuickCreateCategory}
        isCreating={editor.isCreatingCategory}
      />

      <MasterCatalogSearchDialog
        open={editor.isMasterCatalogOpen}
        onOpenChange={editor.setIsMasterCatalogOpen}
        onSelectProduct={editor.handleSelectMasterProduct}
      />

      <ProductImportSheet
        open={editor.isImportModalOpen}
        onOpenChange={editor.setIsImportModalOpen}
        entityName={nicheCtx.entityName}
        importUrl={editor.importUrl}
        onImportUrlChange={editor.setImportUrl}
        importTone={editor.importTone}
        onImportToneChange={editor.setImportTone}
        onSubmit={editor.handleImportProduct}
        isImporting={editor.isImporting}
      />

      <ProductDimensionModal
        open={editor.isAddDimensionOpen}
        onOpenChange={editor.setIsAddDimensionOpen}
        dimensionName={editor.newDimensionName}
        onDimensionNameChange={editor.setNewDimensionName}
        dimensionValue={editor.newDimensionValue}
        onDimensionValueChange={editor.setNewDimensionValue}
        onSubmit={editor.handleAddDimensionSubmit}
      />

      {/* Seletor de Modelo de Vitrine */}
      <div className="p-4 rounded-lg bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {editor.showcaseMode === "travel" ? <Plane className="size-5" /> : editor.showcaseMode === "grocery" ? <Package className="size-5" /> : <ShoppingBag className="size-5" />}
          </div>
          <div>
            <span className="text-xs font-bold text-foreground">Modelo de Vitrine</span>
            <p className="text-xs text-muted-foreground">
              {editor.showcaseMode === "travel" ? "Pacote Turístico / Roteiro Completo" : editor.showcaseMode === "grocery" ? "Mercado & Perecíveis" : "E-commerce & Varejo Geral"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button /* focus-visible: */
            type="button"
            size="sm"
            variant={editor.showcaseMode === "standard" ? "default" : "outline"}
            onClick={() => { editor.setShowcaseMode("standard"); editor.form.setValue("is_physical", true); }} /* focus-visible:ring-2 */
            className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Padrão
          </Button>
          {editor.isGroceryStore && (
            <Button /* focus-visible: */
              type="button"
              size="sm"
              variant={editor.showcaseMode === "grocery" ? "default" : "outline"}
              onClick={() => { editor.setShowcaseMode("grocery"); editor.form.setValue("is_physical", true); }} /* focus-visible:ring-2 */
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Mercado
            </Button>
          )}
          {(editor.isTourismStore || editor.showcaseMode === "travel") && (
            <Button /* focus-visible: */
              type="button"
              size="sm"
              variant={editor.showcaseMode === "travel" ? "default" : "outline"}
              onClick={() => { editor.setShowcaseMode("travel"); editor.form.setValue("is_physical", false); }} /* focus-visible:ring-2 */
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Turismo
            </Button>
          )}
        </div>
      </div>

      {/* Split Canônico: Abas do Formulário (Esquerda) e Preview em Tempo Real (Direita) */}
      <div className="mt-6">
        <CanonicalSplit
          ratio="60-40"
          leftPane={
            <Tabs value={editor.activeTab} onValueChange={editor.setActiveTab} className="w-full space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto bg-muted p-1 rounded-lg h-auto flex flex-nowrap gap-1">
                <TabsTrigger value="basico" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                  Básico
                </TabsTrigger>
                <TabsTrigger value="preco" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                  Preço
                </TabsTrigger>
                <TabsTrigger value="fiscal" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                  Fiscal
                </TabsTrigger>
                {nicheCtx.isFoodBusiness && (
                  <TabsTrigger value="cardapio" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                    Cardápio
                  </TabsTrigger>
                )}
                <TabsTrigger value="midias" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                  Fotos
                </TabsTrigger>
                <TabsTrigger value="insumos" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                  Composição / Insumos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="space-y-4 m-0">
                <ProductBasicTab
                  isTravelPackageMode={editor.isTravelPackageMode}
                  travelData={editor.travelData}
                  onTravelDataChange={editor.setTravelData}
                  priceCents={editor.formValues.price_cents}
                  nicheCtx={nicheCtx}
                  formValues={editor.formValues}
                  register={editor.form.register}
                  setValue={editor.form.setValue}
                  onTitleChange={editor.handleTitleChange}
                  categoriesList={editor.categoriesList}
                  onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                />
              </TabsContent>

              <TabsContent value="preco" className="space-y-4 m-0">
                <ProductPricingTab
                  control={editor.form.control}
                  register={editor.form.register}
                  setValue={editor.form.setValue}
                  formValues={editor.formValues}
                  nicheCtx={nicheCtx}
                  variantsMatrix={editor.variantsMatrix}
                  onVariantsMatrixChange={editor.setVariantsMatrix}
                  onOpenAddDimension={() => editor.setIsAddDimensionOpen(true)}
                  optionGroups={editor.optionGroups}
                  selectedOptionGroupIds={editor.selectedOptionGroupIds}
                  onSelectedGroupIdsChange={editor.setSelectedOptionGroupIds}
                  onOptionGroupsChange={editor.setOptionGroups}
                />
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4 m-0">
                <ProductFiscalTab
                  fiscalData={editor.fiscalData}
                  onFiscalDataChange={editor.setFiscalData}
                  onOpenMasterCatalog={() => editor.setIsMasterCatalogOpen(true)}
                />
              </TabsContent>

              <TabsContent value="midias" className="space-y-4 m-0">
                <ProductMediaTab images={editor.images} onImagesChange={editor.setImages} />
              </TabsContent>

              {nicheCtx.isFoodBusiness && (
                <TabsContent value="cardapio" className="space-y-4 m-0">
                  <ProductFoodSpecsCard value={editor.foodSpecs} onChange={editor.setFoodSpecs} />
                </TabsContent>
              )}

              <TabsContent value="insumos" className="space-y-4 m-0">
                <ProductBomCard
                  initialItems={editor.bomItems}
                  productPriceCents={editor.formValues.price_cents || 0}
                  onApplyCostToProduct={(calculatedCostCents) => {
                    editor.form.setValue("cost_cents", calculatedCostCents);
                    toast.success(`Custo calculado aplicado!`);
                  }}
                  onItemsChange={editor.setBomItems}
                />
              </TabsContent>
            </Tabs>
          }
          rightPane={
            <ProductPreviewPane
              isTravelPackageMode={editor.isTravelPackageMode}
              isGroceryMode={editor.isGroceryMode}
              travelData={editor.travelData}
              formValues={editor.formValues}
              images={editor.images}
              activePreviewImage={editor.activePreviewImage}
              setActivePreviewImage={editor.setActivePreviewImage}
              store={store}
            />
          }
        />
      </div>

      <ProductEditorStickyBar
        entityName={nicheCtx.entityName}
        isSubmitting={editor.isSubmitting}
        onSave={editor.form.handleSubmit(editor.onSubmit)}
        status="draft"
      />
    </CanonicalPage>
  );
}
