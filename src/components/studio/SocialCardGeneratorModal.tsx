import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Share2, Star, Smartphone, Square, Monitor, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SocialCardFormat = "stories" | "feed" | "threads";
export type SocialCardNiche = "product" | "travel" | "classified" | "news";

export interface SocialCardData {
  title: string;
  subtitle?: string;
  priceFormatted?: string;
  badge?: string;
  imageUrl?: string;
  storeName?: string;
  niche?: SocialCardNiche;
}

interface SocialCardGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SocialCardData;
}

const FORMAT_CONFIGS = {
  stories: {
    label: "Stories Vertical (9:16)",
    ratioLabel: "9:16",
    width: 1080,
    height: 1920,
    icon: Smartphone,
  },
  feed: {
    label: "Feed Quadrado (1:1)",
    ratioLabel: "1:1",
    width: 1080,
    height: 1080,
    icon: Square,
  },
  threads: {
    label: "Microblog e Notícias (16:9)",
    ratioLabel: "16:9",
    width: 1200,
    height: 675,
    icon: Monitor,
  },
};

export function SocialCardGeneratorModal({
  open,
  onOpenChange,
  data,
}: SocialCardGeneratorModalProps) {
  const [format, setFormat] = useState<SocialCardFormat>("stories");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Renderiza no Canvas sempre que o formato ou os dados mudarem
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = FORMAT_CONFIGS[format];
    canvas.width = cfg.width;
    canvas.height = cfg.height;

    // Fundo elegante escuro editorial
    const gradient = ctx.createLinearGradient(0, 0, 0, cfg.height);
    gradient.addColorStop(0, "#121214");
    gradient.addColorStop(0.6, "#18181b");
    gradient.addColorStop(1, "#09090b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cfg.width, cfg.height);

    // Borda interna sutil HIG
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, cfg.width - 64, cfg.height - 64);

    const drawContent = (loadedImg?: HTMLImageElement) => {
      // 1. Imagem de Destaque
      if (loadedImg) {
        ctx.save();
        if (format === "stories") {
          // Imagem no terço superior para Stories
          const imgH = cfg.height * 0.52;
          ctx.beginPath();
          ctx.roundRect(64, 120, cfg.width - 128, imgH, 32);
          ctx.clip();
          ctx.drawImage(loadedImg, 64, 120, cfg.width - 128, imgH);
        } else if (format === "feed") {
          // Imagem central no Feed
          const imgH = cfg.height * 0.55;
          ctx.beginPath();
          ctx.roundRect(64, 100, cfg.width - 128, imgH, 24);
          ctx.clip();
          ctx.drawImage(loadedImg, 64, 100, cfg.width - 128, imgH);
        } else {
          // Threads/Twitter split horizontal
          const imgW = (cfg.width - 128) * 0.45;
          ctx.beginPath();
          ctx.roundRect(64, 64, imgW, cfg.height - 128, 20);
          ctx.clip();
          ctx.drawImage(loadedImg, 64, 64, imgW, cfg.height - 128);
        }
        ctx.restore();
      }

      // 2. Badge de Nicho / Loja
      const badgeY = format === "stories" ? cfg.height * 0.60 : format === "feed" ? cfg.height * 0.70 : 120;
      const textX = format === "threads" && loadedImg ? cfg.width * 0.50 : 64;

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const badgeText = data.badge || data.storeName || "Waesy Oficial";
      ctx.fillText(badgeText.toUpperCase(), textX, badgeY);

      // 3. Título Principal
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${format === "stories" ? 64 : format === "feed" ? 54 : 44}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`;
      
      const titleWords = data.title.split(" ");
      let line = "";
      let currentY = badgeY + (format === "stories" ? 80 : 70);
      const maxLineWidth = format === "threads" && loadedImg ? cfg.width * 0.45 : cfg.width - 128;

      for (const word of titleWords) {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && line !== "") {
          ctx.fillText(line, textX, currentY);
          line = word + " ";
          currentY += (format === "stories" ? 80 : 64);
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, textX, currentY);

      // 4. Preço em Destaque
      if (data.priceFormatted) {
        currentY += 80;
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 58px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        ctx.fillText(data.priceFormatted, textX, currentY);
      }

      // 5. Rodapé da Plataforma (Watermark sóbria)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      const footerY = cfg.height - 70;
      ctx.fillText("Disponível na plataforma Waesy • Saiba mais no link", textX, footerY);
    };

    if (data.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = data.imageUrl;
      img.onload = () => drawContent(img);
      img.onerror = () => drawContent();
    } else {
      drawContent();
    }
  }, [open, format, data]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `social-card-${format}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem exportada com sucesso!");
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setIsCopied(true);
        toast.success("Imagem copiada para a área de transferência!");
        setTimeout(() => setIsCopied(false), 2000);
      });
    } catch {
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!navigator.share) {
      handleDownload();
      return;
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "post.png", { type: "image/png" });
      try {
        await navigator.share({
          title: data.title,
          text: `${data.title} ${data.priceFormatted ? `— ${data.priceFormatted}` : ""}`,
          files: [file],
        });
      } catch {
        // Usuário cancelou
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Star className="size-4 text-amber-500" /> Gerador Social Studio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere cards gráficos em alta resolução prontos para Stories, Feed ou Microblog.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de Formato (Apple HIG) */}
        <div className="grid grid-cols-3 gap-2 py-2">
          {(Object.keys(FORMAT_CONFIGS) as SocialCardFormat[]).map((f) => {
            const item = FORMAT_CONFIGS[f];
            const Icon = item.icon;
            const isSelected = format === f;

            return (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "border-foreground bg-foreground/5 shadow-xs"
                    : "border-border/60 hover:border-border text-muted-foreground"
                )}
              >
                <Icon className={cn("size-4", isSelected ? "text-foreground" : "text-muted-foreground")} />
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {item.ratioLabel}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Preview do Canvas */}
        <div className="flex items-center justify-center p-4 bg-muted/30 rounded-2xl border border-border/60 min-h-[320px] max-h-[440px] overflow-hidden">
          <canvas
            ref={canvasRef}
            className={cn(
              "shadow-xl rounded-xl object-contain max-h-[380px] w-auto transition-all",
              format === "stories" ? "aspect-[9/16]" : format === "feed" ? "aspect-square" : "aspect-[16/9]"
            )}
          />
        </div>

        {/* Ações Diretas */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Button
            variant="outline"
            className="h-10 rounded-xl text-xs font-medium cursor-pointer"
            onClick={handleCopy}
          >
            {isCopied ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
            {isCopied ? "Copiado!" : "Copiar Imagem"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-xl text-xs font-medium cursor-pointer"
              onClick={handleNativeShare}
            >
              <Share2 className="size-3.5 mr-1" /> Compartilhar
            </Button>
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background cursor-pointer"
              onClick={handleDownload}
            >
              <Download className="size-3.5 mr-1" /> Baixar PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SocialCardGeneratorModal;
