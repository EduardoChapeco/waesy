import { useState, useRef } from "react";
import { Upload, X, Loader2, Crop, ImagePlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import type { ProportionalAppIconSetBlobs } from "@/lib/crop-image";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";
import { ingestExternalMediaUrl } from "@/services/storage.functions";

export type AspectRatioPreset = "square" | "classified" | "widescreen" | "banner" | "cover" | "header" | "free" | "portrait" | "compact_banner";

const PRESET_ASPECT_RATIOS: Record<AspectRatioPreset, number | undefined> = {
 square: 1, // 1:1 (Produtos, Logos, Avatars)
 classified: 4 / 3, // 4:3 (Classificados, Carros, Imóveis)
 widescreen: 16 / 9, // 16:9 (Panorâmico moderno, Banners delicados de Bio/Destaque)
 cover: 3 / 1, // 3:1 (Capa de Perfil de Membro)
 compact_banner: 3 / 1, // 3:1 (Mini-Banner Bio Link Discreto)
 banner: 21 / 9, // 21:9 (Top Banners Hero de Loja)
 header: 4 / 1, // 4:1 (Banners Panorâmicos de Topo)
 portrait: 9 / 16, // 9:16 (Stories, Reels, Mobile Portrait)
 free: undefined, // Livre
};

export interface AppIconBundleUrls {
  logoSquareUrl: string;
  icon192Url: string;
  icon512Url: string;
  maskable512Url: string;
}

export interface ImageUploadProps {
 value?: string | null;
 onChange: (url: string) => void;
 onRemove?: () => void;
 bucket?: "product-media" | "cms-media" | "receipts" | "identity-vault" | "avatars" | "store-assets" | "destination-media" | string;
 className?: string;
 variant?: "default" | "minimal" | "avatar" | "banner";
 aspect?: number;
 aspectPreset?: AspectRatioPreset;
 label?: string;
 helperText?: string;
 showExternalUrlOption?: boolean;
 allowAspectSwitch?: boolean;
 appLogoMode?: boolean;
 initialLogoBgColor?: string;
 onAppIconBundleUploaded?: (urls: AppIconBundleUrls) => void;
}

export function ImageUpload({
 value,
 onChange,
 onRemove,
 bucket = "cms-media",
 className,
 variant = "default",
 aspect,
 aspectPreset = "square",
 label,
 helperText,
 showExternalUrlOption = true,
 allowAspectSwitch = false,
 appLogoMode = false,
 initialLogoBgColor,
 onAppIconBundleUploaded,
}: ImageUploadProps) {
 const [isUploading, setIsUploading] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 // Resolved aspect ratio
 const effectiveAspect = aspect !== undefined ? aspect : PRESET_ASPECT_RATIOS[aspectPreset];

 // Crop state
 const [cropModalOpen, setCropModalOpen] = useState(false);
 const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
 const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);

 const [showManualUrl, setShowManualUrl] = useState(false);
 const [manualUrl, setManualUrl] = useState("");

 const isAvatar = variant === "avatar";

 const handleApplyManualUrl = async (urlToApply?: string) => {
 const rawUrl = (urlToApply || manualUrl).trim();
 if (!rawUrl) return;

 if (!/^https?:\/\//i.test(rawUrl)) {
 toast.error("Insira uma URL válida iniciando com http:// ou https://");
 return;
 }

 setIsUploading(true);
 try {
   const ingested = await ingestExternalMediaUrl({
     data: { externalUrl: rawUrl, bucket, folder: "images" },
   });
   onChange(ingested.url);
   setShowManualUrl(false);
   setManualUrl("");
   toast.success("Imagem importada e armazenada com sucesso!");
 } catch (error) {
   const message = error instanceof Error ? error.message : "Falha ao importar a imagem.";
   toast.error(message);
 } finally {
   setIsUploading(false);
 }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setCurrentImageFile(file);
 const reader = new FileReader();
 reader.readAsDataURL(file);
 reader.onload = () => {
 setCurrentImageSrc(reader.result as string);
 setCropModalOpen(true);
 };
 reader.onerror = () => toast.error("Erro ao processar arquivo local");

 // Reset input
 if (inputRef.current) inputRef.current.value = "";
 };

 const handlePaste = async (e: React.ClipboardEvent) => {
 const items = await extractMediaFromClipboard(e);
 if (items && items.length > 0) {
 e.preventDefault();
 const item = items[0];
 setCurrentImageFile(item.file);
 const reader = new FileReader();
 reader.readAsDataURL(item.file);
 reader.onload = () => {
 setCurrentImageSrc(reader.result as string);
 setCropModalOpen(true);
 };
 reader.onerror = () => toast.error("Erro ao processar imagem colada.");
 toast.success("Imagem colada da área de transferência!");
 return;
 }

 const pastedText = e.clipboardData?.getData("text/plain")?.trim();
 if (pastedText && /^https?:\/\//i.test(pastedText)) {
 e.preventDefault();
 void handleApplyManualUrl(pastedText);
 }
 };

  const uploadBlobVariant = async (blob: Blob, suffix: string): Promise<string> => {
    const fileName = `${suffix}-${Date.now()}.png`;
    try {
      const { getSignedUploadUrl } = await import("@/services/storage.functions");
      const res = await getSignedUploadUrl({
        data: { fileName, bucket: bucket as any, contentType: "image/png" },
      });
      if (res.signedUrl) {
        const uploadRes = await fetch(res.signedUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${res.token}`,
            "Content-Type": "image/png",
          },
          body: blob,
        });
        if (uploadRes.ok && res.publicUrl) return res.publicUrl;
      }
    } catch {
      // fallback para server upload
    }
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const { uploadMediaUniversal } = await import("@/services/storage.functions");
    const fallbackRes = await uploadMediaUniversal({
      data: {
        fileName,
        fileType: "image/png",
        base64Data,
        bucket,
        folder: "app-icons",
      },
    });
    if (!fallbackRes?.url) throw new Error("Falha ao enviar variante de ícone");
    return fallbackRes.url;
  };

  const handleAppIconBundle = async (bundle: ProportionalAppIconSetBlobs) => {
    if (!onAppIconBundleUploaded) return;
    setIsUploading(true);
    try {
      const [logoSquareUrl, icon192Url, icon512Url, maskable512Url] = await Promise.all([
        uploadBlobVariant(bundle.logoSquareBlob, "logo-square"),
        uploadBlobVariant(bundle.icon192Blob, "icon-192"),
        uploadBlobVariant(bundle.icon512Blob, "icon-512"),
        uploadBlobVariant(bundle.maskable512Blob, "icon-maskable-512"),
      ]);
      onChange(logoSquareUrl);
      onAppIconBundleUploaded({
        logoSquareUrl,
        icon192Url,
        icon512Url,
        maskable512Url,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Falha ao enviar variações proporcionais da logo PWA.";
      toast.error(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

 const handleCropComplete = async (croppedBase64: string) => {
 const outputMimeType = croppedBase64.startsWith("data:image/webp") ? "image/webp" : "image/png";
 const outputExt = outputMimeType === "image/webp" ? "webp" : "png";
 const rawBaseName = (currentImageFile?.name || `crop-${Date.now()}`).replace(/\.[^/.]+$/, "");
 const effectiveName = `${rawBaseName}.${outputExt}`;
 setIsUploading(true);
 try {
 try {
 const { getSignedUploadUrl } = await import("@/services/storage.functions");
 const res = await getSignedUploadUrl({
 data: {
 fileName: effectiveName,
 bucket: bucket as any,
 contentType: outputMimeType,
 },
 });

 if (res.signedUrl) {
 // Convert base64 to Blob for PUT request
 const base64Data = croppedBase64.split(",")[1];
 const byteCharacters = atob(base64Data);
 const byteArrays = [];
 for (let offset = 0; offset < byteCharacters.length; offset += 512) {
 const slice = byteCharacters.slice(offset, offset + 512);
 const byteNumbers = new Array(slice.length);
 for (let i = 0; i < slice.length; i++) {
 byteNumbers[i] = slice.charCodeAt(i);
 }
 const byteArray = new Uint8Array(byteNumbers);
 byteArrays.push(byteArray);
 }
 const blob = new Blob(byteArrays, { type: outputMimeType });

 // Upload directly to Supabase Storage via Signed URL
 const uploadRes = await fetch(res.signedUrl, {
 method: "PUT",
 headers: {
 Authorization: `Bearer ${res.token}`,
 "Content-Type": outputMimeType,
 },
 body: blob,
 });

 if (uploadRes.ok && res.publicUrl) {
 onChange(res.publicUrl);
 toast.success("Imagem recortada e salva com sucesso!");
 return;
 }
 }
 } catch (signedErr) {
 console.warn("[ImageUpload] Signed URL falhou, usando fallback direto base64:", signedErr);
 }

 // Fallback resiliente via Server Function (service_role)
 const { uploadMediaUniversal } = await import("@/services/storage.functions");
 const fallbackRes = await uploadMediaUniversal({
 data: {
 fileName: effectiveName,
 fileType: outputMimeType,
 base64Data: croppedBase64,
 bucket,
 folder: "uploads",
 },
 });

 if (fallbackRes?.url) {
 onChange(fallbackRes.url);
 toast.success("Imagem recortada e salva com sucesso!");
 } else {
 throw new Error("Falha ao processar upload da imagem no servidor");
 }
 } catch (error: unknown) {
 toast.error(
 (error instanceof Error ? error.message : String(error)) ||
 "Erro ao fazer upload da imagem",
 );
 } finally {
 setIsUploading(false);
 }
 };

 const getPresetLabel = () => {
 switch (aspectPreset) {
 case "square":
 return "1:1 (Quadrado)";
 case "classified":
 return "4:3 (Classificados)";
 case "widescreen":
 return "16:9 (Panorâmico)";
 case "cover":
 return "3:1 (Capa de Perfil)";
 case "compact_banner":
 return "3:1 (Mini-Banner Discreto)";
 case "banner":
 return "21:9 (Banner de Loja)";
 case "header":
 return "4:1 (Cabeçalho)";
 default:
 return "Ajustável";
 }
 };

 const renderUrlDrawer = () => {
 if (!showExternalUrlOption || isAvatar) return null;
 return (
 <div className="space-y-2">
 <div className="flex justify-end">
 <button
 type="button"
 onClick={() => setShowManualUrl((prev) => !prev)}
 className="h-11 min-h-11 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
 >
 <ExternalLink className="size-3.5" />
 <span>{showManualUrl ? "Fechar URL" : "Importar por URL"}</span>
 </button>
 </div>
 {showManualUrl && (
 <div className="flex items-center gap-2">
 <Input
 value={manualUrl}
 onChange={(e) => setManualUrl(e.target.value)}
 placeholder="https://..."
 aria-label="URL externa da imagem"
 className="h-11 min-h-11 rounded-xl text-xs"
 />
 <Button
 type="button"
 variant="outline"
 disabled={isUploading || !manualUrl.trim()}
 onClick={() => void handleApplyManualUrl()}
 className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
 >
 Importar
 </Button>
 </div>
 )}
 </div>
 );
 };

 // ── 1. VARIANTE AVATAR / LOGOTIPO COMPACTO (QUADRADO SQUIRCLE) ──
 if (isAvatar || (aspectPreset === "square" && (className?.includes("w-2") || className?.includes("w-3")))) {
 return (
 <div className="flex flex-col gap-2">
 {renderUrlDrawer()}
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("relative shrink-0 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg", className)}
 >
 {value ? (
 <div className="relative size-full rounded-lg overflow-hidden border border-border bg-card group shadow-xs">
 <img src={value} alt="Logo/Avatar" className="size-full object-cover" />
 <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
 <Button type="button" variant="secondary" size="icon" onClick={() => { setCurrentImageSrc(value); setCropModalOpen(true); }}
 className="h-11 w-11 min-h-11 min-w-11 rounded-lg bg-background/90 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 title="Recortar"
 >
 <Crop className="size-4" />
 </Button>
 {onRemove && (
 <Button type="button" variant="destructive" size="icon" onClick={onRemove}
 className="h-11 w-11 min-h-11 min-w-11 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 title="Remover"
 >
 <X className="size-4" />
 </Button>
 )}
 </div>
 </div>
 ) : (
 <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}
 disabled={isUploading}
 className="size-full min-h-24 rounded-lg border-2 border-dashed border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-foreground/30 transition-colors duration-200 flex flex-col items-center justify-center p-2 text-muted-foreground group cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none h-auto"
 title="Enviar imagem 1:1"
 >
 {isUploading ? (
 <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
 ) : (
 <>
 <ImagePlus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors mb-1" />
 <span className="text-xs font-bold tracking-tight text-center leading-none">
 Logo 1:1
 <span className="block text-xs font-normal text-muted-foreground mt-1">Ctrl+V</span>
 </span>
 </>
 )}
 </Button>
 )}
 <input
 type="file"
 ref={inputRef}
 className="hidden"
 accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
 onChange={handleFileChange}
 />
 <ImageCropperDialog
 open={cropModalOpen}
 onOpenChange={setCropModalOpen}
 imageSrc={currentImageSrc}
 aspect={effectiveAspect}
 cropShape={appLogoMode ? "rect" : "round"}
 lockAspect={true}
 appLogoMode={appLogoMode}
 initialLogoBgColor={initialLogoBgColor}
 onAppIconSetComplete={onAppIconBundleUploaded ? handleAppIconBundle : undefined}
 onCropCompleteAction={appLogoMode && onAppIconBundleUploaded ? undefined : handleCropComplete}
 />
 </div>
 </div>
 );
 }

 // ── 2. VARIANTE BANNER / COVER / HEADER PANORÂMICO (LARGURA TOTAL DA COLUNA) ──
 // O aspect ratio do preview CSS DEVE ser idêntico ao aspect ratio do cropper.
 if (variant === "banner" || aspectPreset === "banner" || aspectPreset === "cover" || aspectPreset === "header" || aspectPreset === "widescreen" || aspectPreset === "compact_banner") {
 // Monta o aspect CSS como string para o style inline — garante pixel-perfect com o cropper
 const previewAspect = effectiveAspect ? `${effectiveAspect}` : "16/9";
 const maxHeight = aspectPreset === "compact_banner" ? "8rem" : "14rem";
 const previewStyle: React.CSSProperties = { aspectRatio: previewAspect, maxHeight };

 return (
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("w-full flex flex-col gap-2 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg", className)}
 >
 {renderUrlDrawer()}
 {value ? (
 <div
 className="relative w-full rounded-lg overflow-hidden border border-border/80 bg-muted/30 group shadow-xs"
 style={previewStyle}
 >
 <img src={value} alt="Capa" className="size-full object-cover" />
 <div className="absolute inset-0 bg-neutral-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <Button type="button" variant="secondary" size="sm" onClick={() => { setCurrentImageSrc(value); setCropModalOpen(true); }}
 className="h-11 px-4 rounded-lg font-bold text-xs gap-2 bg-background/95 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <Crop className="size-4" />
 <span>Reajustar Enquadramento</span>
 </Button>
 {onRemove && (
 <Button type="button" variant="destructive" size="sm" onClick={onRemove}
 className="h-11 px-4 rounded-lg font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <X className="size-4" />
 <span>Remover</span>
 </Button>
 )}
 </div>
 </div>
 ) : (
 <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}
 disabled={isUploading}
 className="w-full min-h-28 rounded-lg border-2 border-dashed border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-foreground/30 transition-colors duration-200 flex flex-col items-center justify-center p-4 text-muted-foreground group cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none h-auto"
 style={previewStyle}
 >
 {isUploading ? (
 <div className="flex flex-col items-center gap-2">
 <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-foreground" />
 <span className="text-xs font-semibold">Processando imagem...</span>
 </div>
 ) : (
 <>
 <div className="size-10 rounded-lg bg-background border border-border flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
 <ImagePlus className="size-5 text-foreground" />
 </div>
 <div className="text-center">
 <p className="text-xs font-bold text-foreground">
 {label || "Carregar Capa / Banner"}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 Proporção {getPresetLabel()} — clique ou cole com Ctrl+V.
 </p>
 </div>
 </>
 )}
 </Button>
 )}

 <input
 type="file"
 ref={inputRef}
 className="hidden"
 accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
 onChange={handleFileChange}
 />
 <ImageCropperDialog
 open={cropModalOpen}
 onOpenChange={setCropModalOpen}
 imageSrc={currentImageSrc}
 aspect={effectiveAspect}
 cropShape="rect"
 lockAspect={!allowAspectSwitch && aspectPreset !== "free"}
 onCropCompleteAction={handleCropComplete}
 />
 </div>
 );
 }

 const defaultStyle: React.CSSProperties = {
 aspectRatio: effectiveAspect ? `${effectiveAspect}` : "4/3",
 };

 return (
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("space-y-2 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg", className)}
 >
 {renderUrlDrawer()}
 {value ? (
 <div
 className="relative rounded-lg overflow-hidden border border-border/80 bg-muted/30 group shadow-xs"
 style={defaultStyle}
 >
 <img
 src={value}
 alt="Upload"
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-neutral-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <Button type="button" variant="secondary" size="sm" onClick={() => { setCurrentImageSrc(value); setCropModalOpen(true); }}
 className="h-11 px-4 rounded-lg font-bold text-xs gap-2 bg-background/95 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <Crop className="size-4" />
 <span>Recortar</span>
 </Button>
 {onRemove && (
 <Button type="button" variant="destructive" size="sm" onClick={onRemove}
 className="h-11 px-4 rounded-lg font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <X className="size-4" />
 <span>Remover</span>
 </Button>
 )}
 </div>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => inputRef.current?.click()}
 disabled={isUploading}
 style={defaultStyle}
 className={cn(
 "w-full min-h-28 border-2 border-dashed border-border/80 rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors duration-200 bg-muted/40 hover:bg-muted/70 hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none gap-2",
 isUploading && "pointer-events-none opacity-60",
 )}
 >
 <span className="p-3 bg-background border border-border rounded-lg text-muted-foreground shadow-xs inline-flex items-center justify-center">
 <Upload className="size-5 text-foreground" />
 </span>
 <span className="text-xs font-bold text-foreground block">
 {isUploading ? "Processando Imagem..." : label || "Adicionar Imagem"}
 </span>
 <span className="text-xs text-muted-foreground max-w-60 block">
 {helperText ? `${helperText} • Cole com Ctrl+V` : `Enquadramento ${getPresetLabel()} • Cole com Ctrl+V`}
 </span>
 <span className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 h-11 min-h-11 text-xs font-bold text-foreground">
 {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
 <span>Selecionar e Recortar</span>
 </span>
 </button>
 )}
 <input
 type="file"
 ref={inputRef}
 className="hidden"
 accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
 onChange={handleFileChange}
 />
 <ImageCropperDialog
 open={cropModalOpen}
 onOpenChange={setCropModalOpen}
 imageSrc={currentImageSrc}
 aspect={effectiveAspect}
 cropShape={isAvatar && !appLogoMode ? "round" : "rect"}
 lockAspect={isAvatar || appLogoMode ? true : (!allowAspectSwitch && aspectPreset !== "free")}
 title={appLogoMode ? "Proporcionalizar Logo do App" : "Enquadrar Imagem"}
 appLogoMode={appLogoMode}
 initialLogoBgColor={initialLogoBgColor}
 onAppIconSetComplete={onAppIconBundleUploaded ? handleAppIconBundle : undefined}
 onCropCompleteAction={appLogoMode && onAppIconBundleUploaded ? undefined : handleCropComplete}
 />
 </div>
 );
}
