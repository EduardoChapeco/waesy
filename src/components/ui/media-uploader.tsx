import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, Film, AlertCircle, Crop } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadMediaUniversal } from "@/services/storage.functions";
import { getBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { compressImage } from "@/lib/image-compression";
import { extractMediaFromClipboard } from "@/lib/clipboard-media";

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

 const handleFiles = async (files: File[]) => {
 if (!files.length) return;

 if (mediaList.length + files.length > maxFiles) {
 toast.error(`Você pode enviar no máximo ${maxFiles} fotos ou vídeos.`);
 return;
 }

 // Se for apenas 1 imagem e o recorte estiver habilitado, abre o modal de corte direto
 if (files.length === 1 && files[0].type.startsWith("image/") && enableCrop && !files[0].type.includes("gif")) {
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

 if (!isImage && !isVideo) {
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
 className={cn("space-y-3 outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl", className)}
 >
 {label && <label className="text-xs font-semibold text-foreground">{label}</label>}

 {/* Grid de previews existentes */}
 {mediaList.length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
 {mediaList.map((item, idx) => (
 <div
 key={item.id || idx}
 className={cn(
 "group relative rounded-xl overflow-hidden border border-border bg-card shadow-xs transition-all hover:border-primary/50",
 idx === 0 && "ring-2 ring-primary/60 border-primary",
 computedAspect === 1 ? "aspect-square" : computedAspect === 4 / 3 ? "aspect-[4/3]" : "aspect-video"
 )}
 >
 {item.type === "video" ? (
 <div className="relative w-full h-full bg-black flex items-center justify-center">
 <video src={item.url} className="w-full h-full object-cover" controls={false} />
 <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
 <Film className="size-6 text-white/80" />
 </div>
 </div>
 ) : (
 <img src={item.url} alt="Mídia" className="w-full h-full object-cover" />
 )}

 {/* Botões de Ação sobre o Card */}
 <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
 {item.type === "image" && enableCrop && (
 <button
 type="button"
 onClick={() => handleOpenRecrop(idx)}
 title="Ajustar e Recortar"
 className="size-8 sm:size-7 flex items-center justify-center rounded-xl bg-black/75 backdrop-blur-xs text-white hover:bg-primary hover:text-white transition-colors cursor-pointer shadow-xs"
 aria-label="Ajustar e Recortar Imagem"
 >
 <Crop className="size-4" />
 </button>
 )}
 <button
 type="button"
 onClick={() => removeMedia(idx)}
 title="Remover"
 className="size-8 sm:size-7 flex items-center justify-center rounded-xl bg-black/75 backdrop-blur-xs text-white hover:bg-destructive hover:text-white transition-colors cursor-pointer shadow-xs"
 aria-label="Remover Mídia"
 >
 <X className="size-4" />
 </button>
 </div>

 {idx === 0 && (
 <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md shadow-xs">
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
 onClick={() => fileInputRef.current?.click()}
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
 "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
 "border-border/80 hover:border-primary/70 bg-card hover:bg-muted/30",
 uploading && "pointer-events-none opacity-60",
 )}
 >
 {uploading ? (
 <div className="flex flex-col items-center gap-2 text-primary">
 <Loader2 className="size-6 animate-spin" />
 <span className="text-xs font-semibold text-foreground">
 {uploadProgress || "Processando upload..."}
 </span>
 </div>
 ) : (
 <div className="flex flex-col items-center text-center gap-1.5">
 <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
 <UploadCloud className="size-5" />
 </div>
 <p className="text-xs font-semibold text-foreground">
 Clique, arraste ou cole fotos e vídeos aqui
 </p>
 <p className="text-[11px] text-muted-foreground">
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
