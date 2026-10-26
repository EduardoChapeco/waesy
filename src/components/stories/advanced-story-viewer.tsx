/**
 * advanced-story-viewer.tsx — Visualizador de Stories Imersivo
 * Suporte a Fotos, Vídeos de até 60s, Interrupção de Vídeos Longos (5s countdown), Stickers, Collabs e Telemetria
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, CaretLeft, CaretRight, SpeakerHigh, SpeakerSimpleSlash, ShoppingBag, SealCheck, Handshake, ArrowRight, Storefront, WhatsappLogo, ShareNetwork, Clock, WarningCircle, Play, Pause } from "@phosphor-icons/react";
import { type StoryGroupDTO, type StoryMediaItemDTO, recordStoryTelemetry } from "@/services/stories.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdvancedStoryViewerProps {
 groups: StoryGroupDTO[];
 initialGroupIndex?: number;
 initialStoryIndex?: number;
 isOpen: boolean;
 onClose: () => void;
}

export function AdvancedStoryViewer({
 groups,
 initialGroupIndex = 0,
 initialStoryIndex = 0,
 isOpen,
 onClose,
}: AdvancedStoryViewerProps) {
 const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
 const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
 const [progress, setProgress] = useState(0);
 const [isPaused, setIsPaused] = useState(false);
 const [isMuted, setIsMuted] = useState(false);

 // Controle de Vídeo Longo (>60s)
 const [showLongPrompt, setShowLongPrompt] = useState(false);
 const [longPromptCountdown, setLongPromptCountdown] = useState(5);

 const videoRef = useRef<HTMLVideoElement | null>(null);
 const progressTimerRef = useRef<any>(null);
 const longCountdownTimerRef = useRef<any>(null);
 const holdStartRef = useRef<number | null>(null);

 const currentGroup = groups[groupIndex];
 const currentStory = currentGroup?.stories[storyIndex];

 // Sincronizar índices iniciais ao abrir
 useEffect(() => {
 if (isOpen) {
 setGroupIndex(initialGroupIndex);
 setStoryIndex(initialStoryIndex);
 setProgress(0);
 setShowLongPrompt(false);
 setIsPaused(false);
 }
 }, [isOpen, initialGroupIndex, initialStoryIndex]);

 // Avançar para o próximo story ou próximo grupo
 const handleNext = useCallback(() => {
 setShowLongPrompt(false);
 setProgress(0);

 if (!currentGroup) return;

 if (storyIndex < currentGroup.stories.length - 1) {
 setStoryIndex((prev) => prev + 1);
 } else if (groupIndex < groups.length - 1) {
 setGroupIndex((prev) => prev + 1);
 setStoryIndex(0);
 } else {
 onClose();
 }
 }, [storyIndex, groupIndex, currentGroup, groups.length, onClose]);

 // Voltar para o story anterior ou grupo anterior
 const handlePrev = useCallback(() => {
 setShowLongPrompt(false);
 setProgress(0);

 if (storyIndex > 0) {
 setStoryIndex((prev) => prev - 1);
 } else if (groupIndex > 0) {
 const prevGroup = groups[groupIndex - 1];
 setGroupIndex((prev) => prev - 1);
 setStoryIndex(prevGroup.stories.length - 1);
 } else {
 setProgress(0);
 }
 }, [storyIndex, groupIndex, groups]);

 // Registrar visualização e telemetria
 useEffect(() => {
 if (isOpen && currentStory) {
 recordStoryTelemetry({
 data: {
 storyId: currentStory.id,
 eventType: "view",
 watchTimeSeconds: 0,
 },
 }).catch(() => {});
 }
 }, [isOpen, currentStory?.id]);

 // Motor de Progresso do Story
 useEffect(() => {
 if (!isOpen || !currentStory || isPaused || showLongPrompt) {
 if (progressTimerRef.current) clearInterval(progressTimerRef.current);
 return;
 }

 const duration = (currentStory.duration_seconds || 15) * 1000;
 const intervalMs = 40;
 const increment = (intervalMs / duration) * 100;

 progressTimerRef.current = setInterval(() => {
 setProgress((prev) => {
 // Se ultrapassar 60s em story longo e ainda não exibiu o prompt
 if (currentStory.duration_seconds > 60 && prev >= (60 / currentStory.duration_seconds) * 100 && !showLongPrompt) {
 setShowLongPrompt(true);
 setIsPaused(true);
 return prev;
 }

 if (prev >= 100) {
 handleNext();
 return 0;
 }
 return prev + increment;
 });
 }, intervalMs);

 return () => {
 if (progressTimerRef.current) clearInterval(progressTimerRef.current);
 };
 }, [isOpen, currentStory, isPaused, showLongPrompt, handleNext]);

 // Contagem regressiva de 5 segundos para pular vídeo longo
 useEffect(() => {
 if (showLongPrompt) {
 setLongPromptCountdown(5);
 longCountdownTimerRef.current = setInterval(() => {
 setLongPromptCountdown((prev) => {
 if (prev <= 1) {
 clearInterval(longCountdownTimerRef.current);
 setShowLongPrompt(false);
 setIsPaused(false);
 handleNext(); // Pula automaticamente se não interagir em 5s
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 return () => {
 if (longCountdownTimerRef.current) clearInterval(longCountdownTimerRef.current);
 };
 }
 }, [showLongPrompt, handleNext]);

 // Ação de Continuar Assistindo Vídeo Longo
 const handleContinueLongStory = () => {
 if (longCountdownTimerRef.current) clearInterval(longCountdownTimerRef.current);
 setShowLongPrompt(false);
 setIsPaused(false);
 if (videoRef.current) {
 videoRef.current.play().catch(() => {});
 }
 };

 // Gestos de Touch / Pointer Hold para pausar
 const handlePointerDown = () => {
 holdStartRef.current = Date.now();
 setIsPaused(true);
 if (videoRef.current) videoRef.current.pause();
 };

 const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
 const holdDuration = Date.now() - (holdStartRef.current || 0);
 setIsPaused(false);
 if (videoRef.current && !showLongPrompt) videoRef.current.play().catch(() => {});

 // Se foi apenas um clique rápido (não hold)
 if (holdDuration < 250) {
 const rect = e.currentTarget.getBoundingClientRect();
 const clickX = e.clientX - rect.left;
 const width = rect.width;

 if (clickX < width * 0.35) {
 handlePrev();
 } else {
 handleNext();
 }
 }
 };

 if (!isOpen || !currentGroup || !currentStory) return null;

 const isVideo =
 currentStory.media_url.includes(".mp4") ||
 currentStory.media_url.includes(".webm") ||
 currentStory.media_url.includes(".mov");

 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-2xl transition-colors duration-300 select-none motion-reduce:transition-none"
 role="dialog"
 aria-modal="true"
 aria-label={`Stories de ${currentGroup.entityName}`}
 >
 {/* Botão de Fechar no Topo Direito */}
 <button
 onClick={onClose}
 className="size-11 min-h-11 min-w-11 absolute top-4 right-4 z-50 p-2 rounded-full bg-card/80 hover:bg-muted text-foreground backdrop-blur-md transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center"
 aria-label="Fechar visualizador de stories"
 >
 <X size={22} weight="bold" />
 </button>

 {/* Navegação entre Grupos (Desktop Chevrons) */}
 {groupIndex > 0 && (
 <button
 onClick={() => {
 setGroupIndex((prev) => prev - 1);
 setStoryIndex(0);
 setProgress(0);
 }}
 className="hidden md:flex size-11 min-h-11 min-w-11 absolute left-8 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-card/80 hover:bg-muted text-foreground backdrop-blur-md transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none items-center justify-center"
 aria-label="Loja anterior"
 >
 <CaretLeft size={28} weight="bold" />
 </button>
 )}

 {groupIndex < groups.length - 1 && (
 <button
 onClick={() => {
 setGroupIndex((prev) => prev + 1);
 setStoryIndex(0);
 setProgress(0);
 }}
 className="hidden md:flex size-11 min-h-11 min-w-11 absolute right-8 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-card/80 hover:bg-muted text-foreground backdrop-blur-md transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none items-center justify-center"
 aria-label="Próxima loja"
 >
 <CaretRight size={28} weight="bold" />
 </button>
 )}

 {/* ── Frame Central do Story (Proporção 9:16 Responsiva) ── */}
 <div
 className="relative w-full max-w-sm md:max-w-md h-full sm:h-5/6 sm:max-h-full sm:rounded-2xl overflow-hidden bg-card border border-border/40 shadow-2xs flex flex-col justify-between"
 onPointerDown={handlePointerDown}
 onPointerUp={handlePointerUp}
 >
 {/* ── 1. Barras de Progresso Segmentadas no Topo ── */}
 <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-2 pointer-events-none">
 {currentGroup.stories.map((s, idx) => (
 <div key={s.id} className="h-1 flex-1 rounded-full bg-foreground/30 overflow-hidden backdrop-blur-xs">
 <div
 className="h-full bg-foreground transition-colors duration-75 ease-linear"
 style={{
 width: idx < storyIndex ? "100%" : idx === storyIndex ? `${progress}%` : "0%",
 }}
 />
 </div>
 ))}
 </div>

 {/* ── 2. Cabeçalho do Autor / Loja / Criador ── */}
 <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-full overflow-hidden border-2 border-primary bg-zinc-800 shrink-0">
 {currentGroup.entityAvatarUrl ? (
 <img
 src={currentGroup.entityAvatarUrl}
 alt={currentGroup.entityName}
 onError={(e) => {
   (e.currentTarget as HTMLElement).style.display = "none";
 }}
 className="size-full object-cover"
 />
 ) : (
 <div className="size-full flex items-center justify-center bg-primary/20 text-primary font-bold text-xs">
 {currentGroup.entityName.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-foreground leading-none truncate">
 {currentGroup.entityName}
 </span>

 {currentGroup.isOfficialAmbassador && (
 <Badge className="bg-primary text-primary-foreground text-2xs font-black px-2 py-1 rounded-md border-0">
 <SealCheck size={11} weight="fill" className="mr-1" />
 {currentGroup.ambassadorBadgeLabel || "Embaixador"}
 </Badge>
 )}

 {currentStory.is_sponsored && (
 <Badge className="bg-secondary text-secondary-foreground text-2xs font-black px-2 py-1 rounded-md">
 Patrocinado
 </Badge>
 )}
 </div>

 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 {currentGroup.entityHandle && <span>{currentGroup.entityHandle}</span>}
 <span>•</span>
 <span>Há 3h</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-1">
 {isVideo && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setIsMuted(!isMuted);
 }}
 className="size-11 min-h-11 min-w-11 flex items-center justify-center rounded-full bg-card/80 text-foreground hover:bg-muted backdrop-blur-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 aria-label={isMuted ? "Ativar som" : "Desativar som"}
 >
 {isMuted ? <SpeakerSimpleSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
 </button>
 )}
 </div>
 </div>

 {/* ── 3. Mídia Central (Foto ou Vídeo em Alta Definição) ── */}
 <div className="absolute inset-0 size-full flex items-center justify-center bg-muted">
 {isVideo ? (
 <video
 ref={videoRef}
 src={currentStory.media_url}
 autoPlay
 playsInline
 muted={isMuted}
 className="size-full object-cover"
 />
 ) : (
 <img
 src={currentStory.media_url}
 alt="Story"
 onError={(e) => {
   (e.currentTarget as HTMLElement).style.display = "none";
 }}
 className="size-full object-cover"
 loading="eager"
 />
 )}

 {/* Gradiente Escuro Superior e Inferior para Legibilidade */}
 <div className="absolute inset-0 bg-linear-to-b from-background/60 via-transparent to-background/80 pointer-events-none" />
 </div>

 {/* ── 4. Prompt Interativo de Vídeo Longo (>60s com Countdown de 5s) ── */}
 {showLongPrompt && (
 <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
 <div className="size-14 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
 <Clock size={32} weight="bold" />
 </div>

 <div className="space-y-1">
 <h4 className="text-base font-bold text-foreground">Storie Longo em Exibição</h4>
 <p className="text-xs text-muted-foreground max-w-xs">
 Este conteúdo possui mais de 60 segundos. Deseja continuar assistindo?
 </p>
 </div>

 <div className="flex flex-col gap-3 w-full max-w-xs pt-2">
 <Button
 onClick={(e) => {
 e.stopPropagation();
 handleContinueLongStory();
 }}
 className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-2xs"
 >
 <span>Continuar assistindo</span>
 <ArrowRight size={14} weight="bold" />
 </Button>

 <Button
 variant="ghost"
 onClick={(e) => {
 e.stopPropagation();
 handleNext();
 }}
 className="w-full h-11 min-h-11 rounded-lg text-foreground hover:bg-muted text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 Pular em {longPromptCountdown}s...
 </Button>
 </div>
 </div>
 )}

 {/* ── 5. Rodapé Interativo com Stickers, Links e CTAs ── */}
 <div className="relative z-30 p-4 space-y-3 pointer-events-auto">
 {/* Card Flutuante de Produto Marcado */}
 {currentStory.product_info && (
 <div className="flex items-center justify-between p-3 rounded-lg bg-card/80 backdrop-blur-xl border border-border/40 text-foreground shadow-2xs">
 <div className="flex items-center gap-3 min-w-0">
 {currentStory.product_info.image_url ? (
 <img
 src={currentStory.product_info.image_url}
 alt={currentStory.product_info.title}
 onError={(e) => {
   (e.currentTarget as HTMLElement).style.display = "none";
 }}
 className="size-10 rounded-lg object-cover shrink-0"
 />
 ) : (
 <div className="size-10 rounded-lg bg-primary/30 flex items-center justify-center shrink-0">
 <ShoppingBag size={18} weight="bold" />
 </div>
 )}
 <div className="min-w-0">
 <span className="text-xs font-bold block truncate leading-tight">
 {currentStory.product_info.title}
 </span>
 <span className="text-xs font-mono font-bold text-emerald-400">
 {(currentStory.product_info.price_cents / 100).toLocaleString("pt-BR", {
 style: "currency",
 currency: "BRL",
 })}
 </span>
 </div>
 </div>

 <Button
 size="sm"
 asChild
 className="h-11 min-h-11 rounded-lg bg-primary text-primary-foreground font-bold text-xs px-4 shrink-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <a href={`/produto/${currentStory.product_info.id}`}>Comprar</a>
 </Button>
 </div>
 )}

 {/* Botão de Link Externo ou WhatsApp */}
 {currentStory.link_url && (
 <Button
 asChild
 className="w-full h-11 min-h-11 rounded-lg bg-card/80 hover:bg-muted text-foreground backdrop-blur-xl border border-border/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <a href={currentStory.link_url} target="_blank" rel="noopener noreferrer">
 <span>{currentStory.link_cta || "Acessar Oferta"}</span>
 <ArrowRight size={14} weight="bold" />
 </a>
 </Button>
 )}

 {/* Hashtags e Badge de Co-Publicação */}
 {currentStory.collab_info && (
 <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
 <Handshake size={13} weight="bold" className="text-purple-300" />
 <span>Publicado em parceria com {currentStory.collab_info.creator_name}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
