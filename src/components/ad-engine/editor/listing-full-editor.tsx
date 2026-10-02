import React, { useState } from "react";
import { Tag, DollarSign, ImagePlus, Layers, SlidersHorizontal, CheckCircle2, Receipt, Palette, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingPricingSection } from "./sections/listing-pricing-section";
import { ListingMediaSection } from "./sections/listing-media-section";
import { ListingVariantsSection, type UnifiedVariantItem, type UnifiedDepartureItem } from "./sections/listing-variants-section";
import { ListingModifiersSection, type UnifiedModifierGroup } from "./sections/listing-modifiers-section";
import { ListingScopeSection } from "./sections/listing-scope-section";
import { ListingFiscalSection } from "./sections/listing-fiscal-section";
import { ListingTemplateSelector } from "./sections/listing-template-selector";
import type { UnifiedListing, UnifiedNiche, ListingOrigin } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface ListingFullEditorProps {
  origin: ListingOrigin;
  listing: Partial<UnifiedListing>;
  onChange: (patch: Partial<UnifiedListing>) => void;
  errors?: Record<string, string>;
  onOpenMasterCatalog?: () => void;
  className?: string;
}

export function ListingFullEditor({
  origin,
  listing,
  onChange,
  errors = {},
  onOpenMasterCatalog,
  className,
}: ListingFullEditorProps) {
  const [activeTab, setActiveTab] = useState("basico");
  const niche = (listing.niche || "retail") as UnifiedNiche;
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];
  const isWorkspace = origin === "workspace";

  const commercial = listing.commercial || { price_cents: 0 };
  const media = listing.media || { media_urls: [], cover_url: "" };
  const fiscal = listing.fiscal || {};
  const currentTemplate = listing.template || nicheConfig?.allowedTemplates[0] || "retail_standard";

  const isTourism = niche === "tourism";
  const isService = niche === "services";
  const hasScope = isTourism || isService;
  const supportsFiscal = isWorkspace && (nicheConfig?.supportsShipping || niche === "retail");

  // Cast or adapt variants / departures
  const variants = (listing.variants || []) as UnifiedVariantItem[];
  const departures = ((listing.departures || []) as unknown) as UnifiedDepartureItem[];
  const modifiers = (listing.modifier_groups || []) as UnifiedModifierGroup[];
  const inclusions = listing.inclusions || [];
  const exclusions = listing.exclusions || [];

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-11 p-1 bg-muted/60 rounded-lg flex items-center gap-1 overflow-x-auto w-full justify-start scrollbar-none border border-border/40">
          <TabsTrigger value="basico" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <Tag className="size-4" />
            <span>Identificação</span>
          </TabsTrigger>

          <TabsTrigger value="comercial" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <DollarSign className="size-4" />
            <span>Preço & Condições</span>
          </TabsTrigger>

          <TabsTrigger value="midia" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <ImagePlus className="size-4" />
            <span>Fotos & Vídeo</span>
          </TabsTrigger>

          <TabsTrigger value="variacoes" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <Layers className="size-4" />
            <span>{isTourism ? "Saídas & Vagas" : "Grade & Variações"}</span>
          </TabsTrigger>

          <TabsTrigger value="opcionais" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <SlidersHorizontal className="size-4" />
            <span>Adicionais</span>
          </TabsTrigger>

          {hasScope && (
            <TabsTrigger value="escopo" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
              <CheckCircle2 className="size-4" />
              <span>Inclusos & Exclusos</span>
            </TabsTrigger>
          )}

          {supportsFiscal && (
            <TabsTrigger value="fiscal" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
              <Receipt className="size-4" />
              <span>Fiscal (2026)</span>
            </TabsTrigger>
          )}

          <TabsTrigger value="template" className="h-9 rounded-md text-xs font-semibold gap-2 px-3">
            <Palette className="size-4" />
            <span>Composição Visual</span>
          </TabsTrigger>
        </TabsList>

        {/* ── ABA 1: Identificação ── */}
        <TabsContent value="basico" className="mt-4 space-y-4">
          <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Tag className="size-4 text-primary shrink-0" />
                <span>Dados Principais do Anúncio</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {nicheConfig?.label || niche}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Nicho / Vertical</Label>
                <Select
                  value={niche}
                  onValueChange={(val) => {
                    const nextNiche = val as UnifiedNiche;
                    const nextConfig = NICHE_TAXONOMY_REGISTRY[nextNiche];
                    onChange({
                      niche: nextNiche,
                      template: nextConfig?.allowedTemplates[0] || "retail_standard",
                    });
                  }}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue placeholder="Selecione o nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NICHE_TAXONOMY_REGISTRY).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <span>Título do Anúncio</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  value={listing.title || ""}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder={
                    isTourism
                      ? "Ex: Pacote Serra Gaúcha & Vinhedos com Hospedagem"
                      : "Ex: Camiseta Básica Algodão Egípcio"
                  }
                  className={cn("h-11 rounded-lg text-xs bg-background", errors.title && "border-destructive")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Slug Amigável (URL)</Label>
                <Input
                  value={listing.slug || ""}
                  onChange={(e) => onChange({ slug: e.target.value })}
                  placeholder="gerado-automaticamente"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Marca / Fabricante / Operador</Label>
                <Input
                  value={listing.brand || ""}
                  onChange={(e) => onChange({ brand: e.target.value })}
                  placeholder="Ex: Waesy Viagens / Marca Própria"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Descrição Detalhada</Label>
              <Textarea
                value={listing.description || ""}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Insira detalhes completos, especificações, termos e informações para os compradores..."
                rows={5}
                className="rounded-lg text-xs bg-background resize-y"
              />
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 2: Preço & Comercial (Dono Único - F18) ── */}
        <TabsContent value="comercial" className="mt-4">
          <ListingPricingSection
            niche={niche}
            isWorkspace={isWorkspace}
            value={commercial}
            onChange={(patch) => onChange({ commercial: { ...commercial, ...patch } })}
            errors={errors}
          />
        </TabsContent>

        {/* ── ABA 3: Fotos & Vídeo (F21) ── */}
        <TabsContent value="midia" className="mt-4">
          <ListingMediaSection
            origin={origin}
            value={media}
            onChange={(patch) => onChange({ media: { ...media, ...patch } })}
            errors={errors}
          />
        </TabsContent>

        {/* ── ABA 4: Variações & Matriz (F19) ── */}
        <TabsContent value="variacoes" className="mt-4">
          <ListingVariantsSection
            niche={niche}
            basePriceCents={commercial.price_cents ?? 0}
            variants={variants}
            onChangeVariants={(v) => onChange({ variants: v as any })}
            departures={departures}
            onChangeDepartures={(d) => onChange({ departures: d as any })}
          />
        </TabsContent>

        {/* ── ABA 5: Adicionais (F20) ── */}
        <TabsContent value="opcionais" className="mt-4">
          <ListingModifiersSection
            niche={niche}
            groups={modifiers}
            onChange={(m) => onChange({ modifier_groups: m as any })}
          />
        </TabsContent>

        {/* ── ABA 6: Inclusos & Exclusos (F17, O01, O05) ── */}
        {hasScope && (
          <TabsContent value="escopo" className="mt-4">
            <ListingScopeSection
              niche={niche}
              inclusions={inclusions}
              exclusions={exclusions}
              onChangeInclusions={(inc) => onChange({ inclusions: inc })}
              onChangeExclusions={(exc) => onChange({ exclusions: exc })}
            />
          </TabsContent>
        )}

        {/* ── ABA 7: Fiscal (F22) ── */}
        {supportsFiscal && (
          <TabsContent value="fiscal" className="mt-4">
            <ListingFiscalSection
              niche={niche}
              isWorkspace={isWorkspace}
              value={fiscal}
              onChange={(patch) => onChange({ fiscal: { ...fiscal, ...patch } })}
              onOpenMasterCatalog={onOpenMasterCatalog}
              errors={errors}
            />
          </TabsContent>
        )}

        {/* ── ABA 8: Composição Visual / Templates Coerentes (F24, O02) ── */}
        <TabsContent value="template" className="mt-4">
          <ListingTemplateSelector
            niche={niche}
            value={currentTemplate}
            onChange={(templateId) => onChange({ template: templateId })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
