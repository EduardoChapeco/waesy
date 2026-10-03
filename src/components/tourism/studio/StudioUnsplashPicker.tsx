import { useState, useRef, useCallback } from "react";
import { Upload, Globe, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  agencyId: string;
  proposalId: string;
  slot: string;
  itemId?: string;
  onImageSelected: (url: string) => void;
  defaultQuery?: string;
};

export function StudioAssetPicker({
  agencyId,
  proposalId,
  slot,
  onImageSelected,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }
    setUploading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadMediaUniversal({
        data: {
          fileName: file.name,
          fileType: file.type,
          base64Data,
          bucket: "public_media",
          folder: `proposals/${agencyId || "general"}/${proposalId || "assets"}/${slot}`,
        },
      });
      if (res?.url) {
        onImageSelected(res.url);
        toast.success("Imagem enviada com sucesso!");
      }
    } catch (err: any) {
      toast.error(`Falha no upload: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setUploading(false);
    }
  }, [agencyId, proposalId, slot, onImageSelected]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
    const pastedText = e.clipboardData?.getData("text/plain")?.trim();
    if (pastedText && /^https?:\/\//i.test(pastedText)) {
      e.preventDefault();
      onImageSelected(pastedText);
      toast.success("URL de mídia aplicada!");
    }
  }, [processFile, onImageSelected]);

  function handleApplyUrl() {
    const trimmed = externalUrl.trim();
    if (!trimmed.startsWith("http://") && (!trimmed.startsWith("https://"))) {
      toast.error("Insira uma URL válida iniciando com https://");
      return;
    }
    onImageSelected(trimmed);
    setExternalUrl("");
    toast.success("URL de mídia aplicada!");
  }

  return (
    <div className="flex flex-col gap-3 p-1 outline-hidden" onPaste={handlePaste} tabIndex={0}>
      <div className="flex gap-1 border-b border-border/60 pb-2">
        <Button type="button" size="sm" variant={activeTab === "upload" ? "default" : "ghost"} onClick={() => setActiveTab("upload")}
          className="text-xs h-11 sm:h-9 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Upload className="size-4" /> Enviar Arquivo
        </Button>
        <Button type="button" size="sm" variant={activeTab === "url" ? "default" : "ghost"} onClick={() => setActiveTab("url")}
          className="text-xs h-11 sm:h-9 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Globe className="size-4" /> URL Direta
        </Button>
      </div>

      {activeTab === "upload" ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()} // focus-visible:ring-2
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="h-32 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-2 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors p-4 text-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-primary" />
          ) : (
            <>
              <ImageIcon className="size-6 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Clique para enviar ou cole (Ctrl+V)</p>
              <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 10MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
        </div>
      ) : (
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyUrl()}
            className="text-xs h-11 bg-background flex-1"
          />
          <Button type="button" onClick={() => handleApplyUrl()} className="h-11 px-4 text-xs font-bold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}

export { StudioAssetPicker as StudioUnsplashPicker };
