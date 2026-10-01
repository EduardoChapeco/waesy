import React from "react";
import { Zap, Tag, DollarSign, ImagePlus, FileText, Phone, ArrowRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyField } from "@/components/ui/currency-field";
import { ListingMediaSection } from "./sections/listing-media-section";
import type { UnifiedListing, UnifiedNiche, ListingOrigin } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { cn } from "@/lib/utils";

export interface ListingQuickEditorProps {
  origin: ListingOrigin;
  listing: Partial<UnifiedListing>;
  onChange: (patch: Partial<UnifiedListing>) => void;
  onSwitchToFullMode: () => void;
  onRequestPublish: () => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ListingQuickEditor({
  origin,
  listing,
  onChange,
  onSwitchToFullMode,
  onRequestPublish,
  errors = {},
  className,
}: ListingQuickEditorProps) {
  const niche = (listing.niche || "retail") as UnifiedNiche;
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];
  const commercial = listing.commercial || { price_cents: 0 };
  const media = listing.media || { media_urls: [], cover_url: "" };

  const handleNicheChange = (newNiche: UnifiedNiche) => {
    const config = NICHE_TAXONOMY_REGISTRY[newNiche];
    onChange({
      niche: newNiche,
      template: config?.allowedTemplates[0] || "retail_standard",
    });
  };

  return (
    <div className={cn("space-y-6 max-w-3xl mx-auto", className)}>
      {/* Banner de Modo Rápido */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Zap className="size-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Modo Rápido de Publicação</h2>
            <p className="text-xs text-muted-foreground">
              Campos essenciais para publicar em menos de 1 minuto. Você pode detalhar depois.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToFullMode}
          className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
        >
          <span>Ir para Modo Completo</span>
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {/* ── 1. Título & Segmento ── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Tag className="size-4 text-primary shrink-0" />
          <span>Informações Principais</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Segmento / Nicho */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Segmento / Nicho</Label>
            <Select value={niche} onValueChange={(v) => handleNicheChange(v as UnifiedNiche)}>
              <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
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

          {/* Título do Anúncio */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
              <span>Título do Anúncio</span>
              <span className="text-destructive font-bold">*</span>
            </Label>
            <Input
              value={listing.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={
                niche === "tourism"
                  ? "Ex: Excursão Beto Carrero World — Fim de Semana"
                  : "Ex: Tênis Esportivo Casual — Conforto Dia a Dia"
              }
              className={cn("h-11 rounded-xl text-xs bg-background", errors.title && "border-destructive")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
        </div>

        {/* Descrição Curta */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Descrição do Anúncio</Label>
          <Textarea
            value={listing.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Descreva detalhes essenciais, benefícios, estado de conservação ou o que está incluso..."
            rows={3}
            className="rounded-xl text-xs bg-background resize-none"
          />
        </div>
      </div>

      {/* ── 2. Preço & Condição Básica ── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <DollarSign className="size-4 text-primary shrink-0" />
          <span>Preço de Venda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
              <span>Valor Principal</span>
              <span className="text-destructive font-bold">*</span>
            </Label>
            <CurrencyField
              value={commercial.price_cents ?? 0}
              onChange={(cents) =>
                onChange({
                  commercial: { ...commercial, price_cents: cents },
                })
              }
              className={cn("h-11 rounded-xl text-sm bg-background", errors.price_cents && "border-destructive")}
            />
            {errors.price_cents && <p className="text-xs text-destructive">{errors.price_cents}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Preço Comparativo (De)</Label>
            <CurrencyField
              value={commercial.compare_at_cents ?? 0}
              onChange={(cents) =>
                onChange({
                  commercial: { ...commercial, compare_at_cents: cents > 0 ? cents : null },
                })
              }
              className="h-11 rounded-xl text-sm bg-background"
            />
            <p className="text-xs text-muted-foreground">Opcional para destacar promoção</p>
          </div>
        </div>
      </div>

      {/* ── 3. Fotos & Capa ── */}
      <ListingMediaSection
        origin={origin}
        value={media}
        onChange={(patch) => onChange({ media: { ...media, ...patch } })}
        errors={errors}
      />

      {/* ── 4. Contato / WhatsApp (Obrigatório em Classificados) ── */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Phone className="size-4 text-primary shrink-0" />
          <span>Contato & Negociação</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">WhatsApp para Contato Direto</Label>
            <Input
              value={listing.contact_channels?.whatsapp || ""}
              onChange={(e) =>
                onChange({
                  contact_channels: {
                    ...listing.contact_channels,
                    whatsapp: e.target.value.replace(/\D/g, ""),
                  },
                })
              }
              placeholder="Ex: 49999999999"
              className="h-11 rounded-xl text-xs bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Compradores poderão falar diretamente pelo WhatsApp.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Cidade / Região</Label>
            <Input
              value={listing.location_data?.city || ""}
              onChange={(e) =>
                onChange({
                  location_data: {
                    ...listing.location_data,
                    city: e.target.value,
                    state: listing.location_data?.state || "SC",
                  },
                })
              }
              placeholder="Ex: Chapecó - SC"
              className="h-11 rounded-xl text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* ── Botão de Publicação Rápida ── */}
      <div className="pt-2 flex items-center justify-end gap-3">
        <Button
          type="button"
          onClick={onRequestPublish}
          className="h-11 rounded-xl text-xs font-bold gap-2 px-6 shadow-xs cursor-pointer"
        >
          <ShieldCheck className="size-4" />
          <span>Revisar & Publicar Anúncio</span>
        </Button>
      </div>
    </div>
  );
}
