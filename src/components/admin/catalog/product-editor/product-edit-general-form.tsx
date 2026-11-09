import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyField } from "@/components/ui/currency-field";
import { updateProduct, createCategory, createStoreBrand, batchUpsertVariantMatrix } from "@/services/admin-catalog.functions";
import { extractErrorMessage } from "@/lib/utils";
import { getClientActiveTenant } from "@/lib/context-auth";
import type { RawVariant } from "@/types/catalog";
import {
  ProductPackagingSelector,
  type ProductLogisticsMetadata,
} from "./product-packaging-selector";
import { ProductBrandModal } from "./product-brand-modal";

interface ProductEditGeneralFormProps {
  product: any;
  categories: any[];
  productTypes: any[];
  brands?: string[];
  nicheCtx: any;
  variants?: RawVariant[];
  onSavingChange?: (saving: boolean) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onBrandChange: (v: string) => void;
  onPriceChange: (v: number) => void;
  onCompareChange: (v: number | null) => void;
  onCostChange: (v: number | null) => void;
  onStatusChange: (v: string) => void;
}

export function ProductEditGeneralForm({
  product,
  categories,
  productTypes,
  brands = [],
  nicheCtx,
  variants,
  onSavingChange,
  onTitleChange,
  onDescriptionChange,
  onBrandChange,
  onPriceChange,
  onCompareChange,
  onCostChange,
  onStatusChange,
}: ProductEditGeneralFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialCategoryId = product?.product_categories?.[0]?.category_id || "";
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId);

  const [brandsList, setBrandsList] = useState<string[]>(brands);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [logistics, setLogistics] = useState<ProductLogisticsMetadata>(
    (product?.attributes as any)?.logistics || {
      packaging_type: product?.is_physical === false ? "digital" : "box",
      fragile: false,
      stackable: true,
      thermal_control: "ambient",
      aisle_location: "",
      picking_notes: "",
    }
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      brand: product?.brand || "",
      price_cents: product?.price_cents || 0,
      compare_at_cents: product?.compare_at_cents || undefined,
      cost_cents: product?.cost_cents || undefined,
      status: product?.status || "draft",
      short_description: product?.short_description || "",
      manufacturer: product?.manufacturer || "",
      ean: product?.ean || "",
      meta_title: product?.meta_title || "",
      meta_description: product?.meta_description || "",
      is_physical: product?.is_physical !== false,
      weight_kg: product?.weight_kg || "",
      width_cm: product?.width_cm || "",
      height_cm: product?.height_cm || "",
      length_cm: product?.length_cm || "",
      preparation_time_days: product?.preparation_time_days || 0,
      preparation_time_minutes: (product as any)?.preparation_time_minutes || "",
      type_id: product?.type_id || "none",
      show_stock_publicly: product?.show_stock_publicly ?? false,
      attributes: product?.attributes || {},
    },
  });

  const watchTitle = watch("title");
  const watchDescription = watch("description");
  const watchBrand = watch("brand");
  const watchPrice = watch("price_cents");
  const watchCompare = watch("compare_at_cents");
  const watchCost = watch("cost_cents");
  const watchStatus = watch("status");
  const watchTypeId = watch("type_id");

  const selectedProductType = useMemo(() => {
    return productTypes.find((t) => t.id === watchTypeId);
  }, [watchTypeId, productTypes]);

  useEffect(() => {
    onTitleChange(watchTitle);
  }, [watchTitle, onTitleChange]);

  useEffect(() => {
    onDescriptionChange(watchDescription);
  }, [watchDescription, onDescriptionChange]);

  useEffect(() => {
    onBrandChange(watchBrand);
  }, [watchBrand, onBrandChange]);

  useEffect(() => {
    const val = typeof watchPrice === "number" ? watchPrice : parseInt(String(watchPrice || "").replace(/\D/g, ""), 10);
    onPriceChange(isNaN(val) ? 0 : val);
  }, [watchPrice, onPriceChange]);

  useEffect(() => {
    if (watchCompare === undefined || watchCompare === null || watchCompare === ("" as any)) {
      return onCompareChange(null);
    }
    const val = typeof watchCompare === "number" ? watchCompare : parseInt(String(watchCompare).replace(/\D/g, ""), 10);
    onCompareChange(isNaN(val) ? null : val);
  }, [watchCompare, onCompareChange]);

  useEffect(() => {
    if (watchCost === undefined || watchCost === null || watchCost === ("" as any)) {
      return onCostChange(null);
    }
    const val = typeof watchCost === "number" ? watchCost : parseInt(String(watchCost).replace(/\D/g, ""), 10);
    onCostChange(isNaN(val) ? null : val);
  }, [watchCost, onCostChange]);

  useEffect(() => {
    onStatusChange(watchStatus);
  }, [watchStatus, onStatusChange]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    onSavingChange?.(true);
    try {
      const price_cents = typeof values.price_cents === "number"
        ? values.price_cents
        : parseInt(String(values.price_cents || "").replace(/\D/g, ""), 10) || 0;
      const compare_at_cents = values.compare_at_cents !== undefined && values.compare_at_cents !== null && values.compare_at_cents !== ""
        ? (typeof values.compare_at_cents === "number"
          ? values.compare_at_cents
          : parseInt(String(values.compare_at_cents).replace(/\D/g, ""), 10) || null)
        : null;
      const cost_cents = values.cost_cents !== undefined && values.cost_cents !== null && values.cost_cents !== ""
        ? (typeof values.cost_cents === "number"
          ? values.cost_cents
          : parseInt(String(values.cost_cents).replace(/\D/g, ""), 10) || null)
        : null;

      const res = await updateProduct({
        data: {
          id: product.id,
          title: values.title,
          description: values.description || null,
          brand: values.brand,
          status: values.status,
          price_cents,
          compare_at_cents,
          cost_cents,
          short_description: values.short_description || null,
          manufacturer: values.manufacturer || null,
          ean: values.ean || null,
          meta_title: values.meta_title || null,
          meta_description: values.meta_description || null,
          is_physical: values.is_physical,
          weight_kg: values.weight_kg ? parseFloat(values.weight_kg) : null,
          width_cm: values.width_cm ? parseFloat(values.width_cm) : null,
          height_cm: values.height_cm ? parseFloat(values.height_cm) : null,
          length_cm: values.length_cm ? parseFloat(values.length_cm) : null,
          preparation_time_days: values.preparation_time_days
            ? parseInt(values.preparation_time_days, 10)
            : 0,
          preparation_time_minutes: values.preparation_time_minutes
            ? parseInt(values.preparation_time_minutes, 10)
            : null,
          show_stock_publicly: values.show_stock_publicly ?? false,
          category_ids: selectedCategory && selectedCategory !== "none" ? [selectedCategory] : [],
          type_id: values.type_id !== "none" ? values.type_id : null,
          attributes: {
            ...(values.attributes || {}),
            logistics,
            weight_kg: values.weight_kg ? parseFloat(values.weight_kg) : null,
            dimensions: `${values.length_cm || 0} x ${values.width_cm || 0} x ${values.height_cm || 0} cm`,
          },
        },
      });

      if (variants && variants.length > 0) {
        await batchUpsertVariantMatrix({
          data: {
            product_id: product.id,
            matrix: variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              ean: v.ean,
              attributes: Object.fromEntries(
                Object.entries(v.attributes || {}).map(([k, val]) => [k, String(val ?? "")])
              ),
              price_override_cents: v.price_override_cents ?? null,
              stock: v.stock ?? 0,
              original_stock: v.original_stock,
              cost_cents: v.cost_cents ?? null,
              weight_kg: v.weight_kg ?? null,
              image_url: v.image_url ?? null,
              status: (v.status as any) || "active",
              allow_backorder: v.allow_backorder,
              backorder_lead_time_days: v.backorder_lead_time_days,
              requires_payment_for_backorder: v.requires_payment_for_backorder,
            })),
          },
        });
      }

      if (res) {
        toast.success(`${nicheCtx.entityName} e variações atualizados com sucesso!`);
        await router.invalidate();
      } else {
        toast.error(`Erro ao atualizar ${nicheCtx.entityName.toLowerCase()}`);
      }
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, "Erro inesperado ao salvar alterações"));
    } finally {
      setIsSubmitting(false);
      onSavingChange?.(false);
    }
  };

  const handleCreateCategory = async () => {
    if (Boolean(newCategoryName?.trim()) === false) return;
    setIsCreatingCategory(true);
    try {
      const slug = newCategoryName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const effectiveStoreId = product?.store_id || (typeof window !== "undefined" ? getClientActiveTenant() : undefined);
      const res = await createCategory({
        data: {
          name: newCategoryName,
          slug,
          status: "active",
                  },
      });
      if (res) {
        toast.success("Categoria criada com sucesso!");
        categories.push(res);
        setSelectedCategory(res.id);
        setIsCategoryModalOpen(false);
        setNewCategoryName("");
      } else {
        toast.error("Erro ao criar categoria");
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao criar categoria"));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleQuickCreateBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Informe o nome da marca.");
      return;
    }
    setIsCreatingBrand(true);
    try {
      const clean = newBrandName.trim();
      const effectiveStoreId = product?.store_id || (typeof window !== "undefined" ? getClientActiveTenant() : undefined);
      const res = await createStoreBrand({
        data: {
          name: clean,
          store_id: effectiveStoreId || undefined,
        },
      });
      const createdName = res?.name || clean;
      setBrandsList((prev) =>
        prev.includes(createdName)
          ? prev
          : [...prev, createdName].sort((a, b) =>
              a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
            ),
      );
      setValue("brand", createdName);
      onBrandChange(createdName);
      setIsBrandModalOpen(false);
      setNewBrandName("");
      toast.success(`${nicheCtx.brandLabel || "Marca"} cadastrada com sucesso!`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao criar marca."));
    } finally {
      setIsCreatingBrand(false);
    }
  };

  return (
    <form id="product-edit-general-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10 pb-12">
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">Informações de Identificação</h3>
          <p className="text-sm text-muted-foreground">
            Defina o título, detalhes e descrição para a vitrine.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{nicheCtx.nameLabel}</Label>
            <Input {...register("title", { required: "Obrigatório" })} placeholder={nicheCtx.namePlaceholder} />
            {errors.title && <span className="text-xs text-destructive">Campo obrigatório</span>}
          </div>
          <div className="space-y-2">
            <Label>{nicheCtx.descLabel}</Label>
            <Textarea
              {...register("description")}
              rows={5}
              placeholder={nicheCtx.descPlaceholder}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{nicheCtx.brandLabel}</Label>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="text-xs text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  + Nova Marca
                </button>
              </div>
              <Select
                value={watch("brand") || ""}
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    setIsBrandModalOpen(true);
                  } else {
                    setValue("brand", val);
                    onBrandChange(val);
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder={nicheCtx.brandPlaceholder || "Selecione a marca..."} />
                </SelectTrigger>
                <SelectContent>
                  {brandsList && brandsList.length > 0 ? (
                    brandsList.map((brand: string) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))
                  ) : null}
                  {watch("brand") && (!brandsList || !brandsList.includes(watch("brand"))) && (
                    <SelectItem value={watch("brand")}>
                      {watch("brand")}
                    </SelectItem>
                  )}
                  {(!brandsList || brandsList.length === 0) && !watch("brand") && (
                    <div className="py-2 px-3 text-xs text-muted-foreground">
                      Nenhuma marca cadastrada
                    </div>
                  )}
                  <SelectItem value="__custom__" className="text-primary font-medium">
                    + Cadastrar nova marca...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{nicheCtx.categoryLabel}</Label>
                <Sheet open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                  <SheetTrigger asChild>
                    <button /* focus-visible: */
                      type="button"
                      className="text-xs text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      + Nova Categoria
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Criar Nova Categoria</SheetTitle>
                      <SheetDescription>
                        Crie uma nova categoria para agrupar {nicheCtx.entityNamePlural.toLowerCase()} na vitrine.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 pt-6">
                      <div className="space-y-2">
                        <Label>Nome da Categoria</Label>
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ex: Calçados, Bebidas..."
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleCreateCategory} /* focus-visible: */
                        disabled={isCreatingCategory || (!newCategoryName.trim())}
                        className="w-full rounded-lg text-sm font-semibold h-11 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isCreatingCategory ? "Criando..." : "Salvar Categoria"}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">Preço e Margens</h3>
          <p className="text-sm text-muted-foreground">
            Configure o valor de venda, comparativo promocional e custo interno de aquisição.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{nicheCtx.priceLabel}</Label>
            <CurrencyField
              value={watchPrice}
              onChange={(cents) => setValue("price_cents", cents)}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Preço Comparativo (De / Risco)</Label>
            <CurrencyField
              value={watchCompare || 0}
              onChange={(cents) => setValue("compare_at_cents", cents)}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Custo do Produto (Interno)</Label>
            <CurrencyField
              value={watchCost || 0}
              onChange={(cents) => setValue("cost_cents", cents)}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t">
        <ProductPackagingSelector
          weightKg={watch("weight_kg")}
          widthCm={watch("width_cm")}
          heightCm={watch("height_cm")}
          lengthCm={watch("length_cm")}
          preparationTimeDays={watch("preparation_time_days")}
          preparationTimeMinutes={watch("preparation_time_minutes")}
          isPhysical={watch("is_physical")}
          logistics={logistics}
          nicheCtx={nicheCtx}
          onChangeDimensions={(patch) => {
            if (patch.weight_kg !== undefined) setValue("weight_kg", patch.weight_kg);
            if (patch.width_cm !== undefined) setValue("width_cm", patch.width_cm);
            if (patch.height_cm !== undefined) setValue("height_cm", patch.height_cm);
            if (patch.length_cm !== undefined) setValue("length_cm", patch.length_cm);
            if (patch.preparation_time_days !== undefined) {
              setValue("preparation_time_days", patch.preparation_time_days);
            }
            if (patch.preparation_time_minutes !== undefined) {
              setValue("preparation_time_minutes", patch.preparation_time_minutes);
            }
            if (patch.is_physical !== undefined) setValue("is_physical", patch.is_physical);
          }}
          onChangeLogistics={setLogistics}
        />
      </div>

      <div className="pt-6 border-t">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">Identificadores e SEO</h3>
          <p className="text-sm text-muted-foreground">
            Otimização para busca no Google e conformidade fiscal/EAN.
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabricante / Marca do Fornecedor</Label>
              <Input {...register("manufacturer")} placeholder="Ex: Nike S.A." />
            </div>
            <div className="space-y-2">
              <Label>Código EAN / GTIN</Label>
              <Input {...register("ean")} placeholder="Ex: 7891234567890" maxLength={14} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resumo Curto (Short Description)</Label>
            <Textarea
              {...register("short_description")}
              placeholder="Visualização rápida do produto..."
              className="min-h-16"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta Title (SEO)</Label>
            <Input {...register("meta_title")} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description (SEO)</Label>
            <Textarea {...register("meta_description")} className="min-h-16" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg px-8 h-11 text-sm font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
          Salvar Alterações
        </Button>
      </div>

      <ProductBrandModal
        open={isBrandModalOpen}
        onOpenChange={setIsBrandModalOpen}
        brandLabel={nicheCtx.brandLabel}
        brandName={newBrandName}
        onBrandNameChange={setNewBrandName}
        onSubmit={handleQuickCreateBrand}
        isCreating={isCreatingBrand}
        placeholder={nicheCtx.brandPlaceholder}
        description={nicheCtx.brandDesc}
      />
    </form>
  );
}
