/**
 * contextual-stories-rail.tsx — Trilho Horizontal de Stories Contextuais por Vitrine
 * Suporte a Lojas Seguidas, Criadores Embaixadores, Ads Intercalados e Visualizador Integrado
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckFat, Plus, Storefront } from "@phosphor-icons/react";
import { getRankedStoriesFeed, type StoryGroupDTO } from "@/services/stories.functions";
import { AdvancedStoryViewer } from "./advanced-story-viewer";

interface ContextualStoriesRailProps {
 niche?: string;
 storeId?: string;
 className?: string;
 showCreateButton?: boolean;
 onCreateStory?: () => void;
}

export function ContextualStoriesRail({
 niche = "todos",
 storeId,
 className = "",
 showCreateButton = false,
 onCreateStory,
}: ContextualStoriesRailProps) {
 const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);

 const { data: storyGroups = [], isLoading } = useQuery({
 queryKey: ["contextual-stories", niche, storeId],
 queryFn: () => getRankedStoriesFeed({ data: { niche, storeId } }),
 staleTime: 60_000,
 });

 if (!isLoading && storyGroups.length === 0 && !showCreateButton) {
 return null; // Oculta se não houver stories no nicho para manter o silêncio visual
 }

 return (
 <>
 <section
 aria-label="Stories e Momentos das Empresas"
 className={`w-full py-2 focus:outline-none ${className}`}
 >
 <div
 className="flex items-center gap-4 sm:gap-4 overflow-x-auto no-scrollbar pb-1 focus:outline-none px-1"
 tabIndex={0}
 >
 {/* Botão de Adicionar Story (se habilitado) */}
 {showCreateButton && (
 <button
 onClick={onCreateStory}
 className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none"
 aria-label="Criar novo story"
 >
 <div className="relative size-[68px] sm:size-[74px] rounded-full p-[2.5px] border-2 border-dashed border-border group-hover:border-primary transition-colors flex items-center justify-center bg-card">
 <div className="size-full rounded-full bg-muted flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
 <Plus size={24} weight="bold" />
 </div>
 <div className="absolute bottom-0 right-0 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
 <Plus size={12} weight="bold" />
 </div>
 </div>
 <span className="text-[11px] font-semibold text-foreground truncate max-w-[70px]">
 Seu Story
 </span>
 </button>
 )}

 {/* Lista de Grupos de Stories */}
 {storyGroups.map((group, idx) => {
 const isAmbassador = group.isOfficialAmbassador;
 const isFollowing = group.isFollowing;
 const isSponsored = group.isSponsored;

 // Anéis semânticos de alta fidelidade
 let ringClasses = "border-2 border-border/70";
 if (isAmbassador) {
 ringClasses = "p-[2.5px] bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400";
 } else if (isFollowing) {
 ringClasses = "p-[2.5px] bg-gradient-to-tr from-amber-400 via-primary to-emerald-500";
 } else if (group.hasUnseenStories) {
 ringClasses = "p-[2.5px] bg-gradient-to-tr from-primary to-sky-400";
 }

 return (
 <button
 key={group.groupId}
 onClick={() => setSelectedGroupIndex(idx)}
 className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none cursor-pointer select-none transition-transform duration-200 active:scale-95"
 aria-label={`Ver stories de ${group.entityName}`}
 >
 <div
 className={`relative size-[68px] sm:size-[74px] rounded-full overflow-hidden flex items-center justify-center transition-all ${ringClasses}`}
 >
 <div className="size-full rounded-full overflow-hidden bg-zinc-900 border-2 border-background">
 {group.entityAvatarUrl ? (
 <img
 src={group.entityAvatarUrl}
 alt={group.entityName}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm">
 {group.entityName.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 {/* Badge de Criador Embaixador */}
 {isAmbassador && (
 <div className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs border-2 border-background">
 <CheckFat size={10} weight="fill" />
 </div>
 )}

 {/* Badge de Patrocinado */}
 {isSponsored && (
 <div className="absolute bottom-0 inset-x-1 bg-amber-500 text-black text-[8px] font-black uppercase text-center rounded-xs py-0.2 shadow-xs">
 Ads
 </div>
 )}
 </div>

 <span className="text-[11px] font-medium text-foreground truncate max-w-[74px] text-center leading-tight">
 {group.entityName}
 </span>
 </button>
 );
 })}
 </div>
 </section>

 {/* Visualizador de Stories Integrado */}
 <AdvancedStoryViewer
 groups={storyGroups}
 initialGroupIndex={selectedGroupIndex ?? 0}
 isOpen={selectedGroupIndex !== null}
 onClose={() => setSelectedGroupIndex(null)}
 />
 </>
 );
}
