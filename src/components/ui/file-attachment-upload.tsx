import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { UploadCloud, FileText, Paperclip, Trash2, ExternalLink, Loader2, CheckCircle2, ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadStoreMedia } from "@/services/storage.functions";

export interface FileAttachmentUploadProps {
 value?: string | null;
 onChange: (url: string) => void;
 onRemove?: () => void;
 label?: string;
 helperText?: string;
 accept?: string;
 bucket?: string;
 maxSizeMB?: number;
 className?: string;
 showExternalUrlOption?: boolean;
 compact?: boolean;
}

function isImageFile(url: string): boolean {
 if (!url) return false;
 if (url.startsWith("data:image/")) return true;
 return /\.(jpeg|jpg|png|gif|webp|svg|avif)($|\?)/i.test(url);
}

function isPdfFile(url: string): boolean {
 if (!url) return false;
 return /\.pdf($|\?)/i.test(url) || url.startsWith("data:application/pdf");
}

function getFileNameFromUrl(url: string): string {
 try {
 const cleanUrl = url.split("?")[0];
 const segments = cleanUrl.split("/");
 const last = segments[segments.length - 1];
 return decodeURIComponent(last) || "arquivo-anexado";
 } catch {
 return "arquivo-anexado";
 }
}

export function FileAttachmentUpload({
 value,
 onChange,
 onRemove,
 label,
 helperText = "Envie uma foto, print de tela ou documento (PDF/DOCX/TXT até 20MB)",
 accept = "image/*,application/pdf,.doc,.docx,.txt,.log,.csv",
 bucket = "cms-media",
 maxSizeMB = 20,
 className,
 showExternalUrlOption = true,
 compact = false,
}: FileAttachmentUploadProps) {
 const [isUploading, setIsUploading] = useState(false);
 const [isDragging, setIsDragging] = useState(false);
 const [showManualInput, setShowManualInput] = useState(false);
 const [manualUrl, setManualUrl] = useState("");
 const inputRef = useRef<HTMLInputElement>(null);

 const handleFileUpload = async (file: File) => {
 if (!file) return;

 if (file.size > maxSizeMB * 1024 * 1024) {
 toast.error(`O arquivo excede o limite máximo permitido de ${maxSizeMB}MB.`);
 return;
 }

 setIsUploading(true);
 try {
 const reader = new FileReader();
 reader.onerror = () => {
 setIsUploading(false);
 toast.error("Erro ao ler o arquivo selecionado.");
 };

 reader.onload = async () => {
 try {
 const base64Data = reader.result as string;
 const res = await uploadStoreMedia({
 data: {
 fileName: file.name,
 fileType: file.type || "application/octet-stream",
 base64Data,
 bucket,
 },
 });

 if (res?.url) {
 onChange(res.url);
 toast.success("Arquivo anexado com sucesso!");
 } else {
 throw new Error("Não foi possível obter a URL do arquivo após o upload.");
 }
 } catch (err: any) {
 console.error("[FileAttachmentUpload] Upload error:", err);
 toast.error(err?.message || "Falha ao enviar arquivo para o servidor.");
 } finally {
 setIsUploading(false);
 if (inputRef.current) inputRef.current.value = "";
 }
 };

 reader.readAsDataURL(file);
 } catch (err: any) {
 setIsUploading(false);
 toast.error(err?.message || "Erro inesperado no upload.");
 }
 };

 const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 handleFileUpload(file);
 }
 };

 const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(true);
 };

 const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(false);
 };

 const handleDrop = (e: DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDragging(false);
 const file = e.dataTransfer.files?.[0];
 if (file) {
 handleFileUpload(file);
 }
 };

 const handleClear = () => {
 if (onRemove) {
 onRemove();
 } else {
 onChange("");
 }
 setManualUrl("");
 };

 const handleApplyManualUrl = () => {
 if (!manualUrl.trim()) return;
 onChange(manualUrl.trim());
 setShowManualInput(false);
 toast.success("Link configurado!");
 };

 const hasFile = Boolean(value && value.trim().length > 0);
 const isImage = hasFile && isImageFile(value!);
 const isPdf = hasFile && isPdfFile(value!);
 const fileName = hasFile ? getFileNameFromUrl(value!) : "";

 return (
 <div className={cn("space-y-2", className)}>
 {label && (
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Paperclip className="size-3.5 text-muted-foreground" />
 <span>{label}</span>
 </label>
 {showExternalUrlOption && !hasFile && (
 <button
 type="button"
 onClick={() => setShowManualInput(!showManualInput)}
 className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
 >
 <LinkIcon className="size-3" />
 <span>{showManualInput ? "Cancelar URL" : "Colar Link Externo"}</span>
 </button>
 )}
 </div>
 )}

 {/* Hidden Native File Input */}
 <input
 ref={inputRef}
 type="file"
 accept={accept}
 onChange={handleInputChange}
 className="hidden"
 disabled={isUploading}
 />

 {/* State 1: File is Uploaded */}
 {hasFile ? (
 <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-2xs transition-all">
 <div className="flex items-center gap-3">
 {/* Thumbnail Preview */}
 <div className="size-14 rounded-xl overflow-hidden bg-muted/60 border border-border/60 shrink-0 flex items-center justify-center relative group">
 {isImage ? (
 <img
 src={value!}
 alt="Anexo"
 className="size-full object-cover transition-transform group-hover:scale-105"
 onError={(e) => {
 (e.target as any).style.display = "none";
 }}
 />
 ) : isPdf ? (
 <div className="flex flex-col items-center justify-center text-rose-500 font-bold">
 <FileText className="size-6" />
 <span className="text-[9px] uppercase tracking-wider font-mono">PDF</span>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center text-primary font-bold">
 <Paperclip className="size-6" />
 <span className="text-[9px] uppercase tracking-wider font-mono">DOC</span>
 </div>
 )}
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0 space-y-0.5">
 <div className="flex items-center gap-1.5">
 <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
 <p className="text-xs font-bold text-foreground truncate">{fileName}</p>
 </div>
 <p className="text-[11px] text-muted-foreground truncate font-mono">
 {value}
 </p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1 shrink-0">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 asChild
 className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
 title="Abrir anexo em nova aba"
 >
 <a href={value!} target="_blank" rel="noopener noreferrer">
 <ExternalLink className="size-4" />
 </a>
 </Button>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleClear}
 className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
 title="Remover anexo"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 </div>
 ) : showManualInput ? (
 /* State 2: Manual URL fallback input */
 <div className="space-y-2 rounded-2xl border border-dashed border-border bg-muted/20 p-3">
 <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
 <span>Informe o link público do arquivo (HTTPS)</span>
 <button
 type="button"
 onClick={() => setShowManualInput(false)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="size-3.5" />
 </button>
 </div>
 <div className="flex gap-2">
 <Input
 type="url"
 value={manualUrl}
 onChange={(e) => setManualUrl(e.target.value)}
 placeholder="https://storage... ou link externo"
 className="h-9 text-xs rounded-xl flex-1 bg-background"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleApplyManualUrl();
 }
 }}
 />
 <Button
 type="button"
 size="sm"
 onClick={handleApplyManualUrl}
 className="rounded-xl text-xs font-bold h-9 px-3"
 >
 Aplicar
 </Button>
 </div>
 </div>
 ) : (
 /* State 3: Dropzone & Upload Button */
 <div
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 onClick={() => !isUploading && inputRef.current?.click()}
 className={cn(
 "rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center select-none",
 compact ? "p-4 gap-2" : "p-5 gap-2.5",
 isDragging
 ? "border-primary bg-primary/5 scale-[0.99]"
 : "border-border/80 bg-muted/10 hover:bg-muted/30 hover:border-border",
 isUploading && "opacity-70 pointer-events-none"
 )}
 >
 {isUploading ? (
 <div className="flex flex-col items-center gap-2 py-2">
 <Loader2 className="size-6 animate-spin text-primary" />
 <p className="text-xs font-bold text-foreground">Enviando anexo para a nuvem...</p>
 <p className="text-[10px] text-muted-foreground">Processando e salvando com segurança</p>
 </div>
 ) : (
 <>
 <div className="size-10 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground border border-border/60">
 <UploadCloud className="size-5 text-primary" />
 </div>

 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground">
 Clique para selecionar <span className="font-normal text-muted-foreground">ou arraste para cá</span>
 </p>
 {helperText && (
 <p className="text-[11px] text-muted-foreground">{helperText}</p>
 )}
 </div>
 </>
 )}
 </div>
 )}
 </div>
 );
}
