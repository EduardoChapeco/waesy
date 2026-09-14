import React, { useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
 ImageSquare,
 FilmStrip,
 X,
 Plus,
 Trash,
 MapPin,
 ListBullets,
 CircleNotch,
 ChatCircleText,
} from "@phosphor-icons/react";
import {
 Drawer,
 DrawerContent,
 DrawerHeader,
 DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createPost } from "@/services/social.functions";
import {
 uploadPostMedia,
 getPostMediaSignedUrl,
} from "@/services/storage.functions";
import { Highlighter } from "lucide-react";
import { extractMediaFromClipboard, fileToBase64 } from "@/lib/clipboard-media";

export interface ThreadNode {
 id: string;
 text: string;
 media_url?: string;
 media_type?: "image" | "video";
}

export interface PostCreationDrawerProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 session?: any;
 defaultFormat?: "simple" | "carousel" | "grid" | "news" | "travel" | "threads" | "moment";
}

export function PostCreationDrawer({
 open,
 onOpenChange,
 session,
 defaultFormat = "simple",
}: PostCreationDrawerProps) {
 const router = useRouter();
 const queryClient = useQueryClient();

 const [activeFormat, setActiveFormat] = useState<
 "simple" | "carousel" | "grid" | "news" | "travel" | "threads" | "moment"
 >(defaultFormat);

 // Common Post Fields
 const [contentText, setContentText] = useState("");
 const [newsTitle, setNewsTitle] = useState("");
 const [newsSource, setNewsSource] = useState("");
 const [travelOrigin, setTravelOrigin] = useState("");
 const [travelDestination, setTravelDestination] = useState("");
 const [mediaUrls, setMediaUrls] = useState<string[]>([]);
 const [mediaPreviews, setMediaPreviews] = useState<
 { url: string; type: "image" | "video"; file?: File }[]
 >([]);
 const [isUploadingMedia, setIsUploadingMedia] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [locationName, setLocationName] = useState("");

 // Threads Multi-Node Fields
 const [threadNodes, setThreadNodes] = useState<ThreadNode[]>([
 { id: "node-1", text: "" },
 { id: "node-2", text: "" },
 ]);

 const fileInputRef = useRef<HTMLInputElement>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 // Identity extraction (strictly personal)
 const user = session?.user || session;
 const userName =
 user?.user_metadata?.full_name ||
 user?.name ||
 user?.email?.split("@")[0] ||
 "Membro Waesy";
 const userAvatar = user?.user_metadata?.avatar_url || user?.avatar_url || "";
 const userInitial = userName.charAt(0).toUpperCase();

 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;

 const file = files[0];
 const isVideo = file.type.startsWith("video/");
 const localUrl = URL.createObjectURL(file);

 setIsUploadingMedia(true);
 setMediaPreviews((prev) => [
 ...prev,
 { url: localUrl, type: isVideo ? "video" : "image", file },
 ]);

 try {
 const signedRes = await getPostMediaSignedUrl({
 data: {
 fileName: file.name,
 contentType: file.type,
 },
 }).catch(() => null);

 if (signedRes?.signedUrl && signedRes?.publicUrl) {
 const uploadRes = await fetch(signedRes.signedUrl, {
 method: "PUT",
 headers: { "Content-Type": file.type },
 body: file,
 });

 if (uploadRes.ok) {
 setMediaUrls((prev) => [...prev, signedRes.publicUrl]);
 toast.success("Mídia carregada com sucesso!");
 setIsUploadingMedia(false);
 return;
 }
 }

 // Convert to base64 fallback for uploadPostMedia
 const reader = new FileReader();
 reader.onload = async () => {
 try {
 const base64Data = reader.result as string;
 const uploadRes = await uploadPostMedia({
 data: {
 fileName: file.name,
 fileType: file.type,
 base64Data,
 },
 });
 if (uploadRes?.url) {
 setMediaUrls((prev) => [...prev, uploadRes.url]);
 toast.success("Mídia carregada com sucesso!");
 }
 } catch {
 toast.error("Erro ao enviar imagem.");
 } finally {
 setIsUploadingMedia(false);
 }
 };
 reader.readAsDataURL(file);
 return;
 } catch (err: unknown) {
 console.warn("Storage upload fallback: usando URL local simulada.", err);
 setMediaUrls((prev) => [...prev, localUrl]);
 toast.success("Mídia anexada à publicação.");
 } finally {
 setIsUploadingMedia(false);
 if (fileInputRef.current) fileInputRef.current.value = "";
 }
 };

 const handleRemoveMedia = (index: number) => {
 setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
 setMediaUrls((prev) => prev.filter((_, i) => i !== index));
 };

 const handleInsertHighlight = () => {
 const textarea = textareaRef.current;
 if (!textarea) return;

 const start = textarea.selectionStart;
 const end = textarea.selectionEnd;
 const selectedText = contentText.substring(start, end);

 let newContent: string;
 let newCursorPos: number;

 if (selectedText.length > 0) {
 if (selectedText.startsWith("==") && selectedText.endsWith("==") && selectedText.length >= 4) {
 const unwrapped = selectedText.slice(2, -2);
 newContent = contentText.substring(0, start) + unwrapped + contentText.substring(end);
 newCursorPos = start + unwrapped.length;
 } else {
 const wrapped = `==${selectedText}==`;
 newContent = contentText.substring(0, start) + wrapped + contentText.substring(end);
 newCursorPos = start + wrapped.length;
 }
 } else {
 const placeholder = "==destaque==";
 newContent = contentText.substring(0, start) + placeholder + contentText.substring(end);
 newCursorPos = start + placeholder.length;
 }

 setContentText(newContent);
 setTimeout(() => {
 textarea.focus();
 textarea.setSelectionRange(newCursorPos, newCursorPos);
 }, 50);
 };

 const handleClipboardPaste = async (e: React.ClipboardEvent) => {
 const extracted = await extractMediaFromClipboard(e);
 if (!extracted || extracted.length === 0) {
 return;
 }

 e.preventDefault();

 if (mediaUrls.length + extracted.length > 10) {
 toast.error(`Limite máximo de 10 mídias. Você pode adicionar mais ${Math.max(0, 10 - mediaUrls.length)} arquivo(s).`);
 return;
 }

 setIsUploadingMedia(true);
 toast.info(`Colando ${extracted.length} mídia(s) em alta resolução...`);

 for (const item of extracted) {
 const file = item.file;
 const isVideo = item.type === "video";
 const localUrl = item.previewUrl || URL.createObjectURL(file);

 setMediaPreviews((prev) => [
 ...prev,
 { url: localUrl, type: isVideo ? "video" : "image", file },
 ]);

 try {
 const base64Data = await fileToBase64(file);
 const uploadRes = await uploadPostMedia({
 data: {
 fileName: file.name,
 fileType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
 base64Data,
 },
 });

 if (uploadRes?.url) {
 setMediaUrls((prev) => [...prev, uploadRes.url]);
 } else {
 throw new Error("Falha ao processar URL da mídia colada.");
 }
 } catch (err: any) {
 toast.error(err?.message || `Erro no upload da mídia colada "${file.name}".`);
 setMediaPreviews((prev) => prev.filter((p) => p.url !== localUrl));
 }
 }

 setIsUploadingMedia(false);
 toast.success("Mídia(s) colada(s) com sucesso!");
 };

 const handleAddThreadNode = () => {
 if (threadNodes.length >= 10) {
 toast.error("Máximo de 10 cards por thread atingido.");
 return;
 }
 setThreadNodes((prev) => [
 ...prev,
 { id: `node-${Date.now()}`, text: "" },
 ]);
 };

 const handleRemoveThreadNode = (index: number) => {
 if (threadNodes.length <= 2) {
 toast.error("Uma thread requer pelo menos 2 cards sequenciais.");
 return;
 }
 setThreadNodes((prev) => prev.filter((_, i) => i !== index));
 };

 const handleUpdateThreadNode = (index: number, text: string) => {
 setThreadNodes((prev) =>
 prev.map((node, i) => (i === index ? { ...node, text } : node)),
 );
 };

 const resetForm = () => {
 setContentText("");
 setMediaUrls([]);
 setMediaPreviews([]);
 setLocationName("");
 setThreadNodes([
 { id: "node-1", text: "" },
 { id: "node-2", text: "" },
 ]);
 };

 const handlePublish = async () => {
 if (isSubmitting || isUploadingMedia) return;

 const isAuthenticated = Boolean(session?.user || session?.id);
 if (!isAuthenticated) {
 toast.info("Acesse sua conta para publicar no Mural.");
 onOpenChange(false);
 router.navigate({ to: "/entrar", search: { returnUrl: "/mural" } });
 return;
 }

 if (activeFormat === "simple" && !contentText.trim() && mediaUrls.length === 0) {
 toast.error("Escreva algo ou anexe uma foto para publicar.");
 return;
 }

 if (activeFormat === "moment" && mediaUrls.length === 0) {
 toast.error("Grave ou anexe um vídeo para o seu Moment.");
 return;
 }

 if (activeFormat === "carousel" && mediaUrls.length < 2) {
 toast.error("Anexe pelo menos 2 mídias para publicar um Carrossel.");
 return;
 }

 setIsSubmitting(true);

 try {
 if (activeFormat === "simple" || activeFormat === "grid") {
 await createPost({
 data: {
 content_text: contentText.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: "grid",
 post_type: activeFormat === "grid" ? "grid" : "simple",
 location_name: locationName.trim() || undefined,
 as_store: false,
 reference_type: "none",
 },
 });
 } else if (activeFormat === "news") {
 await createPost({
 data: {
 content_text: contentText.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: "grid",
 post_type: "news",
 metadata: {
 is_news: true,
 title: newsTitle.trim() || contentText.slice(0, 60),
 source: newsSource.trim() || "Waesy News",
 subtitle: contentText.trim(),
 },
 as_store: false,
 reference_type: "news",
 },
 });
 } else if (activeFormat === "travel") {
 await createPost({
 data: {
 content_text: contentText.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: "grid",
 post_type: "travel",
 metadata: {
 is_triptych: true,
 origin_city: travelOrigin.trim() || "Chapecó",
 dest_city: travelDestination.trim() || locationName || "Destino",
 travel_headline: contentText.trim() || "Some moments shouldn't wait",
 },
 as_store: false,
 reference_type: "none",
 },
 });
 } else if (activeFormat === "carousel") {
 await createPost({
 data: {
 content_text: contentText.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: "carousel",
 post_type: "instagram_carousel",
 location_name: locationName.trim() || undefined,
 as_store: false,
 reference_type: "none",
 },
 });
 } else if (activeFormat === "threads") {
 const validNodes = threadNodes.filter((n) => n.text.trim().length > 0);
 if (validNodes.length < 2) {
 toast.error("Preencha o conteúdo de pelo menos 2 cards da sua thread.");
 setIsSubmitting(false);
 return;
 }

 await createPost({
 data: {
 content_text: validNodes[0].text.trim(),
 media_urls: mediaUrls,
 layout_style: "grid",
 post_type: "threads",
 location_name: locationName.trim() || undefined,
 metadata: {
 thread_items: validNodes.map((n, idx) => ({
 step: idx + 1,
 text: n.text.trim(),
 })),
 },
 as_store: false,
 reference_type: "none",
 },
 });
 } else if (activeFormat === "moment") {
 await createPost({
 data: {
 content_text: contentText.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: "grid",
 post_type: "moment",
 location_name: locationName.trim() || "São Miguel do Oeste",
 metadata: {
 activity: "Momento da Comunidade",
 },
 as_store: false,
 reference_type: "none",
 },
 });
 }

 toast.success("Publicado no Mural com sucesso!");
 resetForm();
 onOpenChange(false);

 await router.invalidate();
 await queryClient.resetQueries({ queryKey: ["mural-feed"] });
 await queryClient.refetchQueries({ queryKey: ["mural-feed"] });
 await queryClient.invalidateQueries({ queryKey: ["moments-map"] });
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao publicar.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const formats = [
 { id: "simple", label: "Post Padrão", icon: ChatCircleText, color: "text-info" },
 { id: "grid", label: "Grid Orgânico", icon: ImageSquare, color: "text-emerald-500" },
 { id: "news", label: "Notícia Editorial", icon: ChatCircleText, color: "text-primary" },
 { id: "travel", label: "Viagem / Tríptico", icon: MapPin, color: "text-sky-500" },
 { id: "carousel", label: "Carrossel", icon: ImageSquare, color: "text-primary" },
 { id: "threads", label: "Sequência", icon: ListBullets, color: "text-primary" },
 { id: "moment", label: "Moment", icon: FilmStrip, color: "text-amber-500" },
 ] as const;

 return (
 <Drawer open={open} onOpenChange={onOpenChange}>
 <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none sm:rounded-2xl sm:h-auto sm:max-h-[90vh] border-none sm: bg-background p-0 flex flex-col overflow-hidden max-w-2xl mx-auto ">
 {/* ── Top Header Fixo (Silêncio Operacional) ── */}
 <DrawerHeader className="p-4 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur-md">
 <div className="flex items-center gap-3">
 <button
 onClick={() => onOpenChange(false)}
 className="size-9 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
 aria-label="Fechar"
 >
 <X size={18} weight="bold" />
 </button>
 <DrawerTitle className="text-base font-bold tracking-tight text-foreground">
 Criar Publicação
 </DrawerTitle>
 </div>

 <Button
 onClick={handlePublish}
 disabled={isSubmitting || isUploadingMedia}
 size="sm"
 className="bg-primary text-primary-foreground font-bold rounded-xl h-9 px-5 text-xs hover:scale-102 active:scale-98 transition-all cursor-pointer"
 >
 {isSubmitting ? (
 <>
 <CircleNotch size={14} className="animate-spin mr-1.5" />
 Publicando...
 </>
 ) : (
 "Publicar"
 )}
 </Button>
 </DrawerHeader>

 {/* ── Seletor Horizontal de Formatos Sociais Puros ── */}
 <div className="px-4 py-2.5 bg-muted/30 overflow-x-auto no-scrollbar shrink-0">
 <div className="flex items-center gap-1.5 min-w-max">
 {formats.map((fmt) => {
 const Icon = fmt.icon;
 const isActive = activeFormat === fmt.id;
 return (
 <button
 key={fmt.id}
 type="button"
 onClick={() => setActiveFormat(fmt.id)}
 className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
 isActive
 ? "bg-foreground text-background scale-102"
 : "bg-card text-muted-foreground hover:text-foreground hover:bg-card/80"
 }`}
 >
 <Icon size={14} weight={isActive ? "fill" : "bold"} className={isActive ? "" : fmt.color} />
 <span>{fmt.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* ── Corpo de Edição Rolável ── */}
 <div onPaste={handleClipboardPaste} className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4">
 {/* Identificação do Autor Pessoal */}
 <div className="flex items-center gap-3">
 <Avatar className="size-10 rounded-full ">
 <AvatarImage src={userAvatar} alt={userName} />
 <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
 {userInitial}
 </AvatarFallback>
 </Avatar>
 <div>
 <p className="text-xs font-bold text-foreground leading-none">{userName}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">Mural Comunitário</p>
 </div>
 </div>

 {/* Formatos 1, 2, 4: Simple, Carousel, Moment */}
 {(activeFormat === "simple" || activeFormat === "carousel" || activeFormat === "moment") && (
 <div className="space-y-4">
 <Textarea
 ref={textareaRef}
 value={contentText}
 onChange={(e) => setContentText(e.target.value)}
 onPaste={handleClipboardPaste}
 placeholder={
 activeFormat === "moment"
 ? "Legenda do seu momento em vídeo..."
 : activeFormat === "carousel"
 ? "Compartilhe uma sequência de fotos ou momentos... (use ==texto== para destacar)"
 : "O que está acontecendo na comunidade? (use ==texto== para destacar ou cole com Ctrl+V)"
 }
 className="w-full border-none shadow-none focus-visible:ring-0 resize-none text-sm p-0 min-h-[110px] placeholder:text-muted-foreground/60 leading-relaxed bg-transparent"
 />

 {/* Previews de Mídia */}
 {mediaPreviews.length > 0 && (
 <div className="grid grid-cols-3 gap-2.5 pt-2">
 {mediaPreviews.map((media, idx) => (
 <div
 key={idx}
 className="relative aspect-square rounded-2xl overflow-hidden bg-muted/40 group"
 >
 {media.type === "video" ? (
 <video
 src={media.url}
 className="size-full object-cover"
 muted
 playsInline
 />
 ) : (
 <img
 src={media.url}
 alt="Upload preview"
 className="size-full object-cover"
 />
 )}
 <button
 type="button"
 onClick={() => handleRemoveMedia(idx)}
 className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive transition-colors cursor-pointer"
 aria-label="Remover mídia"
 >
 <Trash size={12} weight="bold" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Formato 3: Sequência de Notas */}
 {activeFormat === "threads" && (
 <div className="space-y-3">
 <div className="space-y-3">
 {threadNodes.map((node, index) => (
 <div
 key={node.id}
 className="p-3.5 rounded-2xl bg-card space-y-2 relative "
 >
 <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
 <span className="flex items-center gap-1.5 text-primary">
 <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
 {index + 1}
 </span>
 Card #{index + 1}
 </span>
 {threadNodes.length > 2 && (
 <button
 type="button"
 onClick={() => handleRemoveThreadNode(index)}
 className="text-muted-foreground hover:text-destructive text-xs cursor-pointer p-1"
 >
 <Trash size={14} />
 </button>
 )}
 </div>
 <Textarea
 value={node.text}
 onChange={(e) => handleUpdateThreadNode(index, e.target.value)}
 placeholder={`Ponto ${index + 1} da sua reflexão...`}
 className="border-none shadow-none focus-visible:ring-0 resize-none text-xs p-0 min-h-[60px] bg-transparent"
 />
 </div>
 ))}
 </div>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddThreadNode}
 className="w-full rounded-xl text-xs font-bold border-dashed border-border gap-1.5 h-10 hover:border-primary/50"
 >
 <Plus size={14} weight="bold" /> Adicionar Card à Sequência
 </Button>
 </div>
 )}
 </div>

 {/* ── Barra Inferior de Ações e Anexos ── */}
 <div className="p-3.5 bg-background/95 backdrop-blur-md flex items-center justify-between shrink-0">
 <div className="flex items-center gap-2">
 <input
 ref={fileInputRef}
 type="file"
 accept={activeFormat === "moment" ? "video/*" : "image/*,video/*"}
 onChange={handleFileSelect}
 className="hidden"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploadingMedia || mediaPreviews.length >= 6}
 className="rounded-xl text-xs font-bold h-9 gap-1.5 px-3 cursor-pointer"
 >
 {isUploadingMedia ? (
 <>
 <CircleNotch size={14} className="animate-spin text-primary" />
 <span>Enviando...</span>
 </>
 ) : activeFormat === "moment" ? (
 <>
 <FilmStrip size={15} weight="bold" className="text-amber-500" />
 <span>Adicionar Vídeo</span>
 </>
 ) : (
 <>
 <ImageSquare size={15} weight="bold" className="text-primary" />
 <span>Foto / Vídeo</span>
 </>
 )}
 </Button>

 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleInsertHighlight}
 className="rounded-xl text-xs font-bold h-9 gap-1.5 px-3 hover:bg-amber-300/20 hover:text-amber-800 dark:hover:text-amber-200 transition-colors cursor-pointer"
 title="Destacar com marca-texto estilo Threads (==texto==)"
 >
 <Highlighter size={15} className="text-amber-500" />
 <span>Destaque</span>
 </Button>

 <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-xl ">
 <MapPin size={13} className="text-muted-foreground shrink-0" />
 <Input
 value={locationName}
 onChange={(e) => setLocationName(e.target.value)}
 placeholder="Localização..."
 className="h-7 border-none shadow-none focus-visible:ring-0 text-xs p-0 w-28 bg-transparent"
 />
 </div>
 </div>
 </div>
 </DrawerContent>
 </Drawer>
 );
}
