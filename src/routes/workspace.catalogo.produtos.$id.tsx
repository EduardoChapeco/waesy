import { createFileRoute, Link } from "@tanstack/react-router";
import { NativeBackButton } from "@/components/ui/native-back-button";
import {
  Eye,
  Star,
  Plane,
  Box,
  Utensils,
  ImagePlus,
  LayoutList,
  SlidersHorizontal,
  Boxes,
} from "lucide-react";
import { MasterCatalogSearchDialog } from "@/components/admin/catalog/master-catalog-search-dialog";
import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";
import { ProductEditorLayout } from "@/components/admin/product-editor/product-editor-layout";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";
import { ProductBomCard } from "@/components/admin/catalog/product-bom-card";
import { ProductFoodSpecsCard } from "@/components/admin/catalog/product-food-specs-card";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import {
  ProductEditGeneralForm,
  ProductEditMediaManager,
  ProductEditVariantsManager,
  ProductPreviewPane,
  useProductEdit,
} from "@/components/admin/catalog/product-editor";
import {
  getProductById,
  listCategories,
  listProductTypes,
  listOptionGroups,
} from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { getNicheSemantics } from "@/lib/niche-semantics";

export const Route = createFileRoute("/workspace/catalogo/produtos/$id")({
  head: () => ({ meta: [{ title: "Editor Avançado de Produto | Workspace Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const [product, catsRes, typesRes, groupsRes, storeRes] = await Promise.all([
        getProductById({ data: { id: params.id } }).catch(() => null),
        listCategories().catch(() => []),
        listProductTypes().catch(() => []),
        listOptionGroups().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        product: product || null,
        categories: catsRes || [],
        productTypes: typesRes || [],
        optionGroupsList: groupsRes || [],
        store: storeRes,
      };
    } catch {
      return {
        product: null,
        categories: [],
        productTypes: [],
        optionGroupsList: [],
        store: null,
      };
    }
  },
  component: EditProductPage,
});

function EditProductPage() {
  const { product, categories, productTypes, optionGroupsList, store } = ((Route.useLoaderData?.() as any) || {});
  const semantics = getNicheSemantics(store);
  const nicheCtx = getNicheCatalogContext(store);

  const edit = useProductEdit(product, store, nicheCtx, semantics, optionGroupsList);

  if (!product) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 space-y-6 pb-20 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/workspace/catalogo/produtos" />
        </div>
        <div className="p-12 text-center rounded-lg bg-card border border-border">
          <h2 className="text-base font-bold text-foreground">{nicheCtx.entityName} não encontrado</h2>
          <p className="text-xs text-muted-foreground mt-1">
            O {nicheCtx.entityName.toLowerCase()} solicitado não existe ou foi removido do catálogo.
          </p>
          <Button asChild className="mt-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 focus-visible:ring-2 focus-visible:ring-ring" size="sm">
            <Link to="/workspace/catalogo/produtos">Ir para Lista de {nicheCtx.entityNamePlural}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 sm:space-y-6">
      <div className="px-4 sm:px-0 pt-4 sm:pt-0">
        <PageHeader
          eyebrow={`Catálogo / ${nicheCtx.entityName}`}
          title={edit.liveTitle || `Editar ${nicheCtx.entityName}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => edit.setIsMasterCatalogOpen(true)} /* focus-visible: */
                className="rounded-lg text-xs font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer h-11 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className="size-3.5" />
                <span>Sincronizar Catálogo Central</span>
              </Button>
              <NativeBackButton fallbackHref="/workspace/catalogo/produtos" />
              <Button variant="outline" asChild size="sm" className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
                <Link to={`/produto/${product.slug}` as never} target="_blank">
                  <Eye className="mr-2 size-4" />
                  Ver na Vitrine
                </Link>
              </Button>
            </div>
          }
        />

        <ProductEditorLayout
          preview={
            <ProductPreviewPane
              isTravelPackageMode={edit.isTravelPackageMode}
              isGroceryMode={edit.isGroceryMode}
              travelData={edit.travelData}
              formValues={{
                title: edit.liveTitle,
                description: edit.liveDescription,
                price_cents: edit.livePriceCents,
                compare_at_cents: edit.liveCompareCents,
                brand: edit.liveBrand,
                selling_unit: product?.selling_unit || "un",
              }}
              images={edit.mediaUrls}
              activePreviewImage={edit.activePreviewImage}
              setActivePreviewImage={edit.setActivePreviewImage}
              store={store}
            />
          }
          sections={[
            ...(edit.isTourismStore
              ? [{ id: "turismo", label: "Pacote de Viagem e Roteiro", icon: <Plane className="size-4" /> }]
              : []),
            { id: "geral", label: "Informações Básicas", icon: <Box className="size-4" /> },
            ...(nicheCtx.isFoodBusiness
              ? [{ id: "especificacoes", label: "Cardápio e Restrições", icon: <Utensils className="size-4" /> }]
              : []),
            { id: "midias", label: "Galeria de Fotos", icon: <ImagePlus className="size-4" /> },
            { id: "variantes", label: nicheCtx.variationsSectionTitle, icon: <LayoutList className="size-4" /> },
            { id: "opcoes", label: "Adicionais e Opções", icon: <SlidersHorizontal className="size-4" /> },
            ...(nicheCtx.isFoodBusiness
              ? [{ id: "ficha-tecnica", label: "Ficha Técnica e Insumos", icon: <Boxes className="size-4" /> }]
              : []),
          ]}
        >
          {edit.isTourismStore && (
            <div className="p-4 rounded-lg bg-card border border-border flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Plane className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground">Modo de Publicação</span>
                  <p className="text-xs text-muted-foreground">
                    {edit.isTravelPackageMode
                      ? "Pacote Turístico / Roteiro Completo (sem frete físico, com itinerário e inclusões)"
                      : "Produto Físico / Souvenir / Mala (com frete e logística tradicional)"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={edit.isTravelPackageMode ? "default" : "outline"}
                  onClick={() => edit.setIsTravelPackageMode(true)} /* focus-visible: */
                  className="rounded-lg text-xs font-semibold h-11 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Pacote Turístico
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!edit.isTravelPackageMode ? "default" : "outline"}
                  onClick={() => edit.setIsTravelPackageMode(false)} /* focus-visible: */
                  className="rounded-lg text-xs font-semibold h-11 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Produto Físico
                </Button>
              </div>
            </div>
          )}

          {edit.isTravelPackageMode && (
            <div id="turismo" className="scroll-mt-32 mb-8">
              <TravelPackageForm
                value={edit.travelData}
                onChange={edit.handleTravelDataChange}
                priceCents={edit.livePriceCents}
              />
            </div>
          )}

          <div id="geral" className="scroll-mt-32">
            <ProductEditGeneralForm
              product={product}
              categories={categories}
              productTypes={productTypes}
              nicheCtx={nicheCtx}
              onTitleChange={edit.setLiveTitle}
              onDescriptionChange={edit.setLiveDescription}
              onBrandChange={edit.setLiveBrand}
              onPriceChange={edit.setLivePriceCents}
              onCompareChange={edit.setLiveCompareCents}
              onCostChange={edit.setLiveCostCents}
              onStatusChange={edit.setLiveStatus}
            />
          </div>

          {nicheCtx.isFoodBusiness && (
            <div id="especificacoes" className="scroll-mt-32 pt-12 border-t">
              <ProductFoodSpecsCard
                value={edit.foodSpecs}
                onChange={edit.handleFoodSpecsChange}
              />
            </div>
          )}

          <div id="midias" className="scroll-mt-32 pt-12 border-t">
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ImagePlus className="size-5 text-primary" /> Galeria de Fotos
              </h2>
              <p className="text-sm text-muted-foreground">
                Arraste para reordenar, gerencie fotos e vídeos e vincule imagens a variações específicas.
              </p>
            </div>
            <ProductEditMediaManager product={product} />
          </div>

          <div id="variantes" className="scroll-mt-32 pt-12 border-t">
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutList className="size-5 text-primary" /> {nicheCtx.variationsSectionTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                Gerencie o saldo em estoque granular, variações de tamanho, porção, códigos, preços sobrepostos e fotos específicas.
              </p>
            </div>
            <ProductEditVariantsManager product={product} />
          </div>

          <div id="opcoes" className="scroll-mt-32 pt-12 border-t">
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-primary" /> Adicionais e Modificadores
              </h2>
              <p className="text-sm text-muted-foreground">
                Grupos de complementos que o cliente escolhe ao adicionar ao carrinho (ex: ponto da carne, extras, passeios opcionais).
              </p>
            </div>
            <ProductModifiersCard
              groups={edit.optionGroups}
              selectedGroupIds={edit.selectedOptionGroupIds}
              onSelectedGroupsChange={edit.handleSelectedGroupsChange}
              onGroupsListChange={edit.setOptionGroups}
            />
          </div>

          {(nicheCtx.isFoodBusiness || edit.bomItems.length > 0) && (
            <div id="ficha-tecnica" className="scroll-mt-32 pt-12 border-t">
              <ProductBomCard
                initialItems={edit.bomItems}
                productPriceCents={edit.livePriceCents}
                onApplyCostToProduct={edit.handleApplyCostToProduct}
                onItemsChange={edit.handleBomItemsChange}
              />
            </div>
          )}
        </ProductEditorLayout>

        <MasterCatalogSearchDialog
          open={edit.isMasterCatalogOpen}
          onOpenChange={edit.setIsMasterCatalogOpen}
          onSelectProduct={edit.handleSelectMasterProduct}
        />
      </div>
    </div>
  );
}
