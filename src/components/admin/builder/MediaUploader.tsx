import * as React from "react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon, Check, Layers } from 'lucide-react';
import { toast } from "sonner";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  className?: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  lockAspect?: boolean;
}

const PRESET_DEMO_IMAGES: Array<{ label: string; url: string }> = [];

export function MediaUploader({
  value,
  onChange,
  label,
  bucket = "store-assets",
  folder = "builder",
  className,
  aspect,
  cropShape = "rect",
  lockAspect = true,
}: MediaUploaderProps) {
 const [isUploading, setIsUploading] = useState(false);
 const [activeMode, setActiveMode] = useState<"upload" | "url">("upload");
 const [showPresets, setShowPresets] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

  const computedAspect =
    aspect !== undefined
      ? aspect
      : bucket === "banners" || folder === "banners"
      ? 21 / 9
      : folder === "cover" || folder === "capa"
      ? 3 / 1
      : folder === "avatars" || folder === "logos"
      ? 1
      : 16 / 9;

 // Crop dialog state
 const [cropModalOpen, setCropModalOpen] = useState(false);
 const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
 const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.type.startsWith("image/")) {
 // SVGs e GIFs não devem ser cropados
 if (file.type.includes("svg") || file.type.includes("gif")) {
 uploadFileDirectly(file);
 return;
 }

 setCurrentImageFile(file);
 const reader = new FileReader();
 reader.onload = () => {
 setCurrentImageSrc(reader.result as string);
 setCropModalOpen(true);
 };
 reader.onerror = () => toast.error("Erro ao ler imagem local");
 reader.readAsDataURL(file);
 if (fileInputRef.current) fileInputRef.current.value = "";
 return;
 }

 // Arquivos não-imagem (ex: vídeo)
 uploadFileDirectly(file);
 };

 const uploadFileDirectly = async (file: File) => {
 setIsUploading(true);
 try {
 const reader = new FileReader();
 reader.onload = async (event) => {
 try {
 const base64Data = (event.target?.result as string) || "";
 const res = await uploadMediaUniversal({
 data: {
 fileName: file.name,
 fileType: file.type || "application/octet-stream",
 base64Data,
 bucket,
 folder: "builder",
 },
 });

 if (res?.url) {
 onChange(res.url);
 toast.success("Mídia carregada com sucesso!");
 } else {
 throw new Error("URL de resposta não encontrada.");
 }
 } catch (uploadErr: any) {
 console.error("[MediaUploader] uploadFileDirectly error:", uploadErr);
 toast.error(uploadErr?.message || "Erro no upload da mídia.");
 } finally {
 setIsUploading(false);
 }
 };
 reader.readAsDataURL(file);
 } catch (err: any) {
 toast.error(err?.message || "Falha ao processar arquivo.");
 setIsUploading(false);
 } finally {
 if (fileInputRef.current) fileInputRef.current.value = "";
 }
 };

 const handleCropComplete = async (croppedBase64: string) => {
 setIsUploading(true);
 try {
 const fileName = currentImageFile
 ? `cropped-${currentImageFile.name.replace(/\.[^/.]+$/, "")}.png`
 : `cropped-${Date.now()}.png`;

 const res = await uploadMediaUniversal({
 data: {
 fileName,
 fileType: "image/png",
 base64Data: croppedBase64,
 bucket,
 folder: "builder",
 },
 });

 if (res?.url) {
 onChange(res.url);
 toast.success("Imagem recortada e salva com sucesso!");
 } else {
 throw new Error("URL da imagem recortada não retornada.");
 }
 } catch (err: any) {
 console.error("[MediaUploader] handleCropComplete error:", err);
 toast.error(err?.message || "Erro ao salvar imagem recortada.");
 } finally {
 setIsUploading(false);
 }
 };

 const isVideo = value ? !!value.split("?")[0].match(/\.(mp4|webm|mov|ogg)$/i) : false;

 return (
 <div className={cn("flex flex-col gap-2", className)}>
 {label && (
 <label className="text-xs font-bold text-foreground flex items-center justify-between">
 <span>{label}</span>
 <span className="text-[10px] font-normal text-muted-foreground">
 {value ? "Mídia ativa" : "Vazio"}
 </span>
 </label>
 )}

 {/* ── 1. PREVIEW DO ARQUIVO ATIVO (SE HOUVER) ── */}
 {value ? (
 <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/30 group transition-all">
 <div className="h-32 w-full flex items-center justify-center p-1 bg-[radial-gradient(#00000010_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:12px_12px]">
 {isVideo ? (
 <video src={value} className="w-full h-full object-cover rounded-lg" muted />
 ) : (
 <img
 src={value}
 alt="Media preview"
 className="max-h-30 w-auto max-w-full object-contain rounded-lg shadow-2xs"
 onError={(e) => {
 (e.currentTarget as HTMLImageElement).src =
 "https://placehold.co/600x400/18181b/ffffff?text=Imagem+Indispon%C3%ADvel";
 }}
 />
 )}
 </div>

 {/* Overlay com Ações Rápidas */}
 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
 <Button
 type="button"
 variant="secondary"
 size="sm"
 className="h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer bg-white text-black hover:bg-white/90"
 onClick={() => fileInputRef.current?.click()}
 >
 <Upload className="size-3.5" />
 <span>Trocar</span>
 </Button>
 <Button
 type="button"
 variant="destructive"
 size="icon"
 className="h-8 w-8 rounded-lg cursor-pointer"
 onClick={() => onChange("")}
 title="Remover mídia"
 >
 <X className="size-4" />
 </Button>
 </div>
 </div>
 ) : (
 /* ── 2. ÁREA DE DROP / UPLOAD QUANDO VAZIO ── */
 <div
 className={cn(
 "h-28 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20 hover:bg-muted/40 hover:border-primary/60 transition-all cursor-pointer select-none",
 isUploading && "pointer-events-none opacity-60",
 )}
 onClick={() => fileInputRef.current?.click()}
 >
 {isUploading ? (
 <>
 <Loader2 className="size-6 animate-spin text-primary" />
 <span className="text-xs font-semibold text-foreground">Enviando mídia...</span>
 </>
 ) : (
 <>
 <div className="size-9 rounded-xl bg-background border border-border/60 flex items-center justify-center shadow-2xs">
 <Upload className="size-4.5 text-muted-foreground" />
 </div>
 <div className="text-center space-y-0.5">
 <p className="text-xs font-bold text-foreground">Clique para enviar arquivo</p>
 <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP, GIF ou MP4</p>
 </div>
 </>
 )}
 </div>
 )}

 {/* ── 3. ENTRADA MANUAL DE URL / PRESETS ── */}
 <div className="space-y-1.5 pt-1">
 <div className="flex gap-1.5">
 <div className="relative flex-1">
 <Input
 className="h-8 pl-7 pr-2 text-xs bg-background rounded-lg border-border/70 font-sans"
 placeholder="Cole a URL da imagem (https://...)"
 value={value || ""}
 onChange={(e) => onChange(e.target.value)}
 />
 <LinkIcon className="size-3.5 absolute left-2 top-2.5 text-muted-foreground pointer-events-none" />
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setShowPresets(!showPresets)}
 className="h-8 px-2 text-[11px] rounded-lg gap-1 border-border/70 shrink-0 cursor-pointer"
 title="Escolher uma imagem de amostra"
 >
 <Layers className="size-3 text-amber-500" />
 <span>Exemplos</span>
 </Button>
 </div>

 {/* Menu rápido de Presets de Imagens */}
 {showPresets && (
 <div className="p-2 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 animate-in fade-in duration-150">
 <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
 Imagens de Exemplo em Alta Definição:
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 {PRESET_DEMO_IMAGES.map((preset) => (
 <button
 key={preset.label}
 type="button"
 onClick={() => {
 onChange(preset.url);
 setShowPresets(false);
 toast.success(`Exemplo "${preset.label}" aplicado!`);
 }}
 className="text-left text-[11px] p-1.5 rounded-lg bg-background hover:bg-primary/10 hover:text-primary border border-border/50 truncate cursor-pointer transition-colors"
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Hidden File Input */}
 <input
 type="file"
 accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
 className="hidden"
 ref={fileInputRef}
 onChange={handleFileSelect}
 />

 {/* Diálogo de Recorte */}
 <ImageCropperDialog
 open={cropModalOpen}
 onOpenChange={setCropModalOpen}
 imageSrc={currentImageSrc}
 aspect={computedAspect}
 cropShape={cropShape}
 lockAspect={lockAspect}
 onCropCompleteAction={handleCropComplete}
 />
 </div>
 );
}
