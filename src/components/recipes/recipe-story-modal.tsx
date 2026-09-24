import { useState, useRef } from "react";
import { Download, Share2, Copy, Check, X, Sparkles, Clock, Users, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import type { MinedRecipeDTO } from "@/services/mining.functions";

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

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(recipeUrl)}`;

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

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#09090b",
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeTitle = recipe.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30);
      link.download = `receita-story-${safeTitle}.png`;
      link.href = image;
      link.click();

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
      <DialogContent className="max-w-md w-full p-4 sm:p-6 bg-card border-border/60 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Story Instagram (9:16)
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Canvas Container */}
        <div className="flex-1 overflow-y-auto py-2 flex justify-center">
          {/* 9:16 Canvas Card */}
          <div
            ref={cardRef}
            className="w-[300px] h-[533px] bg-zinc-950 text-white rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl shrink-0"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {/* Header Brand */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-md bg-white text-zinc-950 flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-300">
                  Waesy Gastronomia
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-zinc-800/90 text-zinc-300 px-2 py-0.5 rounded-full">
                {recipe.category || "Receita"}
              </span>
            </div>

            {/* Imagem de Destaque */}
            <div className="relative w-full h-[210px] rounded-xl overflow-hidden my-2 bg-zinc-900 border border-zinc-800">
              <img
                src={
                  recipe.cover_image_url ||
                  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=600&q=80"
                }
                alt={recipe.title}
                crossOrigin="anonymous"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
              {recipe.total_time && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-zinc-900/90 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-200">
                  <Clock className="size-3 text-amber-400" />
                  {recipe.total_time}
                </div>
              )}
            </div>

            {/* Título e Ingredientes Chave */}
            <div className="space-y-2 relative z-10 flex-1">
              <h3 className="text-base font-bold leading-snug line-clamp-2 text-white">
                {recipe.title}
              </h3>

              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Principais Ingredientes:
                  </span>
                  <div className="space-y-0.5">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                      <p key={i} className="text-[10px] text-zinc-300 line-clamp-1 flex items-center gap-1">
                        <span className="size-1 rounded-full bg-zinc-500 shrink-0" />
                        {ing}
                      </p>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <p className="text-[9px] text-zinc-400 italic">
                        +{recipe.ingredients.length - 3} outros ingredientes...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer com QR Code Minimalista */}
            <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between relative z-10 bg-zinc-900/50 p-2.5 rounded-xl">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-white">
                  Veja o modo de preparo
                </p>
                <p className="text-[9px] text-zinc-400">
                  Aponte a câmera para o QR Code
                </p>
              </div>
              <div className="size-12 rounded-lg bg-white p-0.5 overflow-hidden shrink-0">
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
            className="flex-1 rounded-xl h-9 text-xs font-semibold gap-1.5"
          >
            <Download className="size-3.5" />
            {isGenerating ? "Gerando Story..." : "Baixar Imagem (Story)"}
          </Button>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="rounded-xl h-9 text-xs font-medium gap-1.5"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
