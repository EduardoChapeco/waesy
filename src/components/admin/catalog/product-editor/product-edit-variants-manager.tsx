import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Layers, LayoutList, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { VariantOptionsBuilder } from "@/components/admin/product-editor/variant-options-builder";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { batchUpsertVariantMatrix } from "@/services/admin-catalog.functions";

interface ProductEditVariantsManagerProps {
  product: any;
}

export function ProductEditVariantsManager({ product }: ProductEditVariantsManagerProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variants, setVariants] = useState<RawVariant[]>(() => {
    return (product?.product_variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      ean: v.ean,
      attributes: v.attributes || {},
      stock: v.stock_on_hand ?? v.stock ?? 0,
      price_override_cents: v.price_override_cents,
      cost_cents: v.cost_cents,
      weight_kg: v.weight_kg,
      image_url: v.image_url,
      status: v.status || "active",
      allow_backorder: v.allow_backorder,
      backorder_lead_time_days: v.backorder_lead_time_days,
      requires_payment_for_backorder: v.requires_payment_for_backorder,
    }));
  });

  const handleSaveMatrix = async () => {
    setIsSubmitting(true);
    try {
      await batchUpsertVariantMatrix({
        data: {
          product_id: product.id,
          matrix: variants,
        },
      });
      toast.success("Matriz de variações salva com sucesso!");
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar matriz");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="builder" className="bg-card rounded-lg px-4 border border-border/80">
          <AccordionTrigger className="hover:no-underline text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Gerador em Lote de Opções (Tamanhos, Cores, Voltagens)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="mb-4 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-xs">
              <strong>Dica de Uso:</strong> Use o gerador para criar combinações em lote (ex: Tamanhos P, M, G combinados com Cores Preto, Branco).
            </div>
            <VariantOptionsBuilder product={product} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-6 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <LayoutList className="size-4 text-primary" />
              Matriz de Variações e Saldo de Estoque
            </h3>
            <p className="text-xs text-muted-foreground">
              Ajuste atributos, estoque, preços específicos e SKUs diretamente na tabela 2D.
            </p>
          </div>
          <Button
            onClick={handleSaveMatrix} /* focus-visible: */
            disabled={isSubmitting}
            size="sm"
            className="font-bold gap-2 rounded-lg h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}
            Salvar Matriz
          </Button>
        </div>

        <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
          <VariantMatrixGrid
            variants={variants}
            onChange={setVariants}
            basePriceCents={product.price_cents || 0}
          />
        </div>
      </div>
    </div>
  );
}
