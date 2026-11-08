import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Package, Plane, Maximize2, Minimize2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanonicalPage, CanonicalSplit } from "@/components/ui/canonical/page-layout";
import { listCategories, listProductTypes, listOptionGroups, listStoreBrands, getStoreChannelIntegrationsStatus } from "@/services/admin-catalog.functions";
import { ProductBomCard } from "@/components/admin/catalog/product-bom-card";
import { ProductFoodSpecsCard } from "@/components/admin/catalog/product-food-specs-card";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getClientActiveTenant } from "@/lib/context-auth";
import { getStoreSettings } from "@/services/store.functions";
import { MasterCatalogSearchDialog } from "@/components/admin/catalog/master-catalog-search-dialog";
import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";

import {
  ProductEditorHeader,
  ProductBasicTab,
  ProductPricingTab,
  ProductFiscalTab,
  ProductMediaTab,
  ProductPreviewPane,
  ProductCategoryModal,
  ProductBrandModal,
  ProductImportSheet,
  ProductDimensionModal,
  ProductSpecsTab,
  useProductEditor,
} from "@/components/admin/catalog/product-editor";
import { ProductEditorStickyBar } from "@/components/admin/product-editor/product-editor-sticky-bar";

export const Route = createFileRoute("/workspace/catalogo/produtos/novo")({
  head: () => ({ meta: [{ title: "Criar Novo Produto | Workspace Waesy" }] }),
  loader: async ({ context }) => {
    try {
      const sessionStoreId = (context as any)?.session?.store_id;
      const [catsRes, typesRes, groupsRes, storeRes, brandsRes] = await Promise.all([
        listCategories(sessionStoreId ? { data: { store_id: sessionStoreId } } : undefined).catch(() => []),
        listProductTypes().catch(() => []),
        listOptionGroups().catch(() => []),
        getStoreSettings(sessionStoreId ? { data: { store_id: sessionStoreId } } : undefined).catch(() => null),
        listStoreBrands().catch(() => []),
      ]);
      return {
        categories: catsRes || [],
        productTypes: typesRes || [],
        optionGroupsList: groupsRes || [],
        store: storeRes,
        brands: brandsRes || [],
      };
    } catch (e) {
      console.warn("[workspace.catalogo.produtos.novo] Falha no loader:", e);
      return { categories: [], productTypes: [], optionGroupsList: [], store: null, brands: [] };
    }
  },
  component: UnifiedNewProductPage,
});

export function UnifiedNewProductPage() {
  const { categories, productTypes = [], optionGroupsList, store: loaderStore, brands = [] } = ((Route.useLoaderData?.() as any) || {});
  const clientTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
  const store = loaderStore || (clientTenant ? { id: clientTenant, name: "Minha Empresa" } : null);
  const semantics = getNicheSemantics(store);
  const nicheCtx = getNicheCatalogContext(store);

  const editor = useProductEditor(categories, optionGroupsList, store, nicheCtx, semantics, brands);
  const [isWideMode, setIsWideMode] = useState(false);
  const selectedProductType = (productTypes || []).find(
    (pt: any) => pt.id === editor.formValues.type_id
  ) || null;

  return (
    <CanonicalPage maxWidth={isWideMode ? "full" : "2xl"}>
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
        nicheId={semantics?.nicheId}
        placeholder={nicheCtx.categoryPlaceholder}
        description={nicheCtx.categoryDesc}
      />

      <ProductBrandModal
        open={editor.isQuickBrandOpen}
        onOpenChange={editor.setIsQuickBrandOpen}
        brandLabel={nicheCtx.brandLabel}
        brandName={editor.quickBrandName}
        onBrandNameChange={editor.setQuickBrandName}
        onSubmit={editor.handleQuickCreateBrand}
        isCreating={editor.isCreatingBrand}
        nicheId={semantics?.nicheId}
        placeholder={nicheCtx.brandPlaceholder}
        description={nicheCtx.brandDesc}
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
            {editor.showcaseMode === "travel" ? (
              <Plane className="size-5" />
            ) : editor.showcaseMode === "grocery" ? (
              <Package className="size-5" />
            ) : editor.showcaseMode === "restaurant" ? (
              <UtensilsCrossed className="size-5" />
            ) : (
              <ShoppingBag className="size-5" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-foreground">Modelo de Vitrine</span>
            <p className="text-xs text-muted-foreground">
              {editor.showcaseMode === "travel"
                ? "Pacote Turístico / Roteiro Completo"
                : editor.showcaseMode === "grocery"
                ? "Mercado & Perecíveis"
                : editor.showcaseMode === "restaurant"
                ? "Gastronomia & Delivery de Cardápio"
                : "E-commerce & Varejo Geral"}
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
          {(editor.isGastronomyStore || editor.showcaseMode === "restaurant") && (
            <Button /* focus-visible: */
              type="button"
              size="sm"
              variant={editor.showcaseMode === "restaurant" ? "default" : "outline"}
              onClick={() => { editor.setShowcaseMode("restaurant"); editor.form.setValue("is_physical", true); }} /* focus-visible:ring-2 */
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Cardápio
            </Button>
          )}
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

      {/* Split Canônico: Abas do Formulário (Esquerda) e Preview em Tempo Real (Direita) com Modo Amplo */}
      <div className="mt-6">
        {(() => {
          const tabsContent = (
            <Tabs value={editor.activeTab} onValueChange={editor.setActiveTab} className="w-full space-y-4">
              <div className="flex items-center justify-between gap-2 overflow-x-auto scroll-area-carousel pb-1">
                <TabsList className="justify-start overflow-x-auto bg-muted p-1 rounded-lg h-auto flex flex-nowrap gap-1">
                  {editor.isTravelPackageMode ? (
                    <>
                      <TabsTrigger value="roteiro" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Roteiro & Destino
                      </TabsTrigger>
                      <TabsTrigger value="hospedagem" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Hospedagem
                      </TabsTrigger>
                      <TabsTrigger value="transporte" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Transporte & Saídas
                      </TabsTrigger>
                      <TabsTrigger value="tarifas" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Tarifas & Quartos
                      </TabsTrigger>
                      <TabsTrigger value="inclusoes" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Inclusões & Regras
                      </TabsTrigger>
                      <TabsTrigger value="midias" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Fotos
                      </TabsTrigger>
                      <TabsTrigger value="comercial" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Comercial & SEO
                      </TabsTrigger>
                      <TabsTrigger value="reserva" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Reserva & IA
                      </TabsTrigger>
                    </>
                  ) : (nicheCtx.isFoodBusiness || editor.isRestaurantMode) ? (
                    <>
                      <TabsTrigger value="basico" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Básico & Preparo
                      </TabsTrigger>
                      <TabsTrigger value="preco" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Preço & Complementos
                      </TabsTrigger>
                      <TabsTrigger value="midias" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Fotos
                      </TabsTrigger>
                      <TabsTrigger value="insumos" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Insumos / Receita (BOM)
                      </TabsTrigger>
                      <TabsTrigger value="fiscal" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Fiscal
                      </TabsTrigger>
                    </>
                  ) : (
                    <>
                      <TabsTrigger value="basico" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Básico
                      </TabsTrigger>
                      <TabsTrigger value="especificacoes" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Especificações
                      </TabsTrigger>
                      <TabsTrigger value="preco" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Preço & Grade 2D
                      </TabsTrigger>
                      <TabsTrigger value="fiscal" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Fiscal
                      </TabsTrigger>
                      <TabsTrigger value="midias" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                        Fotos
                      </TabsTrigger>
                      {true && (
                        <TabsTrigger value="insumos" className="rounded-md text-xs font-bold whitespace-nowrap shrink-0 px-3 h-9">
                          Insumos
                        </TabsTrigger>
                      )}
                    </>
                  )}
                </TabsList>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWideMode((prev) => !prev)}
                  className="h-9 px-3 text-xs font-semibold gap-2 text-primary hover:bg-primary/10 rounded-lg focus-visible:ring-2 focus-visible:ring-ring shrink-0 cursor-pointer min-h-11 sm:min-h-0"
                  title={isWideMode ? "Restaurar layout dividido com preview" : "Expandir para tela cheia (Modo Amplo focado na grade)"}
                >
                  {isWideMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                  <span className="hidden sm:inline">{isWideMode ? "Modo Dividido" : "Modo Amplo"}</span>
                </Button>
              </div>

              {editor.isTravelPackageMode ? (
                <>
                  <TabsContent value="roteiro" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="roteiro"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>

                  <TabsContent value="hospedagem" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="hospedagem"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>

                  <TabsContent value="transporte" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="transporte"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>

                  <TabsContent value="tarifas" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="tarifas"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>

                  <TabsContent value="inclusoes" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="inclusoes"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>

                  <TabsContent value="midias" className="space-y-4 m-0">
                    <ProductMediaTab
                      images={editor.images}
                      onImagesChange={editor.setImages}
                      variants={editor.variantsMatrix}
                    />
                  </TabsContent>

                  <TabsContent value="comercial" className="space-y-4 m-0">
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
                      isTravelPackageMode={true}
                      store={store}
                    />
                  </TabsContent>

                  <TabsContent value="reserva" className="space-y-4 m-0">
                    <TravelPackageForm
                      value={editor.travelData}
                      onChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents || 0}
                      activeSection="reserva"
                      formValues={editor.formValues}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      onPriceChange={(cents) => editor.form.setValue("price_cents", cents)}
                      storeName={store?.name}
                      storePhone={store?.phone || store?.settings?.whatsapp}
                    />
                  </TabsContent>
                </>
              ) : (
                <>
                  <TabsContent value="basico" className="space-y-4 m-0">
                    <ProductBasicTab
                      isTravelPackageMode={false}
                      travelData={editor.travelData}
                      onTravelDataChange={editor.setTravelData}
                      priceCents={editor.formValues.price_cents}
                      nicheCtx={nicheCtx}
                      formValues={editor.formValues}
                      register={editor.form.register}
                      setValue={editor.form.setValue}
                      onTitleChange={editor.handleTitleChange}
                      categoriesList={editor.categoriesList}
                      productTypes={productTypes}
                      logistics={editor.logisticsData}
                      onLogisticsChange={editor.setLogisticsData}
                      onOpenQuickCategory={() => editor.setIsQuickCategoryOpen(true)}
                      brandsList={editor.brandsList}
                      onOpenQuickBrand={() => editor.setIsQuickBrandOpen(true)}
                      foodSpecs={editor.foodSpecs}
                      onFoodSpecsChange={editor.setFoodSpecs}
                      foodItemConcept={editor.foodItemConcept}
                      onFoodItemConceptChange={editor.setFoodItemConcept}
                    />
                  </TabsContent>

                  {!nicheCtx.isFoodBusiness && !editor.isRestaurantMode && (
                    <TabsContent value="especificacoes" className="space-y-4 m-0">
                      <ProductSpecsTab
                        attributes={editor.nicheAttributes}
                        onChange={editor.setNicheAttributes}
                        nicheContext={nicheCtx}
                        nicheId={semantics.nicheId}
                        selectedProductType={selectedProductType}
                        synchronizedLogistics={{
                          weightKg: editor.formValues.weight_kg,
                          lengthCm: editor.formValues.length_cm,
                          widthCm: editor.formValues.width_cm,
                          heightCm: editor.formValues.height_cm,
                          isPhysical: editor.formValues.is_physical !== false,
                          logistics: editor.logisticsData,
                          onJumpToPackaging: () => editor.setActiveTab("basico"),
                        }}
                      />
                    </TabsContent>
                  )}

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
                      wholesaleEnabled={editor.isWholesaleEnabled}
                      store={store}
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
                    <ProductMediaTab
                      images={editor.images}
                      onImagesChange={editor.setImages}
                      variants={editor.variantsMatrix}
                    />
                  </TabsContent>

                  {nicheCtx.isFoodBusiness && (
                    <TabsContent value="cardapio" className="space-y-4 m-0">
                      <ProductFoodSpecsCard value={editor.foodSpecs} onChange={editor.setFoodSpecs} />
                    </TabsContent>
                  )}

                  {true && (
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
                  )}
                </>
              )}
            </Tabs>
          );

          if (isWideMode) {
            return (
              <div className="w-full animate-in fade-in duration-200">
                {tabsContent}
              </div>
            );
          }

          return (
            <CanonicalSplit
              ratio="60-40"
              leftPane={tabsContent}
              rightPane={
                <ProductPreviewPane
                  isTravelPackageMode={editor.isTravelPackageMode}
                  isGroceryMode={editor.isGroceryMode}
                  travelData={editor.travelData}
                  formValues={editor.formValues}
                  variants={editor.variantsMatrix}
                  images={editor.images}
                  activePreviewImage={editor.activePreviewImage}
                  setActivePreviewImage={editor.setActivePreviewImage}
                  store={store}
                />
              }
            />
          );
        })()}
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
