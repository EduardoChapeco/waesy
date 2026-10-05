import { useState } from "react";
import {
  CANONICAL_VIEWPORT_LIST,
  CanonicalBentoGrid,
  CanonicalBentoItem,
  CanonicalHooberThumbZone,
  type CanonicalViewportKey,
} from "@/components/ui/canonical";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { Smartphone, Tablet, Monitor, CheckCircle, ArrowRight } from "lucide-react";

export function ViewportsFamily({ mode }: ComponentStateProps) {
  const [activeViewport, setActiveViewport] = useState<CanonicalViewportKey>("mobileModern");
  const [operationConfirmed, setOperationConfirmed] = useState(false);
  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  const selectedMeta = CANONICAL_VIEWPORT_LIST.find((v) => v.key === activeViewport) || CANONICAL_VIEWPORT_LIST[1];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Adaptativa de Viewports</h2>
        <p className="text-xs text-muted-foreground">
          Validação sistemática nos 5 viewports canônicos (320px, 390px, 768px, 1280px, 1920px) com Bento Grid e Thumb Zone.
        </p>
      </div>

      {/* SELETOR INTERATIVO DE VIEWPORTS */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
        <span className="text-xs font-medium text-foreground mr-2">Simular Viewport:</span>
        {CANONICAL_VIEWPORT_LIST.map((vp) => {
          const isCurrent = vp.key === activeViewport;
          return (
            <Button
              key={vp.key}
              type="button"
              variant={isCurrent ? "secondary" : "ghost"}
              onClick={() => setActiveViewport(vp.key)} /* focus-visible:ring-2 */
              className="h-11 px-3 text-xs flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {vp.category === "compact" && <Smartphone className="h-4 w-4" />}
              {vp.category === "medium" && <Tablet className="h-4 w-4" />}
              {vp.category === "expanded" && <Monitor className="h-4 w-4" />}
              <span>{vp.label}</span>
              <Badge variant="outline" className="text-xs ml-1">
                {vp.category}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="p-3 bg-card rounded-lg border border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Viewport Selecionado: {selectedMeta.description} ({selectedMeta.width}px)</span>
        </div>
        <span className="text-muted-foreground">Zero overflow horizontal garantido</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO (BENTO GRID + THUMB ZONE) */}
        {showReady && (
          <StateCard title="Bento Grid e Polegar" state="ready">
            <div className="flex flex-col gap-3">
              <CanonicalBentoGrid className="grid-cols-1 sm:grid-cols-2 gap-2">
                <CanonicalBentoItem span="normal">
                  <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-lg font-bold font-mono text-foreground">3.8%</p>
                </CanonicalBentoItem>
                <CanonicalBentoItem span="normal">
                  <p className="text-xs text-muted-foreground">SLA de Entrega</p>
                  <p className="text-lg font-bold font-mono text-foreground">99.4%</p>
                </CanonicalBentoItem>
              </CanonicalBentoGrid>

              <CanonicalHooberThumbZone className="rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Ação do Polegar:</span>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setOperationConfirmed((confirmed) => !confirmed)}
                  className="h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {operationConfirmed ? "Operação Confirmada" : "Confirmar Operação"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CanonicalHooberThumbZone>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Grid em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <CanonicalBentoGrid className="grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-border p-4 h-20 bg-muted/60 animate-pulse motion-reduce:transition-none" />
                <div className="rounded-lg border border-border p-4 h-20 bg-muted/60 animate-pulse motion-reduce:transition-none" />
              </CanonicalBentoGrid>
              <div className="rounded-lg border border-border p-3 h-12 bg-muted/60 animate-pulse motion-reduce:transition-none" />
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Dados de Viewport" state="empty">
            <div className="p-4 rounded-lg border border-dashed border-border text-center flex flex-col items-center justify-center gap-2">
              <Monitor className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Nenhum Dispositivo Conectado</p>
              <p className="text-xs text-muted-foreground">Aguardando telemetria em tempo real.</p>
            </div>
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Calibração" state="error">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive flex flex-col gap-2">
              <p className="text-xs font-semibold">Erro ao Redimensionar Janela</p>
              <p className="text-xs text-muted-foreground">
                Inconsistência na detecção do sensor de largura.
              </p>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
