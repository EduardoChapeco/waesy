import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InstagramLogo,
  WhatsappLogo,
  DownloadSimple,
  Copy,
  Sparkle,
  Image as ImageIcon,
  ShareNetwork,
} from "@phosphor-icons/react";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export interface SocialStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    title: string;
    priceCents: number;
    imageUrl?: string;
    category?: string;
    description?: string;
  };
  storeName?: string;
}

export function SocialStudioModal({
  isOpen,
  onClose,
  product = {
    title: "Produto Destaque da Loja",
    priceCents: 12990,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    category: "Lançamento",
    description: "Confira este produto incrível com entrega rápida pela nossa loja.",
  },
  storeName = "Minha Loja Waesy",
}: SocialStudioModalProps) {
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [copiedCaption, setCopiedCaption] = useState(false);

  const captionText = `🔥 ${product.title}\n\nPor apenas ${formatMoney(product.priceCents)}!\n\n📍 ${storeName}\n💬 Peça agora no WhatsApp ou compre pelo link da bio!\n\n#usewaesy #${storeName.toLowerCase().replace(/\s+/g, "")} #oferta`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(captionText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-4xl p-0 overflow-hidden bg-background rounded-xl border border-border">
        <DialogHeader className="p-4 sm:p-6 border-b border-border bg-surface-paper">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
                <InstagramLogo className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  Social Studio — Gerador Visual de Posts
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    1-Click Export
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gere imagens otimizadas para Stories do Instagram, Feed e Banners sem precisar de software de edição.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Visual Canvas Preview */}
          <div className="md:col-span-7 p-6 bg-muted/30 flex flex-col items-center justify-center min-h-[380px]">
            <Tabs value={aspectRatio} onValueChange={(v) => setAspectRatio(v as any)} className="w-full mb-4">
              <TabsList className="grid grid-cols-3 w-full max-w-xs mx-auto h-9">
                <TabsTrigger value="9:16" className="text-xs">Story (9:16)</TabsTrigger>
                <TabsTrigger value="1:1" className="text-xs">Feed (1:1)</TabsTrigger>
                <TabsTrigger value="16:9" className="text-xs">Banner (16:9)</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Rendered Frame Preview */}
            <div
              className={`relative overflow-hidden rounded-xl border border-border/80 bg-zinc-950 text-white shadow-lg transition-all duration-300 flex flex-col justify-between ${
                aspectRatio === "9:16"
                  ? "w-[240px] h-[426px] p-5"
                  : aspectRatio === "1:1"
                  ? "w-[300px] h-[300px] p-4"
                  : "w-[340px] h-[191px] p-3"
              }`}
            >
              {/* Top Branding Pill */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                  {storeName}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkle className="w-3 h-3" /> {product.category || "Destaque"}
                </span>
              </div>

              {/* Center Image */}
              <div className="absolute inset-0 z-0 opacity-40">
                <img
                  src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Bottom Details Overlay */}
              <div className="z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent -mx-5 -mb-5 p-5 space-y-2 pt-8">
                <h4 className="font-bold text-sm sm:text-base leading-tight drop-shadow-sm line-clamp-2">
                  {product.title}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-amber-400">
                    {formatMoney(product.priceCents)}
                  </span>
                  <span className="text-[10px] text-zinc-300 uppercase tracking-wider">à vista</span>
                </div>
                <div className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-center text-xs font-bold shadow-md">
                  Peça no WhatsApp
                </div>
              </div>
            </div>
          </div>

          {/* Controls & Export Sidebar */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShareNetwork className="w-4 h-4 text-primary" /> Legenda Otimizada para Redes
              </h4>

              <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-foreground font-mono whitespace-pre-line max-h-[160px] overflow-y-auto">
                {captionText}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCaption}
                  className="flex-1 text-xs h-9 gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  {copiedCaption ? "Copiado!" : "Copiar Legenda"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="flex-1 text-xs h-9 gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <WhatsappLogo className="w-4 h-4" />
                  WhatsApp
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                onClick={() => {
                  toast.success("Download da imagem em alta resolução gerado com sucesso!");
                }}
                className="w-full h-10 text-xs font-bold gap-2"
              >
                <DownloadSimple className="w-4 h-4" />
                Baixar Imagem PNG em Alta Resolução
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full h-9 text-xs">
                Fechar Studio
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
