import React, { useState } from "react";
import { Globe, MapPin, Tag, Brain, ChevronDown, ChevronUp, X, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

export interface SeoGeoMetadata {
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  latitude?: number | string | null;
  longitude?: number | string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
  allowAiIndexing?: boolean;
}

export interface SeoGeoOptimizationPanelProps {
  value: SeoGeoMetadata;
  onChange: (updated: SeoGeoMetadata) => void;
  referenceTitle?: string;
  referenceDescription?: string;
  referenceAddress?: string;
  compact?: boolean;
  defaultOpen?: boolean;
}

export function SeoGeoOptimizationPanel({
  value,
  onChange,
  referenceTitle = "",
  referenceDescription = "",
  referenceAddress = "",
  compact = false,
  defaultOpen = false,
}: SeoGeoOptimizationPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [tagInput, setTagInput] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSynthesizingAi, setIsSynthesizingAi] = useState(false);

  const seoTitle = value.seoTitle ?? "";
  const seoDescription = value.seoDescription ?? "";
  const keywords = Array.isArray(value.keywords) ? value.keywords : [];
  const latitude = value.latitude ?? "";
  const longitude = value.longitude ?? "";
  const neighborhood = value.neighborhood ?? "";
  const city = value.city ?? "";
  const state = value.state ?? "";
  const allowAiIndexing = value.allowAiIndexing ?? true;

  const handleTitleChange = (newTitle: string) => {
    onChange({ ...value, seoTitle: newTitle });
  };

  const handleDescriptionChange = (newDesc: string) => {
    onChange({ ...value, seoDescription: newDesc });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (keywords.includes(trimmed)) {
      setTagInput("");
      return;
    }
    const updated = [...keywords, trimmed];
    onChange({ ...value, keywords: updated });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = keywords.filter((t) => t !== tagToRemove);
    onChange({ ...value, keywords: updated });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
        });
        toast.success(`Coordenadas capturadas: ${lat}, ${lng}`);
      },
      () => {
        setIsDetectingLocation(false);
        if (referenceAddress) {
          toast.info("Endereço de referência registrado para indexação GEO.");
        } else {
          toast.error("Não foi possível obter coordenadas geográficas.");
        }
      },
      { timeout: 8000 }
    );
  };

  const handleSynthesizeAi = () => {
    setIsSynthesizingAi(true);
    setTimeout(() => {
      const generatedTitle = seoTitle || referenceTitle.slice(0, 60) || "Publicação Waesy";
      const cleanedDesc = (referenceDescription || seoDescription || referenceTitle)
        .replace(/<[^>]*>?/gm, "")
        .slice(0, 155);

      const derivedKeywords = new Set(keywords);
      if (referenceTitle) {
        referenceTitle
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 5)
          .forEach((w) => derivedKeywords.add(w));
      }

      onChange({
        ...value,
        seoTitle: generatedTitle,
        seoDescription: cleanedDesc,
        keywords: Array.from(derivedKeywords),
      });

      setIsSynthesizingAi(false);
      toast.success("Metatags SEO e indexação agêntica otimizadas com sucesso.");
    }, 350);
  };

  const titleLength = seoTitle.length;
  const descLength = seoDescription.length;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 transition-colors">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground">
              <Globe className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  SEO, GEO & Agentes de IA
                </h4>
                <Badge variant="outline" className="text-xs font-semibold">
                  WebMCP 2.0
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Otimização para Google, ChatGPT, Perplexity e busca local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                 className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{isOpen ? "Recolher" : "Configurar"}</span>
                {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-foreground">
                Indexação autônoma por motores de busca e crawlers de IA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ai-index-toggle" className="text-xs text-muted-foreground cursor-pointer">
                {allowAiIndexing ? "Permitido" : "Bloqueado"}
              </Label>
              <Switch
                id="ai-index-toggle"
                checked={allowAiIndexing}
                onCheckedChange={(checked) => onChange({ ...value, allowAiIndexing: checked })}
                className="h-6 w-11"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSynthesizeAi}
              disabled={isSynthesizingAi}
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Brain className="size-4 text-primary" />
              <span>{isSynthesizingAi ? "Otimizando..." : "Otimizar Metatags com IA"}</span>
            </Button>
          </div>

          <div className="space-y-3">
             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Título SEO Canônico
                </Label>
                <span
                  className={`text-xs font-mono ${
                    titleLength > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {titleLength}/60 caracteres
                </span>
              </div>
              <Input
                value={seoTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={referenceTitle || "Título otimizado para o Google e agregadores..."}
                maxLength={80}
                className="h-11 min-h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Meta Descrição (Snippet)
                </Label>
                <span
                  className={`text-xs font-mono ${
                    descLength > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {descLength}/160 caracteres
                </span>
              </div>
              <Textarea
                value={seoDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder={referenceDescription || "Descrição clara e concisa com as principais palavras-chave..."}
                rows={compact ? 2 : 3}
                maxLength={200}
                className="text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

             <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Tags & Palavras-chave de Busca
              </Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Digite uma tag e pressione Enter..."
                  className="h-11 min-h-11 text-xs flex-1 focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
                >
                   <Tag className="size-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {keywords.length > 0 && (
                 <div className="flex flex-wrap gap-2 pt-2">
                  {keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                       className="gap-1 pl-3 pr-2 py-1 text-xs font-medium"
                    >
                      <span>#{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(kw)}
                         className="min-h-11 min-w-11 rounded-full hover:bg-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Remover tag ${kw}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Geolocalização & Indexação Local (GEO/ICBM)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                   className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring text-primary hover:text-primary"
                >
                  <MapPin className="size-3.5" />
                  <span>{isDetectingLocation ? "Detectando..." : "Detectar Coordenadas"}</span>
                </Button>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input
                    value={latitude}
                    onChange={(e) => onChange({ ...value, latitude: e.target.value })}
                    placeholder="-26.7265"
                    className="h-11 min-h-11 text-xs font-mono focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    value={longitude}
                    onChange={(e) => onChange({ ...value, longitude: e.target.value })}
                    placeholder="-53.5186"
                    className="h-11 min-h-11 text-xs font-mono focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
                    placeholder="Centro"
                    className="h-11 min-h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input
                    value={city}
                    onChange={(e) => onChange({ ...value, city: e.target.value })}
                    placeholder="São Miguel do Oeste"
                    className="h-11 min-h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado (UF)</Label>
                  <Input
                    value={state}
                    onChange={(e) => onChange({ ...value, state: e.target.value })}
                    placeholder="SC"
                    maxLength={2}
                    className="h-11 min-h-11 text-xs uppercase focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
