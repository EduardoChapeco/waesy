import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, Film, AlertCircle, Crop, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { getBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { compressImage } from "@/lib/image-compression";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface MediaData {
 id: string;
 url: string;
 path: string;
 type: "image" | "video";
}

export interface MediaUploaderProps {
 value?: string | string[] | MediaData[];
 onChange?: (urls: string[]) => void;
 onMediaChange?: (media: MediaData[]) => void;
 onUploadComplete?: (media: MediaData[]) => void;
 onUploadingStateChange?: (isUploading: boolean) => void;
 maxFiles?: number;
 bucket?: string;
 folder?: string;
 className?: string;
 acceptedTypes?: string[];
 label?: string;
 accept?: "image" | "video" | "all";
 aspect?: number;
 cropShape?: "rect" | "round";
 lockAspect?: boolean;
 enableCrop?: boolean;
  showExternalUrlOption?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
 value = [],
 onChange,
 onMediaChange,
 onUploadComplete,
 onUploadingStateChange,
 maxFiles = 8,
 bucket = "post-media",
 folder = "classifieds",
 showExternalUrlOption = true,
 className,
 label,
 accept = "all",
 aspect,
 cropShape = "rect",
 lockAspect = true,
 enableCrop = true,
 acceptedTypes = accept === "image"
 ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
 : accept === "video"
 ? ["video/mp4", "video/webm", "video/quicktime"]
 : ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"],
}) => {
 const [uploading, setUploading] = useState(false);
 const [uploadProgress, setUploadProgress] = useState<string | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [showUrlInput, setShowUrlInput] = useState(false);
 const [externalUrl, setExternalUrl] = useState("");

 // Compute smart aspect based on bucket/folder if not explicitly provided (1:1 com a renderização)
 const computedAspect =
   aspect !== undefined
     ? aspect
     : bucket === "banners" || folder === "destaques" || folder === "banners"
     ? 21 / 9
     : folder === "cover" || folder === "capa" || folder === "covers"
     ? 3 / 1
     : folder === "story" || folder === "stories" || folder === "guias"
     ? 9 / 16
     : folder === "hotpages" || folder === "cards" || folder === "botoes" || folder === "chips"
     ? 16 / 9
     : folder === "icons" || folder === "avatars" || folder === "avatar" || folder === "perfil" || folder === "produtos" || folder === "products"
     ? 1
     : folder === "classifieds"
     ? 4 / 3
     : 4 / 3;

 // Crop dialog state
 const [cropModalOpen, setCropModalOpen] = useState(false);
 const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);
 const [currentCropFile, setCurrentCropFile] = useState<File | null>(null);
 const [editingMediaIndex, setEditingMediaIndex] = useState<number | null>(null);

 // Normaliza o valor para MediaData[] de forma segura (suporta string única, array de strings ou MediaData[])
 const normalizedRawValue: (string | MediaData)[] = typeof value === "string"
 ? (value.trim() ? [value] : [])
 : Array.isArray(value)
 ? value
 : [];

 const mediaList: MediaData[] = normalizedRawValue.map((item, idx) => {
 if (typeof item === "string") {
 const isVid = item.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i);
 return {
 id: `media-${idx}-${item.slice(-10)}`,
 url: item,
 path: item,
 type: isVid ? "video" : "image",
 };
 }
 return item;
 });

 const notifyChange = (newList: MediaData[]) => {
 const urls = newList.map((m) => m.url);
 onChange?.(urls);
 onMediaChange?.(newList);
 onUploadComplete?.(newList);
 };

 const handleAddExternalUrl = (urlToApply?: string) => {
 const rawUrl = (urlToApply || externalUrl).trim();
 if (!rawUrl) return;

 if (!/^https?:\/\//i.test(rawUrl)) {
 toast.error("Insira uma URL válida iniciando com http:// ou https://");
 return;
 }

 if (mediaList.length >= maxFiles && maxFiles > 1) {
 toast.error(`Você pode adicionar no máximo ${maxFiles} itens.`);
 return;
 }

 const isVid = Boolean(rawUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i));
 const newMediaItem: MediaData = {
 id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
 url: rawUrl,
 path: rawUrl,
 type: isVid ? "video" : "image",
 };

 const updatedList: MediaData[] = maxFiles === 1 ? [newMediaItem] : [...mediaList, newMediaItem];
 notifyChange(updatedList);
 setExternalUrl("");
 setShowUrlInput(false);
 toast.success("Mídia vinculada por URL com sucesso!");
 };

 const handleFiles = async (files: File[]) => {
 if (!files.length) return;

 if (mediaList.length + files.length > maxFiles) {
 toast.error(`Você pode enviar no máximo ${maxFiles} fotos ou vídeos.`);
 return;
 }

 // Se for apenas 1 imagem e o recorte estiver habilitado, abre o modal de corte direto
 if (files.length === 1 && files[0].type.startsWith("image/") && enableCrop && (!files[0].type.includes("gif"))) {
 const file = files[0];
 setCurrentCropFile(file);
 setEditingMediaIndex(null);
 const reader = new FileReader();
 reader.onload = () => {
 setCurrentImageSrc(reader.result as string);
 setCropModalOpen(true);
 };
 reader.onerror = () => toast.error("Erro ao ler arquivo de imagem");
 reader.readAsDataURL(file);
 if (fileInputRef.current) fileInputRef.current.value = "";
 return;
 }

 setUploading(true);
 onUploadingStateChange?.(true);
 setUploadProgress(`Enviando ${files.length} arquivo(s)...`);

 const updatedMedia: MediaData[] = [...mediaList];
 let successCount = 0;
 let failCount = 0;

 for (let i = 0; i < files.length; i++) {
 let file = files[i];
 const isImage = file.type.startsWith("image/");
 const isVideo = file.type.startsWith("video/");

 if (!isImage && (!isVideo)) {
 toast.error(`Arquivo ${file.name} não é uma imagem ou vídeo válido.`);
 failCount++;
 continue;
 }

 // Compress images client-side before upload to speed up transmission and reduce bandwidth
 if (isImage) {
   try {
     const compressed = await compressImage(file);
     file = compressed.file;
   } catch (compErr) {
     console.warn("Compressão client-side pulada, enviando original:", compErr);
   }
 }

 // Máximo 50MB para vídeo, 20MB para imagem
 const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
 if (file.size > maxSizeBytes) {
 toast.error(
 `Arquivo ${file.name} excede o tamanho máximo de ${isVideo ? "50MB" : "20MB"}.`,
 );
 failCount++;
 continue;
 }

 const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
 const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
 const filePath = `${folder}/${cleanName}`;

 setUploadProgress(`Enviando ${i + 1} de ${files.length}: ${file.name}...`);

 try {
 const base64Data = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });

 const res = await uploadMediaUniversal({
 data: {
 base64Data,
 fileName: cleanName,
 fileType: file.type || "image/jpeg",
 bucket: bucket,
 folder: folder,
 },
 });

 if (res?.url) {
 updatedMedia.push({
 id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
 url: res.url,
 path: filePath,
 type: isVideo ? "video" : "image",
 });
 successCount++;
 }
 } catch (err: any) {
 console.error("Erro no upload do arquivo:", file.name, err);
 // Fallback para upload direto via client browser caso Server Function falhe
 try {
 const supabase = getBrowserClient();
 const { error: directErr } = await supabase.storage
 .from(bucket)
 .upload(filePath, file, { upsert: true });

 if (!directErr) {
 const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
 if (publicData?.publicUrl) {
 updatedMedia.push({
 id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
 url: publicData.publicUrl,
 path: filePath,
 type: isVideo ? "video" : "image",
 });
 successCount++;
 }
 } else {
 failCount++;
 }
 } catch {
 failCount++;
 }
 }
 }

 setUploading(false);
 onUploadingStateChange?.(false);
 setUploadProgress(null);

 if (fileInputRef.current) {
 fileInputRef.current.value = "";
 }

 if (successCount > 0) {
 notifyChange(updatedMedia);
 toast.success(`${successCount} mídia(s) enviada(s) com sucesso!`);
 }
 if (failCount > 0) {
 toast.error(`Falha ao enviar ${failCount} arquivo(s).`);
 }
 };

 const handlePaste = async (e: React.ClipboardEvent) => {
 const items = await extractMediaFromClipboard(e);
 if (items && items.length > 0) {
 e.preventDefault();
 const files = items.map((i) => i.file);
 toast.info(`Processando ${files.length} mídia(s) colada(s)...`);
 await handleFiles(files);
 return;
 }

 const pastedText = e.clipboardData?.getData("text/plain")?.trim();
 if (pastedText && /^https?:\/\//i.test(pastedText)) {
 e.preventDefault();
 handleAddExternalUrl(pastedText);
 }
 };

 const handleCropComplete = async (croppedBase64: string) => {
 setUploading(true);
 onUploadingStateChange?.(true);
 setUploadProgress("Salvando imagem recortada...");

 try {
 const cleanName = `${Date.now()}_cropped_${Math.random().toString(36).substring(2, 8)}.png`;
 const filePath = `${folder}/${cleanName}`;

 const res = await uploadMediaUniversal({
 data: {
 base64Data: croppedBase64,
 fileName: cleanName,
 fileType: "image/png",
 bucket: bucket,
 folder: folder,
 },
 });

 if (res?.url) {
 let updatedMedia: MediaData[];
 if (editingMediaIndex !== null && editingMediaIndex >= 0 && editingMediaIndex < mediaList.length) {
 // Editando item existente
 updatedMedia = [...mediaList];
 updatedMedia[editingMediaIndex] = {
 ...updatedMedia[editingMediaIndex],
 url: res.url,
 path: filePath,
 };
 } else {
 // Novo item (substitui se maxFiles === 1, ou adiciona se maxFiles > 1)
 if (maxFiles === 1) {
 updatedMedia = [
 {
 id: `media-${Date.now()}`,
 url: res.url,
 path: filePath,
 type: "image",
 },
 ];
 } else {
 updatedMedia = [
 ...mediaList,
 {
 id: `media-${Date.now()}`,
 url: res.url,
 path: filePath,
 type: "image",
 },
 ];
 }
 }

 notifyChange(updatedMedia);
 toast.success("Imagem recortada e salva com sucesso!");
 }
 } catch (err: any) {
 console.error("Erro ao salvar recorte:", err);
 toast.error("Erro ao salvar recorte da imagem.");
 } finally {
 setUploading(false);
 onUploadingStateChange?.(false);
 setUploadProgress(null);
 setCropModalOpen(false);
 setCurrentImageSrc(null);
 setCurrentCropFile(null);
 setEditingMediaIndex(null);
 }
 };

 const removeMedia = (index: number) => {
 const updated = mediaList.filter((_, idx) => idx !== index);
 notifyChange(updated);
 };

 const handleOpenRecrop = (index: number) => {
 const item = mediaList[index];
 if (item && item.type === "image") {
 setEditingMediaIndex(index);
 setCurrentImageSrc(item.url);
 setCropModalOpen(true);
 }
 };

 return (
 <div
 onPaste={handlePaste}
 tabIndex={0}
 className={cn("space-y-3 outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg", className)}
 >
 {/* Cabeçalho com label e toggle de URL */}
 <div className="flex items-center justify-between">
 {label && <label className="text-xs font-semibold text-foreground">{label}</label>}
 {showExternalUrlOption && mediaList.length < maxFiles && (
 <Button type="button" variant="ghost" onClick={() => setShowUrlInput(!showUrlInput)}
 className="min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <ExternalLink className="size-4" />
 <span>{showUrlInput ? "Cancelar URL" : "Inserir URL Externa"}</span>
 </Button>
 )}
 </div>

 {/* Gaveta de Entrada de URL Externa */}
 {showUrlInput && (
 <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>Informe o link público da mídia (HTTPS)</span>
 <Button type="button" variant="ghost" size="icon" onClick={() => setShowUrlInput(false)}
 className="size-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
 aria-label="Fechar entrada de URL"
 >
 <X className="size-4" />
 </Button>
 </div>
 <div className="flex flex-col sm:flex-row gap-2">
 <Input
 type="url"
 value={externalUrl}
 onChange={(e) => setExternalUrl(e.target.value)}
 placeholder="https://exemplo.com/imagem.jpg ou video.mp4"
 className="h-11 text-xs rounded-lg flex-1 bg-background"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleAddExternalUrl();
 }
 }}
 />
 <Button type="button" onClick={() => handleAddExternalUrl()}
 className="h-11 px-4 text-xs font-bold rounded-lg shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 Adicionar Mídia
 </Button>
 </div>
 </div>
 )}

 {/* Grid de previews existentes */}
 {mediaList.length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {mediaList.map((item, idx) => (
 <div
 key={item.id || idx}
 className={cn(
 "group relative rounded-lg overflow-hidden border border-border bg-card shadow-xs transition-all hover:border-primary/50",
 idx === 0 && "ring-2 ring-primary/60 border-primary",
 computedAspect === 1 ? "aspect-square" : computedAspect === 4 / 3 ? "aspect-4/3" : "aspect-video"
 )}
 >
 {item.type === "video" ? (
 <div className="relative w-full h-full bg-neutral-950 flex items-center justify-center">
 <video src={item.url} className="w-full h-full object-cover" controls={false} />
 <div className="absolute inset-0 bg-neutral-950/30 flex items-center justify-center pointer-events-none">
 <Film className="size-6 text-background/80" />
 </div>
 </div>
 ) : (
 <img src={item.url} alt="Mídia" className="w-full h-full object-cover" />
 )}

 {/* Botões de Ação sobre o Card */}
 <div className="absolute top-1.5 right-1.5 flex items-center gap-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
 {item.type === "image" && enableCrop && (
 <Button type="button" variant="secondary" size="icon" onClick={() => handleOpenRecrop(idx)}
 title="Ajustar e Recortar"
 className="h-11 w-11 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-foreground/80 backdrop-blur-xs text-background hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 aria-label="Ajustar e Recortar Imagem"
 >
 <Crop className="size-4" />
 </Button>
 )}
 <Button type="button" variant="destructive" size="icon" onClick={() => removeMedia(idx)}
 title="Remover"
 className="h-11 w-11 min-h-11 min-w-11 flex items-center justify-center rounded-lg bg-foreground/80 backdrop-blur-xs text-background hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 aria-label="Remover Mídia"
 >
 <X className="size-4" />
 </Button>
 </div>

 {idx === 0 && (
 <span className="absolute bottom-1.5 left-1.5 text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md shadow-xs">
 Capa
 </span>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Área de Dropzone se não atingiu o limite */}
 {mediaList.length < maxFiles && (
 <div
 role="button"
 tabIndex={0}
 onClick={() => fileInputRef.current?.click()} // focus-visible:ring-2 focus-visible:outline-none
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 fileInputRef.current?.click();
 }
 }}
 onPaste={handlePaste}
 onDragOver={(e) => {
 e.preventDefault();
 e.stopPropagation();
 }}
 onDrop={(e) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
 handleFiles(Array.from(e.dataTransfer.files));
 }
 }}
 className={cn(
 "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all",
 "border-border/80 hover:border-primary/70 bg-card hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
 uploading && "pointer-events-none opacity-60",
 )}
 >
 {uploading ? (
 <div className="flex flex-col items-center gap-2 text-primary">
 <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />
 <span className="text-xs font-semibold text-foreground">
 {uploadProgress || "Processando upload..."}
 </span>
 </div>
 ) : (
 <div className="flex flex-col items-center text-center gap-2">
 <div className="p-3 rounded-lg bg-primary/10 text-primary">
 <UploadCloud className="size-5" />
 </div>
 <p className="text-xs font-semibold text-foreground">
 Clique, arraste ou cole fotos e vídeos aqui
 </p>
 <p className="text-xs text-muted-foreground">
 JPG, PNG, WEBP ou MP4 até {maxFiles} arquivo{maxFiles > 1 ? "s" : ""} ({mediaList.length}/{maxFiles} adicionados) • Cole com Ctrl+V
 </p>
 </div>
 )}

 <input
 ref={fileInputRef}
 type="file"
 multiple={maxFiles > 1}
 accept={acceptedTypes.join(",")}
 className="hidden"
 onChange={(e) => {
 const files = Array.from(e.target.files || []);
 handleFiles(files);
 }}
 />
 </div>
 )}

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
};
