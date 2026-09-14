import { useState, useRef } from "react";
import { Upload, X, Loader2, Crop, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";

export type AspectRatioPreset = "square" | "classified" | "widescreen" | "banner" | "cover" | "header" | "free";

const PRESET_ASPECT_RATIOS: Record<AspectRatioPreset, number | undefined> = {
 square: 1, // 1:1 (Produtos, Logos, Avatars)
 classified: 4 / 3, // 4:3 (Classificados, Carros, Imóveis)
 widescreen: 16 / 9, // 16:9 (Panorâmico moderno, Banners delicados de Bio/Destaque)
 cover: 3 / 1, // 3:1 (Capa de Perfil de Membro — IDÊNTICO ao aspect-[3/1] da tela)
 banner: 21 / 9, // 21:9 (Top Banners Hero de Loja)
 header: 4 / 1, // 4:1 (Banners Panorâmicos de Topo)
 free: undefined, // Livre
};

interface ImageUploadProps {
 value?: string | null;
 onChange: (url: string) => void;
 onRemove?: () => void;
 bucket?: "product-media" | "cms-media" | "receipts" | "identity-vault" | "avatars" | "store-assets" | "destination-media" | string;
 className?: string;
 variant?: "default" | "minimal" | "avatar" | "banner";
 aspect?: number;
 aspectPreset?: AspectRatioPreset;
 helperText?: string;
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
 helperText,
}: ImageUploadProps) {
 const [isUploading, setIsUploading] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 // Resolved aspect ratio
 const effectiveAspect = aspect !== undefined ? aspect : PRESET_ASPECT_RATIOS[aspectPreset];

 // Crop state
 const [cropModalOpen, setCropModalOpen] = useState(false);
 const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
 const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);

 const isAvatar = variant === "avatar";

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
 }
 };

 const handleCropComplete = async (croppedBase64: string) => {
 if (!currentImageFile) return;
 setIsUploading(true);
 try {
 try {
 const { getSignedUploadUrl } = await import("@/services/storage.functions");
 const res = await getSignedUploadUrl({
 data: {
 fileName: currentImageFile.name,
 bucket: bucket as any,
 contentType: currentImageFile.type,
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
 const mimeType = croppedBase64.startsWith("data:image/png") ? "image/png" : "image/webp";
 const blob = new Blob(byteArrays, { type: mimeType });

 // Upload directly to Supabase Storage via Signed URL
 const uploadRes = await fetch(res.signedUrl, {
 method: "PUT",
 headers: {
 Authorization: `Bearer ${res.token}`,
 "Content-Type": mimeType,
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
 fileName: currentImageFile.name,
 fileType: currentImageFile.type || "image/jpeg",
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
 case "banner":
 return "21:9 (Banner de Loja)";
 case "header":
 return "4:1 (Cabeçalho)";
 default:
 return "Ajustável";
 }
 };

 // ── 1. VARIANTE AVATAR / LOGOTIPO COMPACTO (QUADRADO SQUIRCLE) ──
 if (isAvatar || (aspectPreset === "square" && (className?.includes("w-2") || className?.includes("w-3")))) {
 return (
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("relative shrink-0 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl", className)}
 >
 {value ? (
 <div className="relative size-full rounded-2xl overflow-hidden border border-border bg-card group shadow-xs">
 <img src={value} alt="Logo/Avatar" className="size-full object-cover" />
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
 <Button
 variant="secondary"
 size="icon"
 className="size-7 rounded-lg bg-background/90 text-foreground"
 onClick={() => {
 setCurrentImageSrc(value);
 setCropModalOpen(true);
 }}
 type="button"
 title="Recortar"
 >
 <Crop className="size-3.5" />
 </Button>
 {onRemove && (
 <Button
 variant="destructive"
 size="icon"
 className="size-7 rounded-lg"
 onClick={onRemove}
 type="button"
 title="Remover"
 >
 <X className="size-3.5" />
 </Button>
 )}
 </div>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => inputRef.current?.click()}
 disabled={isUploading}
 className="size-full rounded-2xl border-2 border-dashed border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-foreground/30 transition-all flex flex-col items-center justify-center p-2 text-muted-foreground group cursor-pointer"
 title="Clique para enviar imagem 1:1 ou cole com Ctrl+V"
 >
 {isUploading ? (
 <Loader2 className="size-5 animate-spin" />
 ) : (
 <>
 <ImagePlus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors mb-1" />
 <span className="text-[10px] font-bold tracking-tight text-center leading-none">
 Logo 1:1
 <span className="block text-[8px] font-normal text-muted-foreground mt-0.5">Ctrl+V</span>
 </span>
 </>
 )}
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
 cropShape="round"
 lockAspect={true}
 onCropCompleteAction={handleCropComplete}
 />
 </div>
 );
 }

 // ── 2. VARIANTE BANNER / COVER / HEADER PANORÂMICO (LARGURA TOTAL DA COLUNA) ──
 // O aspect ratio do preview CSS DEVE ser idêntico ao aspect ratio do cropper.
 if (variant === "banner" || aspectPreset === "banner" || aspectPreset === "cover" || aspectPreset === "header" || aspectPreset === "widescreen") {
 // Monta o aspect CSS como string para o style inline — garante pixel-perfect com o cropper
 const previewAspect = effectiveAspect ? `${effectiveAspect}` : "16/9";
 const previewStyle: React.CSSProperties = { aspectRatio: previewAspect, maxHeight: "14rem" };

 return (
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("w-full flex flex-col gap-2 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl", className)}
 >
 {value ? (
 <div
 className="relative w-full rounded-2xl overflow-hidden border border-border/80 bg-muted/30 group shadow-xs"
 style={previewStyle}
 >
 <img src={value} alt="Capa" className="size-full object-cover" />
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <Button
 variant="secondary"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-background/95 text-foreground"
 onClick={() => {
 setCurrentImageSrc(value);
 setCropModalOpen(true);
 }}
 type="button"
 >
 <Crop className="size-3.5" />
 <span>Reajustar Enquadramento</span>
 </Button>
 {onRemove && (
 <Button
 variant="destructive"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5"
 onClick={onRemove}
 type="button"
 >
 <X className="size-3.5" />
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
 className="w-full rounded-2xl border-2 border-dashed border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-foreground/30 transition-all flex flex-col items-center justify-center p-4 text-muted-foreground group cursor-pointer gap-2"
 style={previewStyle}
 >
 {isUploading ? (
 <div className="flex flex-col items-center gap-2">
 <Loader2 className="size-6 animate-spin text-foreground" />
 <span className="text-xs font-semibold">Processando imagem...</span>
 </div>
 ) : (
 <>
 <div className="size-10 rounded-xl bg-background border border-border flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
 <ImagePlus className="size-5 text-foreground" />
 </div>
 <div className="text-center">
 <p className="text-xs font-bold text-foreground">
 Carregar Capa / Banner
 </p>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 Proporção {getPresetLabel()} — clique ou cole com Ctrl+V.
 </p>
 </div>
 </>
 )}
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
 cropShape="rect"
 lockAspect={true}
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
 className={cn("space-y-2 select-none outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl", className)}
 >
 {value ? (
 <div
 className="relative rounded-2xl overflow-hidden border border-border/80 bg-muted/30 group shadow-xs"
 style={defaultStyle}
 >
 <img
 src={value}
 alt="Upload"
 className="w-full h-full object-cover"
 />
 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <Button
 variant="secondary"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-background/95 text-foreground"
 onClick={() => {
 setCurrentImageSrc(value);
 setCropModalOpen(true);
 }}
 type="button"
 >
 <Crop className="size-3.5" />
 <span>Recortar</span>
 </Button>
 {onRemove && (
 <Button
 variant="destructive"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5"
 onClick={onRemove}
 type="button"
 >
 <X className="size-3.5" />
 <span>Remover</span>
 </Button>
 )}
 </div>
 </div>
 ) : (
 <div
 onClick={() => inputRef.current?.click()}
 style={defaultStyle}
 className={cn(
 "border-2 border-dashed border-border/80 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all bg-muted/40 hover:bg-muted/70 hover:border-foreground/30",
 isUploading && "pointer-events-none opacity-60",
 )}
 >
 <div className="p-3 bg-background border border-border rounded-xl mb-2 text-muted-foreground shadow-xs">
 <Upload className="size-5 text-foreground" />
 </div>
 <p className="text-xs font-bold text-foreground">
 {isUploading ? "Processando Imagem..." : "Adicionar Imagem"}
 </p>
 <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
 {helperText ? `${helperText} • Cole com Ctrl+V` : `Enquadramento ${getPresetLabel()} • Cole com Ctrl+V`}
 </p>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="mt-1 rounded-xl text-xs font-bold h-8"
 onClick={() => inputRef.current?.click()}
 disabled={isUploading}
 >
 {isUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Selecionar e Recortar"}
 </Button>
 </div>
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
 cropShape={isAvatar ? "round" : "rect"}
 lockAspect={true}
 title="Enquadrar Imagem"
 onCropCompleteAction={handleCropComplete}
 />
 </div>
 );
}
