import * as React from "react";
import { useState } from "react";
import { Search, Plus, Check, ShieldCheck, Share2, Settings, Users, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COMMUNITY_GRADIENT_PRESETS,
  COMMUNITY_TYPE_LABELS,
  type Community,
  type CommunityGradientPreset,
} from "@/types/community";
import { toast } from "sonner";

export interface ThreadsCommunityHeaderProps {
  community: Community;
  isMember: boolean;
  isOwnerOrMod?: boolean;
  recentMembers?: Array<{
    id: string;
    name: string;
    username?: string | null;
    avatar_url?: string | null;
  }>;
  onSearchChange?: (term: string) => void;
  onJoinToggle?: () => void;
  onNewPostClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export type CommunityFeedHeaderProps = ThreadsCommunityHeaderProps;

export function ThreadsCommunityHeader({
  community,
  isMember,
  isOwnerOrMod = false,
  recentMembers = [],
  onSearchChange,
  onJoinToggle,
  onNewPostClick,
  onSettingsClick,
  className = "",
}: ThreadsCommunityHeaderProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const presetConfig =
    COMMUNITY_GRADIENT_PRESETS[community.cover_gradient_preset as CommunityGradientPreset] ||
    COMMUNITY_GRADIENT_PRESETS["blue-lime"];

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: community.title,
          text: community.description || `Participe da comunidade ${community.title} no Waesy!`,
          url,
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        toast.success("Link da comunidade copiado!");
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(searchValue);
  };

  // Formata contagem de membros para "16.6k" ou "42"
  const formatCount = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
  };

  const memberCountFormatted = formatCount(community.member_count || 1);
  const onlineCountFormatted = formatCount(community.online_count || 1);

  return (
    <div className={`w-full max-w-3xl mx-auto px-0 sm:px-4 pt-0 sm:pt-4 pb-2 ${className}`}>
      {/* ─── Cartão Squircle Imersivo de Capa (Edge-to-Edge Mobile / Widescreen Desktop) ─── */}
      <div
        className={`relative w-full rounded-none rounded-b-3xl sm:rounded-3xl overflow-hidden shadow-sm transition-colors duration-300 ${
          community.cover_mode === "image" && community.cover_image_url
            ? "bg-zinc-950"
            : "bg-zinc-950"
        }`}
      >
        {/* Camada de Foto de Capa (se configurada) */}
        {community.cover_mode === "image" && community.cover_image_url && (
          <img
            src={community.cover_image_url}
            alt={community.title}
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
          />
        )}

        {/* Gradiente escurecedor defensivo para garantir contraste AA (>= 4.5:1) em qualquer imagem ou gradiente */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />

        {/* Conteúdo Interno da Capa com Safe-Area no Mobile */}
        <div className="relative z-10 pt-safe pt-4 sm:pt-6 px-4 sm:px-6 pb-6 flex flex-col justify-between min-h-64 sm:min-h-72">
          {/* ── Linha Superior: Barra de Busca Pill & Ação Rápida (+) ─────── */}
          <div className="flex items-center justify-between gap-3">
            {/* Campo de Busca Interno com Frosted Glass */}
            <form onSubmit={handleSearchSubmit} className="grow min-w-0">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 size-4 text-primary-foreground/80 pointer-events-none" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    onSearchChange?.(e.target.value);
                  }}
                  onFocus={() => setIsSearchActive(true)}
                  onBlur={() => setIsSearchActive(false)}
                  placeholder="Search"
                  className="w-full h-11 min-h-11 pl-10 pr-4 rounded-full bg-card/20 hover:bg-card/25 focus:bg-card/30 backdrop-blur-md text-primary-foreground placeholder:text-primary-foreground/80 text-xs sm:text-sm font-medium border border-white/25 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Pesquisar nesta comunidade"
                />
              </div>
            </form>

            {/* Botão Circular de Ação Rápida (+) com Piso 44px */}
            <button
              type="button"
              onClick={isMember ? onNewPostClick : onJoinToggle}
              className="size-11 min-h-11 min-w-11 rounded-full bg-card/20 hover:bg-card/30 active:scale-95 backdrop-blur-md border border-white/30 text-primary-foreground flex items-center justify-center shrink-0 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={isMember ? "Criar publicação" : "Participar da comunidade"}
              title={isMember ? "Criar publicação" : "Participar da comunidade"}
            >
              {isMember ? <Plus className="size-5" /> : <Check className="size-5" />}
            </button>

            {/* Botão de Gestão (visível apenas para proprietário/moderador) */}
            {isOwnerOrMod && (
              <button
                type="button"
                onClick={onSettingsClick}
                className="size-11 min-h-11 min-w-11 rounded-full bg-card/20 hover:bg-card/30 active:scale-95 backdrop-blur-md border border-white/30 text-primary-foreground flex items-center justify-center shrink-0 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Gerenciar comunidade"
                title="Gerenciar comunidade"
              >
                <Settings className="size-5" />
              </button>
            )}

            {/* Botão Compartilhar */}
            <button
              type="button"
              onClick={handleShare}
              className="size-11 min-h-11 min-w-11 rounded-full bg-card/20 hover:bg-card/30 active:scale-95 backdrop-blur-md border border-white/30 text-primary-foreground flex items-center justify-center shrink-0 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Compartilhar comunidade"
              title="Compartilhar link"
            >
              <Share2 className="size-4" />
            </button>
          </div>

          {/* ── Linha Central: Categoria & Título de Grande Impacto ───── */}
          <div className="space-y-2 my-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-foreground/80 tracking-wide uppercase">
                {COMMUNITY_TYPE_LABELS[community.community_type] || "Comunidade"}
              </span>
              <span className="text-primary-foreground/60 text-xs">•</span>
              <span className="text-xs font-mono text-primary-foreground/80">/c/@{community.slug}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary-foreground tracking-tight leading-tight drop-shadow-xs">
              {community.title}
            </h1>

            {community.description && (
              <p className="text-xs sm:text-sm text-primary-foreground/90 line-clamp-2 max-w-xl font-normal leading-relaxed drop-shadow-xs">
                {community.description}
              </p>
            )}
          </div>

          {/* ── Linha Inferior: Facepile de Membros & Estatísticas ────── */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Cluster Facepile de Avatares Sobrepostos */}
              {recentMembers.length > 0 ? (
                <div className="flex items-center -space-x-2 overflow-hidden py-1">
                  {recentMembers.slice(0, 6).map((member, idx) => (
                    <Avatar
                      key={member.id || idx}
                      className="size-7 sm:size-8 border-2 border-white/90 ring-1 ring-black/20 shrink-0"
                    >
                      {member.avatar_url && (
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                      )}
                      <AvatarFallback className="text-2xs font-bold bg-card text-zinc-900">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : (
                <div className="size-7 sm:size-8 rounded-full bg-card/20 border-2 border-white/90 flex items-center justify-center text-primary-foreground text-xs">
                  <Users className="size-4" />
                </div>
              )}

              {/* Contadores Textuais */}
              <div className="text-xs sm:text-sm font-semibold text-primary-foreground/95 drop-shadow-xs">
                <span>{memberCountFormatted} participantes</span>
                <span className="mx-2 text-primary-foreground/60">•</span>
                <span className="text-emerald-300 font-bold">{onlineCountFormatted} online</span>
              </div>
            </div>

            {/* Botão Entrar / Participando com Piso 44px */}
            <Button
              type="button"
              onClick={onJoinToggle}
              variant={isMember ? "secondary" : "default"}
              className={`h-11 min-h-11 px-5 rounded-full text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-sm ${
                isMember
                  ? "bg-card/25 hover:bg-card/35 text-primary-foreground border border-white/40 backdrop-blur-md"
                  : "bg-card hover:bg-card/90 text-zinc-950 font-extrabold"
              }`}
            >
              {isMember ? (
                <>
                  <Check className="size-4 mr-2" />
                  <span>Participando</span>
                </>
              ) : (
                <span>Participar</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CommunityFeedHeader = ThreadsCommunityHeader;
