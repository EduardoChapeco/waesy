import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
 X,
 Heart,
 ShareNetwork,
 NavigationArrow,
 MapPin,
 BeerBottle,
 Clock,
 CheckCircle,
 ChatCircle,
 Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/datetime";
import { togglePostLike } from "@/services/social.functions";
import { toast } from "sonner";

interface MomentDetailDrawerProps {
 moment: any;
 onClose: () => void;
}

export function MomentDetailDrawer({ moment, onClose }: MomentDetailDrawerProps) {
  const [likesCount, setLikesCount] = useState<number>(Number(moment.likes_count) || 0);
 const [isLiked, setIsLiked] = useState(false);
 const [isLiking, setIsLiking] = useState(false);

 const handleToggleLike = async () => {
 if (isLiking) return;
 setIsLiking(true);

 const nextLiked = !isLiked;
 setIsLiked(nextLiked);
 setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

 try {
 if (moment.id && !moment.id.startsWith("m-seed-")) {
 await togglePostLike({ data: { post_id: moment.id } });
 }
 toast.success(nextLiked ? "Você curtiu esse momento!" : "Curtida removida.");
 } catch {
 // Revert silently if not authenticated
 } finally {
 setIsLiking(false);
 }
 };

 const handleShare = () => {
 if (typeof window !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(`${window.location.origin}/mapa?moment=${moment.id}`);
 toast.success("Link do momento copiado!");
 }
 };

 return (
 <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden animate-in fade-in-50 duration-200">
 {/* ── 1. FOTO EM ALTA RESOLUÇÃO COM BADGES FLUTUANTES ── */}
 <div className="relative aspect-4/3 w-full bg-muted overflow-hidden shrink-0">
 {moment.image_url ? (
 <img
 src={moment.image_url}
 alt={moment.title}
 className="size-full object-cover"
 />
 ) : (
 <div className="size-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold">
 Sem foto anexada
 </div>
 )}

 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

 {/* Botão Fechar no Topo */}
 <button
 type="button"
 onClick={onClose}
 className="absolute top-3 right-3 size-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer z-10"
 aria-label="Fechar momento"
 >
 <X size={16} weight="bold" />
 </button>

 {/* Badges de Ao Vivo & Tempo */}
 <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-destructive/90 text-white backdrop-blur-md animate-pulse">
 <span className="size-1.5 rounded-full bg-white animate-ping" />
 Ao Vivo
 </span>

 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
 <Clock size={12} />
 <span>{formatRelativeTime(moment.created_at || new Date().toISOString())}</span>
 </span>
 </div>

 {/* Autor do Momento sobreposto na foto */}
 <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white z-10">
 <div className="flex items-center gap-2 min-w-0">
 {moment.avatar_url ? (
 <img
 src={moment.avatar_url}
 alt={moment.author_name}
 className="size-9 rounded-full object-cover border-2 border-white/80 shrink-0"
 />
 ) : (
 <div className="size-9 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center border-2 border-white/80 shrink-0">
 {(moment.author_name || "M")[0].toUpperCase()}
 </div>
 )}

 <div className="min-w-0">
 <span className="text-xs font-bold truncate block drop-">
 {moment.author_name || "Membro Comunitário"}
 </span>
 <span className="text-[10px] text-white/80 flex items-center gap-1 truncate drop-">
 <MapPin size={10} weight="fill" className="text-primary" />
 <span>{moment.title || "Chapecó"}</span>
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* ── 2. CONTEÚDO DO MOMENTO (O QUE ESTÁ ROLANDO) ── */}
 <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar space-y-3">
 <div className="space-y-3">
 {/* Legenda do Momento */}
 <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">
 {moment.subtitle || moment.content_text || "Aproveitando o dia na cidade!"}
 </p>

 {/* Banner de Mesa Aberta para Dividir Conta */}
 {moment.is_bill_split_open && (
 <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
 <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
 <BeerBottle size={16} weight="fill" />
 <span>Mesa Aberta para Dividir Conta!</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-snug">
 {moment.author_name} abriu a mesa para quem quiser chegar, socializar e rachar o consumo no local!
 </p>
 <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-foreground">
 <span className="px-2 py-0.5 rounded-lg bg-card ">
 Capacidade: {moment.table_size || 6} pessoas
 </span>
 <span className="text-emerald-600 flex items-center gap-1">
 <CheckCircle size={12} weight="fill" />
 Mesa ativa agora
 </span>
 </div>
 </div>
 )}
 </div>

 {/* ── 3. BOTÕES DE INTERAÇÃO SOCIAL E NAVEGAÇÃO ── */}
 <div className="space-y-2 pt-2 ">
 <div className="flex items-center gap-2">
 {/* Botão de Curtir com Coração */}
 <Button
 type="button"
 variant={isLiked ? "default" : "outline"}
 onClick={handleToggleLike}
 className={`h-9 px-3 rounded-xl text-xs font-bold gap-1.5 flex-1 transition-all cursor-pointer ${
 isLiked
 ? "bg-rose-500 text-white hover:bg-rose-600 border-rose-500"
 : "border-border hover:border-rose-500/50 hover:text-rose-500"
 }`}
 >
 <Heart size={16} weight={isLiked ? "fill" : "regular"} className={isLiked ? "animate-bounce" : ""} />
 <span>{likesCount} Curtidas</span>
 </Button>

 {/* Rotas no Mapa */}
 {moment.lat && moment.lng && (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-9 px-3 rounded-xl text-xs font-bold border-border gap-1.5 flex-1"
 >
 <a
 href={`https://www.google.com/maps/dir/?api=1&destination=${moment.lat},${moment.lng}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <NavigationArrow size={14} weight="bold" className="text-primary" />
 <span>Chegar Junto</span>
 </a>
 </Button>
 )}

 {/* Compartilhar */}
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={handleShare}
 className="size-9 rounded-xl border-border shrink-0 cursor-pointer"
 title="Compartilhar momento"
 >
 <ShareNetwork size={16} weight="bold" />
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}
