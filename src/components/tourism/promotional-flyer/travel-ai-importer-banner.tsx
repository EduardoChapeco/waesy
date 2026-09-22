/**
 * travel-ai-importer-banner.tsx — Zona de Importação Rápida por Print, Flyer ou PDF
 * Extração com IA (executeUnifiedAiCall) e Preenchimento Automático do CMS com Ctrl+V.
 */

import React, { useState, useEffect } from "react";
import { Sparkles, UploadCloud, Copy, Loader2, Check, ArrowRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseTravelMediaAI, type ExtractedTravelAdDTO } from "@/services/travel-ai-extractor.functions";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";

interface TravelAiImporterBannerProps {
  onExtracted: (data: ExtractedTravelAdDTO) => void;
  className?: string;
}

export function TravelAiImporterBanner({ onExtracted, className = "" }: TravelAiImporterBannerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastExtractedTitle, setLastExtractedTitle] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 15MB.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        const mime = file.type || "image/jpeg";

        toast.loading("Analisando folder/print com IA...", { id: "ai-parse" });
        const res = await parseTravelMediaAI({
          data: {
            fileBase64: base64,
            fileMime: mime,
            fileName: file.name,
          },
        });

        if (res.success && res.data) {
          toast.success(`Dados extraídos: ${res.data.destination_city || res.data.title}!`, { id: "ai-parse" });
          setLastExtractedTitle(res.data.title);
          onExtracted(res.data);
        } else {
          toast.error("Não foi possível identificar informações no material.", { id: "ai-parse" });
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("[TravelAiImporterBanner] Erro ao processar:", err);
      toast.error("Erro na leitura inteligente do documento.", { id: "ai-parse" });
      setIsAnalyzing(false);
    }
  };

  // Suporte a Ctrl+V na janela
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const media = await extractMediaFromClipboard(e);
      if (media && media.length > 0) {
        const file = media[0].file;
        if (file) {
          toast.info("Print colado da área de transferência! Processando...");
          processFile(file);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div
      className={`rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-4 sm:p-5 transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
              <Sparkles className="size-4" />
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              Criação Automática por Imagem, Print ou PDF
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/20">
              Ctrl+V Ativo
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cole um print do WhatsApp (Ctrl+V) ou suba o folder de uma operadora para a IA preencher o anúncio automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={isAnalyzing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
              className="hidden"
            />
            <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-primary/30 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-2xs">
              {isAnalyzing ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <UploadCloud className="size-3.5 text-primary" />
              )}
              <span>{isAnalyzing ? "Lendo material..." : "Subir Print / Folder"}</span>
            </div>
          </label>
        </div>
      </div>

      {lastExtractedTitle && (
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="size-3.5" /> Último anúncio extraído: <strong>{lastExtractedTitle}</strong>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            Campos aplicados no formulário
          </span>
        </div>
      )}
    </div>
  );
}
