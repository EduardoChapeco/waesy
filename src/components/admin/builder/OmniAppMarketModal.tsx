/**
 * OmniAppMarketModal.tsx — Catálogo e Instalador de Omni Apps (Wix App Market Parity)
 * 
 * Permite ao gestor da loja ou Admin Master ativar e provisionar declarativamente
 * pacotes comerciais completos (Supermercado, Delivery, Eventos, Agendamentos, etc.),
 * gerando automaticamente a árvore de rotas dinâmicas em `experience_documents`.
 */

import * as React from "react";
import { useState } from "react";
import {
  X,
  Plus,
  Check,
  ShoppingBag,
  UtensilsCrossed,
  Calendar,
  Clock,
  Store,
  Link2,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OMNI_APP_BLUEPRINTS, installOmniApp } from "@/services/omni-apps-blueprint.functions";
import { OmniAppBlueprint, OmniAppId } from "@/types/omni-apps";
import { toast } from "sonner";

export interface OmniAppMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  onAppInstalled?: (appId: OmniAppId) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart: ShoppingBag,
  UtensilsCrossed,
  Calendar,
  Clock,
  Store,
  Link2,
  FileText,
};

export function OmniAppMarketModal({
  isOpen,
  onClose,
  storeId,
  onAppInstalled,
}: OmniAppMarketModalProps) {
  const [installingAppId, setInstallingAppId] = useState<OmniAppId | null>(null);
  const [selectedApp, setSelectedApp] = useState<OmniAppBlueprint>(OMNI_APP_BLUEPRINTS.supermarket);

  const appsList = Object.values(OMNI_APP_BLUEPRINTS);

  const handleInstall = async (app: OmniAppBlueprint) => {
    try {
      setInstallingAppId(app.id);
      const res = await installOmniApp({
        data: {
          appId: app.id,
          storeId,
        },
      });

      toast.success(`App "${app.name}" instalado com sucesso! ${res.provisionedCount} página(s) provisionada(s).`);
      onAppInstalled?.(app.id);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao instalar o Omni App.");
    } finally {
      setInstallingAppId(null);
    }
  };

  const SelectedIcon = ICON_MAP[selectedApp.iconName] || Layers;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border/80 shadow-2xl">
        {/* Header Superior */}
        <DialogHeader className="h-14 px-6 border-b border-border/80 flex flex-row items-center justify-between flex-none bg-card select-none">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                Omni Apps Market
                <Badge variant="outline" className="text-2xs font-normal">
                  Wix-Level Modular Architecture
                </Badge>
              </DialogTitle>
              <p className="text-2xs text-muted-foreground">
                Ative ecossistemas comerciais completos com páginas, fluxos e conexões de dados automáticas
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {/* Corpo do Mercado: Lista à Esquerda + Detalhes do Blueprint à Direita */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna 1: Lista de Apps */}
          <aside className="w-72 border-r border-border/80 bg-muted/20 flex flex-col flex-none select-none overflow-y-auto p-3 gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              Apps Disponíveis ({appsList.length})
            </span>

            {appsList.map((app) => {
              const Icon = ICON_MAP[app.iconName] || Layers;
              const isSelected = selectedApp.id === app.id;

              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/10 border-primary/30 text-foreground shadow-2xs"
                      : "bg-card/40 border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "size-9 rounded-lg flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate text-foreground">{app.name}</div>
                    <div className="text-2xs text-muted-foreground truncate">{app.tagline}</div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Coluna 2: Detalhes do App Selecionado */}
          <main className="flex-1 bg-card/40 flex flex-col overflow-y-auto p-6 gap-6">
            {/* Banner do App */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/60">
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <SelectedIcon className="size-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedApp.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{selectedApp.tagline}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-2xs font-mono">v{selectedApp.version}</Badge>
                    <Badge variant="outline" className="text-2xs uppercase">{selectedApp.category}</Badge>
                    <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-500/20 bg-emerald-500/10">
                      BFF Nativo Ativo
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleInstall(selectedApp)}
                disabled={installingAppId === selectedApp.id}
                className="h-11 px-5 rounded-xl font-bold text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
              >
                {installingAppId === selectedApp.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Provisionando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    <span>Instalar App</span>
                  </>
                )}
              </Button>
            </div>

            {/* Descrição e Funcionalidades */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visão Geral</h4>
              <p className="text-xs leading-relaxed text-foreground">{selectedApp.description}</p>
            </div>

            {/* Páginas e Rotas Provisionadas Atomicamente */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Páginas Provisionadas Automaticamente ({selectedApp.pages.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedApp.pages.map((p) => (
                  <div key={p.slug} className="p-3 rounded-xl border border-border/80 bg-background/80 flex flex-col gap-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{p.title}</span>
                      <span className="text-2xs font-mono text-muted-foreground">/{p.slug}</span>
                    </div>
                    <span className="text-2xs text-muted-foreground leading-normal">{p.seo.description}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-2xs py-0 px-1.5">{p.pageType}</Badge>
                      {p.isHome && (
                        <Badge className="text-2xs py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Página Inicial
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requisitos de Dados e Centralização */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-3 mt-auto">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
              <div className="text-2xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Governança Centralizada no Workspace:</strong> Todos os pedidos, agendamentos e transações gerados por este App confluem diretamente para a sua esteira operacional, com suporte a múltiplos canais e integridade RLS.
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
