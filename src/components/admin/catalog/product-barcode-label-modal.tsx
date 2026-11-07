import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Printer, Download, Barcode, Eye, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateBarcodeSVG, generateEAN13 } from "@/lib/barcode-generator";
import { formatMoney } from "@/lib/money";

export interface LabelProductData {
  title: string;
  brand?: string | null;
  sku?: string | null;
  ean?: string | null;
  price_cents: number;
  stock?: number;
  variants?: Array<{
    id?: string;
    sku?: string;
    attributes: Record<string, string>;
    stock?: number;
    price_override_cents?: number | null;
  }>;
}

export interface ProductBarcodeLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: LabelProductData;
}

export type LabelTemplateType =
  | "zebra_100x50"
  | "zebra_60x40"
  | "pimaco_6180"
  | "pimaco_6182";

interface LabelTemplateConfig {
  id: LabelTemplateType;
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  isSheetA4: boolean;
  columns?: number;
  rows?: number;
  labelsPerPage?: number;
}

const TEMPLATES: Record<LabelTemplateType, LabelTemplateConfig> = {
  zebra_100x50: {
    id: "zebra_100x50",
    name: "Zebra / Térmica 100 x 50 mm",
    description: "Etiqueta avulsa para gôndola, vestuário e caixas de entrega",
    widthMm: 100,
    heightMm: 50,
    isSheetA4: false,
    labelsPerPage: 1,
  },
  zebra_60x40: {
    id: "zebra_60x40",
    name: "Zebra / Térmica 60 x 40 mm",
    description: "Compacta para joias, cosméticos e pequenos acessórios",
    widthMm: 60,
    heightMm: 40,
    isSheetA4: false,
    labelsPerPage: 1,
  },
  pimaco_6180: {
    id: "pimaco_6180",
    name: "Pimaco 6180 / Colacril (Folha A4 com 30)",
    description: "3 colunas x 10 linhas (66,7 x 25,4 mm cada etiqueta)",
    widthMm: 66.7,
    heightMm: 25.4,
    isSheetA4: true,
    columns: 3,
    rows: 10,
    labelsPerPage: 30,
  },
  pimaco_6182: {
    id: "pimaco_6182",
    name: "Pimaco 6182 (Folha A4 com 14)",
    description: "2 colunas x 7 linhas (101,6 x 38,1 mm cada etiqueta)",
    widthMm: 101.6,
    heightMm: 38.1,
    isSheetA4: true,
    columns: 2,
    rows: 7,
    labelsPerPage: 14,
  },
};

export function ProductBarcodeLabelModal({
  open,
  onOpenChange,
  product,
}: ProductBarcodeLabelModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplateType>("zebra_100x50");
  const [showPrice, setShowPrice] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showAttributes, setShowAttributes] = useState(true);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(-1); // -1 = Produto base

  const defaultCopies = useMemo(() => {
    if (product.variants && product.variants.length > 0 && selectedVariantIndex >= 0) {
      return product.variants[selectedVariantIndex]?.stock || 1;
    }
    return product.stock || 1;
  }, [product, selectedVariantIndex]);

  const [quantity, setQuantity] = useState<number>(defaultCopies);

  const activeVariant = selectedVariantIndex >= 0 && product.variants ? product.variants[selectedVariantIndex] : null;

  const resolvedCode = useMemo(() => {
    if (activeVariant?.sku) return activeVariant.sku;
    if (product.ean) return generateEAN13(product.ean);
    if (product.sku) return product.sku;
    return generateEAN13(String(Date.now()).slice(-9));
  }, [product, activeVariant]);

  const resolvedPriceCents = activeVariant?.price_override_cents ?? product.price_cents;
  const resolvedAttributesText = useMemo(() => {
    if (!activeVariant || !activeVariant.attributes) return "";
    return Object.entries(activeVariant.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
  }, [activeVariant]);

  const barcodeSvg = useMemo(() => {
    return generateBarcodeSVG(resolvedCode, { height: 35, showText: true });
  }, [resolvedCode]);

  const templateConfig = TEMPLATES[selectedTemplate];

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Permita pop-ups no navegador para imprimir as etiquetas.");
      return;
    }

    const labelsHtml = Array.from({ length: Math.max(1, quantity) })
      .map(
        () => `
        <div class="label-item">
          <div class="header">
            ${showBrand && product.brand ? `<span class="brand">${product.brand}</span>` : ""}
            ${showPrice ? `<span class="price">${formatMoney(resolvedPriceCents)}</span>` : ""}
          </div>
          <div class="title">${product.title}</div>
          ${showAttributes && resolvedAttributesText ? `<div class="attributes">${resolvedAttributesText}</div>` : ""}
          <div class="barcode-container">
            ${barcodeSvg}
          </div>
        </div>
      `
      )
      .join("");

    const isA4 = templateConfig.isSheetA4;
    const pageStyle = isA4
      ? `@page { size: A4; margin: 8mm 6mm; }`
      : `@page { size: ${templateConfig.widthMm}mm ${templateConfig.heightMm}mm; margin: 0; }`;

    const gridStyle = isA4
      ? `
        .labels-sheet {
          display: grid;
          grid-template-columns: repeat(${templateConfig.columns || 3}, ${templateConfig.widthMm}mm);
          grid-template-rows: repeat(${templateConfig.rows || 10}, ${templateConfig.heightMm}mm);
          gap: 2mm 3mm;
          justify-content: center;
        }
      `
      : `
        .labels-sheet {
          display: flex;
          flex-direction: column;
        }
      `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas - ${product.title}</title>
          <style>
            ${pageStyle}
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            ${gridStyle}
            .label-item {
              width: ${templateConfig.widthMm}mm;
              height: ${templateConfig.heightMm}mm;
              padding: 2.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              page-break-inside: avoid;
              border: 0.2mm dashed lightgray;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8pt;
              font-weight: 700;
              margin-bottom: 1mm;
            }
            .brand {
              text-transform: uppercase;
              color: dimgray;
              max-width: 60%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .price {
              font-size: 9.5pt;
              color: black;
            }
            .title {
              font-size: 7.5pt;
              font-weight: 600;
              line-height: 1.15;
              color: black;
              max-height: 2.8em;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .attributes {
              font-size: 6.5pt;
              color: gray;
              margin-top: 0.5mm;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .barcode-container {
              width: 100%;
              height: 14mm;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-top: 1mm;
            }
            .barcode-container svg {
              width: 100%;
              height: 100%;
              max-height: 14mm;
            }
            @media print {
              .label-item { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="labels-sheet">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`${quantity} etiqueta(s) enviada(s) para impressão!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Barcode className="size-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              Impressão de Etiquetas com Código de Barras
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere etiquetas adesivas padrão para gôndolas e roupas compatíveis com impressoras Zebra, Pimaco e folhas A4.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor de Modelo de Etiqueta */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Modelo de Papel / Impressora</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(val: any) => setSelectedTemplate(val)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TEMPLATES).map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs">{tmpl.name}</span>
                      <span className="text-xs text-muted-foreground">{tmpl.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variação (se houver) e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Variação Específica</Label>
                <Select
                  value={String(selectedVariantIndex)}
                  onValueChange={(val) => {
                    const idx = Number(val);
                    setSelectedVariantIndex(idx);
                    if (idx >= 0 && product.variants?.[idx]) {
                      setQuantity(product.variants[idx].stock || 1);
                    } else {
                      setQuantity(product.stock || 1);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">Produto Geral (Principal)</SelectItem>
                    {product.variants.map((v, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {Object.values(v.attributes).join(" / ") || v.sku || `Variação #${idx + 1}`} (Estoque: {v.stock || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-medium">Quantidade de Etiquetas</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-11 rounded-lg text-xs font-mono bg-background"
              />
            </div>
          </div>

          {/* Opções de Conteúdo da Etiqueta */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/50 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <Switch checked={showPrice} onCheckedChange={setShowPrice} />
              <span>Preço</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <Switch checked={showBrand} onCheckedChange={setShowBrand} />
              <span>Marca</span>
            </label>
            {product.variants && product.variants.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <Switch checked={showAttributes} onCheckedChange={setShowAttributes} />
                <span>Atributos</span>
              </label>
            )}
          </div>

          {/* Preview da Etiqueta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">Pré-visualização da Etiqueta</Label>
              <Badge variant="outline" className="text-xs font-mono">
                {templateConfig.widthMm} x {templateConfig.heightMm} mm
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-muted/40 border border-dashed border-border flex items-center justify-center">
              <div className="bg-card text-card-foreground p-3 rounded-lg shadow-xs w-full max-w-xs border border-border space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  {showBrand && <span className="text-muted-foreground truncate max-w-32">{product.brand || "LOJA"}</span>}
                  {showPrice && <span className="text-foreground font-mono">{formatMoney(resolvedPriceCents)}</span>}
                </div>
                <p className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
                  {product.title}
                </p>
                {showAttributes && resolvedAttributesText && (
                  <p className="text-xs text-muted-foreground truncate">{resolvedAttributesText}</p>
                )}
                <div
                  className="pt-1 w-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="h-11 text-xs rounded-lg font-bold gap-2 bg-primary text-primary-foreground"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            Imprimir {quantity} Etiqueta(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
