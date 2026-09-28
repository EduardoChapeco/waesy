import React, { useState, useRef } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChatCircleDots, Plus, X, ImageSquare, PencilSimple, FilmStrip, AirplaneTilt, Newspaper, CircleNotch, MapPin, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createPost, type PostType } from "@/services/social.functions";
import { uploadPostMedia } from "@/services/storage.functions";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FloatingCommunityDockProps {
 session?: any;
}

export function FloatingCommunityDock({ session }: FloatingCommunityDockProps) {
 const router = useRouter();
 const queryClient = useQueryClient();

 const [isExpanded, setIsExpanded] = useState(false);
 const [activeFormat, setActiveFormat] = useState<PostType>("simple");
 const [content, setContent] = useState("");
 const [newsTitle, setNewsTitle] = useState("");
 const [newsSource, setNewsSource] = useState("");
 const [travelOrigin, setTravelOrigin] = useState("");
 const [travelDestination, setTravelDestination] = useState("");
 const [mediaUrls, setMediaUrls] = useState<string[]>([]);
 const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: "image" | "video" }[]>([]);
 const [isUploading, setIsUploading] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [locationName, setLocationName] = useState("");

 const fileInputRef = useRef<HTMLInputElement>(null);

 // Identity extraction
 const user = session?.user || session;
 const userName =
 user?.user_metadata?.full_name ||
 user?.name ||
 user?.email?.split("@")[0] ||
 "Você";
 const userAvatar = user?.user_metadata?.avatar_url || user?.avatar_url || "";
 const userInitial = userName.charAt(0).toUpperCase();

 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const isVideo = file.type.startsWith("video/");
 const localUrl = URL.createObjectURL(file);

 if (mediaUrls.length >= 6) {
 toast.error("Máximo de 6 mídias por post.");
 return;
 }

 setMediaPreviews((prev) => [...prev, { url: localUrl, type: isVideo ? "video" : "image" }]);
 setIsUploading(true);

 try {
 const reader = new FileReader();
 reader.onload = async () => {
 try {
 const base64Data = reader.result as string;
 const res = await uploadPostMedia({
 data: {
 fileName: file.name,
 fileType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
 base64Data,
 },
 });
 if (res?.url) {
 setMediaUrls((prev) => [...prev, res.url]);
 toast.success("Mídia anexada!");
 } else {
 throw new Error("Falha no upload.");
 }
 } catch {
 toast.error("Erro no envio da mídia.");
 setMediaPreviews((prev) => prev.filter((m) => m.url !== localUrl));
 } finally {
 setIsUploading(false);
 }
 };
 reader.readAsDataURL(file);
 } catch {
 setIsUploading(false);
 setMediaPreviews((prev) => prev.filter((m) => m.url !== localUrl));
 }
 };

 const handleRemoveMedia = (index: number) => {
 setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
 setMediaUrls((prev) => prev.filter((_, i) => i !== index));
 };

 const resetForm = () => {
 setContent("");
 setNewsTitle("");
 setNewsSource("");
 setTravelOrigin("");
 setTravelDestination("");
 setMediaUrls([]);
 setMediaPreviews([]);
 setLocationName("");
 setIsExpanded(false);
 };

 const handlePublish = async () => {
 if (isSubmitting || isUploading) return;
 if (!content.trim() && mediaUrls.length === 0 && !newsTitle.trim()) {
 toast.error("Escreva algo ou anexe uma foto para publicar.");
 return;
 }

 setIsSubmitting(true);
 try {
 const metadata: Record<string, any> = {};

 if (activeFormat === "news") {
 metadata.is_news = true;
 metadata.title = newsTitle.trim() || content.slice(0, 60);
 metadata.source = newsSource.trim() || "Waesy News";
 metadata.subtitle = content.trim();
 } else if (activeFormat === "travel") {
 metadata.is_triptych = true;
 metadata.origin_city = travelOrigin.trim() || "Chapecó";
 metadata.dest_city = travelDestination.trim() || locationName || "Destino Especial";
 metadata.travel_headline = content.trim() || "Some moments shouldn't wait";
 }

 await createPost({
 data: {
 content_text: content.trim() || undefined,
 media_urls: mediaUrls,
 layout_style: activeFormat === "instagram_carousel" ? "carousel" : "grid",
 post_type: activeFormat,
 location_name: locationName.trim() || undefined,
 metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
 as_store: false,
 reference_type: activeFormat === "news" ? "news" : "none",
 },
 });

 toast.success("Publicado no Mural com sucesso!");
 resetForm();

 await router.invalidate();
 await queryClient.resetQueries({ queryKey: ["mural-feed"] });
 await queryClient.refetchQueries({ queryKey: ["mural-feed"] });
 } catch (err: any) {
 toast.error(err.message || "Erro ao publicar.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const formats = [
 { id: "simple", label: "Post", icon: PencilSimple },
 { id: "grid", label: "Grid", icon: ImageSquare },
 { id: "news", label: "Notícia", icon: Newspaper },
 { id: "travel", label: "Viagem", icon: AirplaneTilt },
 { id: "instagram_carousel", label: "Carrossel", icon: FilmStrip },
 ] as const;

 return (
 <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
 {/* ── Card Minimalista Expansível (Card Flutuante Expansível) ── */}
 {isExpanded && (
 <div className="w-[90vw] sm:w-[420px] bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
 {/* Header do Floating Composer */}
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2.5">
 <Avatar className="size-8 rounded-full border border-border/60">
 <AvatarImage src={userAvatar} alt={userName} />
 <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
 {userInitial}
 </AvatarFallback>
 </Avatar>
 <div>
 <p className="text-xs font-bold text-foreground leading-none">{userName}</p>
 <p className="text-[10px] text-muted-foreground mt-0.5">Novo Post no Feed</p>
 </div>
 </div>

 <button
 onClick={() => setIsExpanded(false)}
 className="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
 aria-label="Fechar compositor"
 >
 <X size={15} weight="bold" />
 </button>
 </div>

 {/* Formatos de Post em Cápsulas */}
 <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
 {formats.map((fmt) => {
 const Icon = fmt.icon;
 const isSelected = activeFormat === fmt.id;
 return (
 <button
 key={fmt.id}
 type="button"
 onClick={() => setActiveFormat(fmt.id as PostType)}
 className={cn(
 "px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0",
 isSelected
 ? "bg-foreground text-background shadow-xs"
 : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 <Icon size={12} weight="bold" />
 <span>{fmt.label}</span>
 </button>
 );
 })}
 </div>

 {/* Campos Específicos para Notícia */}
 {activeFormat === "news" && (
 <div className="space-y-2 p-2.5 rounded-2xl bg-muted/40 border border-border/80">
 <Input
 value={newsTitle}
 onChange={(e) => setNewsTitle(e.target.value)}
 placeholder="Manchete Editorial..."
 className="h-8 text-xs font-bold bg-background border-border/60"
 />
 <Input
 value={newsSource}
 onChange={(e) => setNewsSource(e.target.value)}
 placeholder="Fonte / Veículo (ex: Waesy News, G1)..."
 className="h-7 text-[11px] bg-background border-border/60"
 />
 </div>
 )}

 {/* Campos Específicos para Viagem */}
 {activeFormat === "travel" && (
 <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-300/30">
 <Input
 value={travelOrigin}
 onChange={(e) => setTravelOrigin(e.target.value)}
 placeholder="Origem (ex: Chapecó)"
 className="h-7 text-[11px] bg-background border-border/60"
 />
 <Input
 value={travelDestination}
 onChange={(e) => setTravelDestination(e.target.value)}
 placeholder="Destino"
 className="h-7 text-[11px] bg-background border-border/60"
 />
 </div>
 )}

 {/* Corpo do Texto */}
 <Textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 placeholder="O que está acontecendo na comunidade?"
 className="border-none shadow-none focus-visible:ring-0 resize-none text-xs p-1 min-h-[75px] bg-transparent placeholder:text-muted-foreground/60 leading-relaxed"
 />

 {/* Mídias Anexadas */}
 {mediaPreviews.length > 0 && (
 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
 {mediaPreviews.map((media, idx) => (
 <div
 key={idx}
 className="relative size-16 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 group"
 >
 <img src={media.url} alt="Preview" className="size-full object-cover" />
 <button
 type="button"
 onClick={() => handleRemoveMedia(idx)}
 className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive transition-colors cursor-pointer"
 >
 <Trash size={10} weight="bold" />
 </button>
 </div>
 ))}
 </div>
 )}

 {/* Barra Inferior com Anexo e Botão Publicar */}
 <div className="flex items-center justify-between pt-2 border-t border-border/40">
 <div className="flex items-center gap-1.5">
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*,video/*"
 onChange={handleFileSelect}
 className="hidden"
 />
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading || mediaPreviews.length >= 6}
 className="h-8 px-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
 >
 {isUploading ? (
 <CircleNotch size={13} className="animate-spin text-primary" />
 ) : (
 <ImageSquare size={15} weight="bold" className="text-primary" />
 )}
 <span>Foto/Vídeo</span>
 </Button>

 <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-lg">
 <MapPin size={11} className="text-muted-foreground" />
 <Input
 value={locationName}
 onChange={(e) => setLocationName(e.target.value)}
 placeholder="Local..."
 className="h-6 border-none shadow-none focus-visible:ring-0 text-[10px] p-0 w-20 bg-transparent"
 />
 </div>
 </div>

 <Button
 onClick={handlePublish}
 disabled={isSubmitting || isUploading || (!content.trim() && mediaUrls.length === 0 && !newsTitle.trim())}
 size="sm"
 className="bg-primary text-primary-foreground font-bold rounded-xl h-8 px-4 text-xs hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-xs"
 >
 {isSubmitting ? (
 <>
 <CircleNotch size={12} className="animate-spin mr-1" />
 <span>Publicando...</span>
 </>
 ) : (
 "Publicar"
 )}
 </Button>
 </div>
 </div>
 )}

 {/* ── Botões Flutuantes da Dock (Chat + Criar Post) ── */}
 <div className="flex items-center gap-2.5">
 {/* Botão Flutuante de Conversas / Chat */}
 <Button
 asChild
 size="icon"
 className="size-11 sm:size-12 rounded-2xl bg-card border border-border/80 text-foreground hover:bg-muted shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
 title="Abrir Conversas e Mensagens"
 >
 <Link to="/conta/conversas/$id" params={{ id: "novo" }}>
 <ChatCircleDots size={22} weight="bold" className="text-primary" />
 </Link>
 </Button>

 {/* Botão Flutuante Criar Publicação (Ação Flutuante Expansível) */}
 <Button
 onClick={() => setIsExpanded(!isExpanded)}
 className={cn(
 "h-11 sm:h-12 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer",
 isExpanded ? "ring-2 ring-primary/40 bg-foreground text-background" : ""
 )}
 >
 <Plus size={18} weight="bold" className={isExpanded ? "rotate-45 transition-transform" : "transition-transform"} />
 <span className="hidden sm:inline">Criar Post</span>
 </Button>
 </div>
 </div>
 );
}
