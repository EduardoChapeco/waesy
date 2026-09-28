/**
 * context-switcher.tsx — Alternador de Identidades & Contextos Waesy (Instagram-like Switcher)
 *
 * Isola estritamente as 3 personas do ecossistema:
 * 1. 👤 Conta Civil (Root Transacional / Compras / CPF / Contratos)
 * 2. 🎭 Personas de Criador (Vitrines / Biolinks / Parcerias / Conteúdo)
 * 3. 🏢 Empresas & Lojas (Workspaces / Operação / PDV / Catálogo)
 *
 * Padrão Apple HIG & Instagram Multi-Account Switcher com acionamento em 1 clique.
 */

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { User, Building2, Star, Check, Plus, ChevronDown, ShieldCheck, Store, Layers, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ContextMembership {
  store_id: string;
  name: string;
  role: string;
  logo_url?: string | null;
  slug?: string;
  category?: string;
}

export interface CreatorPersona {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  category?: string;
  isPrimary?: boolean;
}

export type ActiveContextType = "civil" | "store" | "creator";

export interface ActiveContextState {
  type: ActiveContextType;
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string | null;
}

export interface ContextSwitcherProps {
  currentContextType?: ActiveContextType;
  activeProfileId?: string | null;
  currentStoreId?: string | null;
  civilUser: {
    id?: string;
    name: string;
    email: string;
    username?: string;
    avatarUrl?: string | null;
  };
  personas?: CreatorPersona[];
  stores?: ContextMembership[];
  hasCreatorProfile?: boolean;
  creatorHandle?: string | null;
  onContextChange?: (context: ActiveContextState) => void;
  className?: string;
  triggerVariant?: "minimal" | "pill" | "avatar";
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  currentContextType = "civil",
  activeProfileId,
  currentStoreId,
  civilUser,
  personas = [],
  stores = [],
  hasCreatorProfile = false,
  creatorHandle,
  onContextChange,
  className = "",
  triggerVariant = "pill",
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Deriva personas unificadas (se houver creatorHandle mas personas vazio)
  const resolvedPersonas: CreatorPersona[] =
    personas.length > 0
      ? personas
      : hasCreatorProfile || creatorHandle
      ? [
          {
            id: "creator_primary",
            name: `${civilUser.name.split(" ")[0]} Criador`,
            handle: creatorHandle || civilUser.username || "criador",
            avatarUrl: civilUser.avatarUrl,
            category: "Criador & Artista",
            isPrimary: true,
          },
        ]
      : [];

  const activeStore = stores.find(
    (s) => s.store_id === (currentStoreId || activeProfileId)
  );

  const activePersona = resolvedPersonas.find(
    (p) => p.id === activeProfileId || p.handle === creatorHandle
  );

  // ── 1. Alternar para a Conta Civil (Root Transacional) ──
  const handleSwitchToCivil = () => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=civil; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
    }

    const state: ActiveContextState = {
      type: "civil",
      id: civilUser.id || "civil_root",
      name: civilUser.name,
      handle: civilUser.username,
      avatarUrl: civilUser.avatarUrl,
    };

    onContextChange?.(state);
    toast.success(`Contexto ativo: ${civilUser.name} (Conta Civil)`);
    setIsOpen(false);
    navigate({ to: "/conta" });
  };

  // ── 2. Alternar para uma Persona de Criador ──
  const handleSwitchToCreator = (persona: CreatorPersona) => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=creator; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = `waesy_active_creator=${persona.id}; path=/; max-age=31536000; SameSite=Lax`;
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
    }

    const state: ActiveContextState = {
      type: "creator",
      id: persona.id,
      name: persona.name,
      handle: persona.handle,
      avatarUrl: persona.avatarUrl,
    };

    onContextChange?.(state);
    toast.success(`Contexto ativo: ${persona.name} (@${persona.handle})`);
    setIsOpen(false);
    navigate({ to: "/conta/criadores" });
  };

  // ── 3. Alternar para uma Empresa / Workspace ──
  const handleSwitchToStore = (store: ContextMembership) => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=store; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = `waesy_active_tenant=${store.store_id}; path=/; max-age=31536000; SameSite=Lax`;
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
    }

    const state: ActiveContextState = {
      type: "store",
      id: store.store_id,
      name: store.name,
      avatarUrl: store.logo_url,
    };

    onContextChange?.(state);
    toast.success(`Workspace ativo: ${store.name}`);
    setIsOpen(false);
    navigate({ to: "/workspace" });
  };

  // ── Rótulo & Ícone Ativo no Gatilho ──
  const triggerLabel =
    currentContextType === "store" && activeStore
      ? activeStore.name
      : currentContextType === "creator" && activePersona
      ? activePersona.name
      : civilUser.name.split(" ")[0];

  const triggerAvatar =
    currentContextType === "store" && activeStore?.logo_url
      ? activeStore.logo_url
      : currentContextType === "creator" && activePersona?.avatarUrl
      ? activePersona.avatarUrl
      : civilUser.avatarUrl;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {triggerVariant === "minimal" ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 p-1 rounded-full hover:bg-muted/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
              className
            )}
            title="Alternar Perfil ou Empresa"
          >
            <div className="size-8 rounded-full bg-muted border border-border/80 overflow-hidden flex items-center justify-center shrink-0">
              {triggerAvatar ? (
                <img src={triggerAvatar} alt={triggerLabel} className="size-full object-cover" />
              ) : currentContextType === "store" ? (
                <Building2 className="size-4 text-primary" />
              ) : currentContextType === "creator" ? (
                <Star className="size-4 text-amber-500" />
              ) : (
                <User className="size-4 text-foreground" />
              )}
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 px-3 rounded-full border-border/80 bg-background hover:bg-muted/40 text-xs font-semibold flex items-center gap-2 max-w-[210px] cursor-pointer shadow-2xs",
              className
            )}
          >
            <div className="size-5 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/40">
              {triggerAvatar ? (
                <img src={triggerAvatar} alt={triggerLabel} className="size-full object-cover" />
              ) : currentContextType === "store" ? (
                <Building2 className="size-3 text-primary" />
              ) : currentContextType === "creator" ? (
                <Star className="size-3 text-amber-500" />
              ) : (
                <User className="size-3 text-foreground" />
              )}
            </div>
            <span className="truncate text-foreground font-bold">{triggerLabel}</span>
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-2 rounded-2xl bg-card border border-border/80 shadow-2xl font-sans animate-in fade-in zoom-in-95 duration-100 z-50"
      >
        <div className="px-3 py-2 flex items-center justify-between border-b border-border/40 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Alternar Perfil
          </span>
          <Badge variant="outline" className="text-[9px] font-mono capitalize">
            {currentContextType === "civil"
              ? "Civil / Compras"
              : currentContextType === "creator"
              ? "Criador / Parcerias"
              : "Empresa / Workspace"}
          </Badge>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            1. CONTA CIVIL (ROOT TRANSACIONAL / COMPRAS)
        ══════════════════════════════════════════════════════════════ */}
        <div className="space-y-0.5">
          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Conta Pessoal (Root)
          </span>

          <DropdownMenuItem
            onClick={handleSwitchToCivil}
            className={cn(
              "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
              currentContextType === "civil"
                ? "bg-primary/10 text-primary font-bold border border-primary/20"
                : "hover:bg-muted/60 text-foreground"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {civilUser.avatarUrl ? (
                  <img src={civilUser.avatarUrl} alt={civilUser.name} className="size-full object-cover" />
                ) : (
                  <User className="size-4" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate text-foreground">{civilUser.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                    Civil
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  @{civilUser.username || civilUser.email.split("@")[0]} • Compras, CPF & Contratos
                </p>
              </div>
            </div>
            {currentContextType === "civil" && (
              <Check className="size-4 text-primary shrink-0 stroke-[2.5]" />
            )}
          </DropdownMenuItem>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. PERSONAS DE CRIADOR (VITRINES / BIOLINKS / ARTISTAS)
        ══════════════════════════════════════════════════════════════ */}
        {resolvedPersonas.length > 0 && (
          <div className="mt-2 space-y-0.5">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Personas e Marcas Pessoais
            </span>

            {resolvedPersonas.map((persona) => {
              const isSelected =
                currentContextType === "creator" &&
                (activeProfileId === persona.id || creatorHandle === persona.handle);

              return (
                <DropdownMenuItem
                  key={persona.id}
                  onClick={() => handleSwitchToCreator(persona)}
                  className={cn(
                    "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
                    isSelected
                      ? "bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {persona.avatarUrl ? (
                        <img src={persona.avatarUrl} alt={persona.name} className="size-full object-cover" />
                      ) : (
                        <Star className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate text-foreground">{persona.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 font-medium text-amber-600 border-amber-500/30"
                        >
                          Criador
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @{persona.handle} • {persona.category || "Biolink & Parcerias"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-amber-600 shrink-0 stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. EMPRESAS & LOJAS (WORKSPACES OPERACIONAIS)
        ══════════════════════════════════════════════════════════════ */}
        {stores.length > 0 && (
          <div className="mt-2 space-y-0.5">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Minhas Empresas e Lojas
            </span>

            {stores.map((store) => {
              const isSelected =
                currentContextType === "store" &&
                (currentStoreId === store.store_id || activeProfileId === store.store_id);

              return (
                <DropdownMenuItem
                  key={store.store_id}
                  onClick={() => handleSwitchToStore(store)}
                  className={cn(
                    "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
                    isSelected
                      ? "bg-muted font-bold text-foreground border border-border"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-muted border border-border/80 overflow-hidden flex items-center justify-center shrink-0">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="size-full object-cover" />
                      ) : (
                        <Building2 className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate text-foreground">{store.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                          {store.role === "owner" ? "Dono" : store.role}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Workspace • PDV & Catálogo
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-primary shrink-0 stroke-[2.5]" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator className="my-1.5" />

        {/* ══════════════════════════════════════════════════════════════
            4. AÇÕES DE EXPANSÃO DE ENTIDADE (CRIAR LOJA OU PERSONA)
        ══════════════════════════════════════════════════════════════ */}
        <div className="space-y-0.5 pt-0.5">
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/criar-negocio" });
              setIsOpen(false);
            }}
            className="p-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-2"
          >
            <Plus className="size-3.5" />
            <span>+ Criar Nova Empresa ou Loja</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/conta/criadores" });
              setIsOpen(false);
            }}
            className="p-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/60 cursor-pointer flex items-center gap-2"
          >
            <Star className="size-3.5 text-amber-500" />
            <span>+ Criar Nova Persona de Criador</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
