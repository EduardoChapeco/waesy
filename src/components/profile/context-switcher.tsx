/**
 * context-switcher.tsx — Alternador de Identidades & Contextos Waesy
 * Permite alternar instantaneamente entre a "Identidade Civil" (Pessoal/Compras)
 * e as "Identidades de Publicação" (Lojas, Empresas e Criadores).
 * Padrão Apple HIG / Google Account Switcher com toque único.
 */

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  User,
  Building2,
  Sparkles,
  Check,
  Plus,
  ChevronDown,
  Store,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ContextMembership {
  store_id: string;
  name: string;
  role: string;
  logo_url?: string | null;
  slug?: string;
  category?: string;
}

export interface ContextSwitcherProps {
  currentContextType: "civil" | "store" | "creator";
  currentStoreId?: string | null;
  civilUser: {
    name: string;
    email: string;
    username?: string;
    avatarUrl?: string | null;
  };
  stores?: ContextMembership[];
  hasCreatorProfile?: boolean;
  creatorHandle?: string | null;
  className?: string;
  triggerVariant?: "minimal" | "pill" | "avatar";
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  currentContextType,
  currentStoreId,
  civilUser,
  stores = [],
  hasCreatorProfile = false,
  creatorHandle,
  className = "",
  triggerVariant = "pill",
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Alterna para o contexto Civil (Pessoal)
  const handleSwitchToCivil = () => {
    window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
    navigate({ to: "/conta" });
    setIsOpen(false);
  };

  // Alterna para uma Loja / Empresa específica
  const handleSwitchToStore = (storeId: string) => {
    window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
    navigate({ to: "/workspace" });
    setIsOpen(false);
  };

  // Alterna para o Perfil de Criador
  const handleSwitchToCreator = () => {
    navigate({ to: "/conta/criadores" });
    setIsOpen(false);
  };

  const activeStore = stores.find((s) => s.store_id === currentStoreId);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {triggerVariant === "minimal" ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 p-1 rounded-full hover:bg-muted/60 transition-colors cursor-pointer",
              className
            )}
            title="Alternar Contexto de Perfil"
          >
            <div className="size-8 rounded-full bg-muted border border-border/80 overflow-hidden flex items-center justify-center shrink-0">
              {currentContextType === "store" && activeStore?.logo_url ? (
                <img src={activeStore.logo_url} alt={activeStore.name} className="size-full object-cover" />
              ) : civilUser.avatarUrl ? (
                <img src={civilUser.avatarUrl} alt={civilUser.name} className="size-full object-cover" />
              ) : (
                <User className="size-4 text-foreground" />
              )}
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 px-3 rounded-full border-border/80 bg-background hover:bg-muted/40 text-xs font-semibold flex items-center gap-2 max-w-[200px] cursor-pointer shadow-2xs",
              className
            )}
          >
            <div className="size-5 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {currentContextType === "store" && activeStore?.logo_url ? (
                <img src={activeStore.logo_url} alt={activeStore.name} className="size-full object-cover" />
              ) : civilUser.avatarUrl ? (
                <img src={civilUser.avatarUrl} alt={civilUser.name} className="size-full object-cover" />
              ) : (
                <User className="size-3 text-foreground" />
              )}
            </div>
            <span className="truncate text-foreground">
              {currentContextType === "store" && activeStore ? activeStore.name : civilUser.name.split(" ")[0]}
            </span>
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 p-2 rounded-2xl bg-card border border-border/80 shadow-xl font-sans animate-in fade-in zoom-in-95 duration-100 z-50"
      >
        <DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Alternar Identidade
        </DropdownMenuLabel>

        {/* ── 1. Perfil Civil (Root / Transacional) ── */}
        <DropdownMenuItem
          onClick={handleSwitchToCivil}
          className={cn(
            "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
            currentContextType === "civil"
              ? "bg-muted font-bold text-foreground"
              : "hover:bg-muted/50 text-foreground"
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
                <span className="text-xs font-bold truncate">{civilUser.name}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                  Civil
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                @{civilUser.username || civilUser.email.split("@")[0]} • Compras & Pedidos
              </p>
            </div>
          </div>
          {currentContextType === "civil" && (
            <Check className="size-4 text-primary shrink-0" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        {/* ── 2. Perfis de Publicação: Lojas & Negócios ── */}
        {stores.length > 0 && (
          <div className="space-y-1">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Minhas Empresas & Lojas
            </span>
            {stores.map((store) => {
              const isSelected = currentContextType === "store" && currentStoreId === store.store_id;

              return (
                <DropdownMenuItem
                  key={store.store_id}
                  onClick={() => handleSwitchToStore(store.store_id)}
                  className={cn(
                    "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
                    isSelected
                      ? "bg-muted font-bold text-foreground"
                      : "hover:bg-muted/50 text-foreground"
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
                      <p className="text-xs font-bold text-foreground truncate">{store.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium capitalize">
                        {store.role === "owner" ? "Proprietário" : store.role} • Workspace
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        {/* ── 3. Perfil de Criador (Publishing Persona) ── */}
        {hasCreatorProfile && (
          <div className="mt-1">
            <DropdownMenuItem
              onClick={handleSwitchToCreator}
              className={cn(
                "p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors",
                currentContextType === "creator"
                  ? "bg-muted font-bold text-foreground"
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-bold text-foreground truncate">
                    Perfil de Criador
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @{creatorHandle || "criador"} • Biolinks & Comissões
                  </p>
                </div>
              </div>
              {currentContextType === "creator" && (
                <Check className="size-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          </div>
        )}

        <DropdownMenuSeparator className="my-1.5" />

        {/* ── 4. Ações de Criação ── */}
        <div className="space-y-0.5">
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/criar-negocio" });
              setIsOpen(false);
            }}
            className="p-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-2"
          >
            <Plus className="size-3.5" />
            <span>Criar Nova Empresa ou Loja</span>
          </DropdownMenuItem>

          {!hasCreatorProfile && (
            <DropdownMenuItem
              onClick={() => {
                navigate({ to: "/conta/criadores" });
                setIsOpen(false);
              }}
              className="p-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/50 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="size-3.5" />
              <span>Ativar Modo Criador de Conteúdo</span>
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
