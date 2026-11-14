import { useState, useRef } from "react";
import { Download, Share2, Copy, Check, X, Star, Clock, Users, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { MinedRecipeDTO } from "@/services/mining.functions";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { downloadCanvasAsPng, renderElementToCanvasSafe } from "@/lib/canvas/html2canvas-safe";

interface RecipeStoryModalProps {
  recipe: MinedRecipeDTO;
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeStoryModal({ recipe, isOpen, onClose }: RecipeStoryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const recipeUrl = typeof window !== "undefined"
    ? `${window.location.origin}/receitas/${recipe.id}`
    : `https://usewaesy.com/receitas/${recipe.id}`;

  const qrImageUrl = generateQrCodeDataUri(recipeUrl, { border: 1 });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(recipeUrl);
      setCopied(true);
      toast.success("Link da receita copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleDownloadStory = async () => {
    if (!cardRef.current) return;
    try {
      setIsGenerating(true);
      toast.info("Renderizando Story 9:16...");

      const computedBg =
        typeof window !== "undefined"
          ? window.getComputedStyle(cardRef.current).backgroundColor
          : undefined;
      const canvas = await renderElementToCanvasSafe(cardRef.current, {
        scale: 2,
        backgroundColor: computedBg && computedBg !== "rgba(0, 0, 0, 0)" ? computedBg : undefined, // design-lint-ignore DL-01 reason:"Verifica transparencia padrao computada antes de capturar story canvas" expiry:"2027-12-31"
      });

      const safeTitle = recipe.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30);
      downloadCanvasAsPng(canvas, `receita-story-${safeTitle}.png`);

      toast.success("Story baixado com sucesso!");
    } catch (err) {
      console.error("[handleDownloadStory] Error:", err);
      toast.error("Erro ao gerar imagem para o Story.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-4 sm:p-6 bg-card border-border/60 rounded-lg overflow-hidden flex flex-col max-h-(--spacing-screen-90,90vh)">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Star className="size-4 text-primary" />
              Story Instagram (9:16)
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Canvas Container */}
        <div className="flex-1 overflow-y-auto py-2 flex justify-center">
          {/* 9:16 Canvas Card */}
          <div
            ref={cardRef}
            className="w-75 h-133 bg-zinc-950 text-foreground rounded-lg p-5 flex flex-col justify-between relative overflow-hidden shadow-overlay shrink-0"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {/* Header Brand */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-card text-zinc-950 flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <span className="text-2xs font-bold tracking-wider uppercase text-zinc-300">
                  Waesy Gastronomia
                </span>
              </div>
              <span className="text-2xs font-mono uppercase bg-zinc-800/90 text-zinc-300 px-2 py-1 rounded-full">
                {recipe.category || "Receita"}
              </span>
            </div>

            {/* Imagem de Destaque */}
            <div className="relative w-full h-53 rounded-lg overflow-hidden my-2 bg-zinc-900 border border-zinc-800">
              <img
                src={
                  recipe.cover_image_url ||
                  "/brand-logo.png"
                }
                alt={recipe.title}
                crossOrigin="anonymous"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-zinc-950/60" />
              {recipe.total_time && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-zinc-900/90 px-2 py-1 rounded-md text-2xs font-mono text-zinc-200">
                  <Clock className="size-3 text-warning-strong" />
                  {recipe.total_time}
                </div>
              )}
            </div>

            {/* Título e Ingredientes Chave */}
            <div className="space-y-2 relative z-10 flex-1">
              <h3 className="text-base font-bold leading-snug line-clamp-2 text-foreground">
                {recipe.title}
              </h3>

              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="space-y-1">
                  <span className="text-2xs uppercase font-bold text-neutral-400 tracking-wider">
                    Principais Ingredientes:
                  </span>
                  <div className="space-y-1">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                      <p key={i} className="text-2xs text-neutral-300 line-clamp-1 flex items-center gap-1">
                        <span className="size-1 rounded-full bg-neutral-500 shrink-0" />
                        {ing}
                      </p>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <p className="text-3xs text-neutral-400 italic">
                        +{recipe.ingredients.length - 3} outros ingredientes...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com QR Code Minimalista */}
            <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between relative z-10 bg-zinc-900/50 p-3 rounded-lg">
              <div className="space-y-1">
                <p className="text-2xs font-bold text-foreground">
                  Veja o modo de preparo
                </p>
                <p className="text-3xs text-zinc-400">
                  Aponte a câmera para o QR Code
                </p>
              </div>
              <div className="size-12 rounded-lg bg-card p-1 overflow-hidden shrink-0">
                <img
                  src={qrImageUrl}
                  alt="QR Code da receita"
                  crossOrigin="anonymous"
                  className="size-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDownloadStory}
            disabled={isGenerating}
            variant="default"
            className="flex-1 rounded-lg h-9 text-xs font-semibold gap-2 min-h-11 sm:min-h-0"
          >
            <Download className="size-3.5" />
            {isGenerating ? "Gerando Story..." : "Baixar Imagem (Story)"}
          </Button>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="rounded-lg h-9 text-xs font-medium gap-2 min-h-11 sm:min-h-0"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
