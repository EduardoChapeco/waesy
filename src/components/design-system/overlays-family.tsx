import { useState } from "react";
import {
  AdaptiveModal,
  CanonicalDrawer,
  CanonicalConfirmDialog,
} from "@/components/ui/canonical";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { Layers, RefreshCw, PanelRight, ShieldAlert, Trash2 } from "lucide-react";

export function OverlaysFamily({ mode }: ComponentStateProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Modais e Overlays</h2>
        <p className="text-xs text-muted-foreground">
          AdaptiveModal, CanonicalDrawer e CanonicalConfirmDialog nas 4 matrizes de estado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Overlays Adaptativos" state="ready">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)} /* focus-visible:ring-2 */
                className="h-11 w-full justify-start gap-2 text-xs focus-visible:ring-2"
              >
                <Layers className="h-4 w-4" />
                Abrir Modal Adaptativo
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(true)} /* focus-visible:ring-2 */
                className="h-11 w-full justify-start gap-2 text-xs focus-visible:ring-2"
              >
                <PanelRight className="h-4 w-4" />
                Abrir Gaveta Lateral
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmOpen(true)} /* focus-visible:ring-2 */
                className="h-11 w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 focus-visible:ring-2"
              >
                <Trash2 className="h-4 w-4" />
                Diálogo de Exclusão
              </Button>

              {/* Modais Ativos */}
              <AdaptiveModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Configuração Canônica"
                description="Painel adaptativo de ajuste de parâmetros."
                footerAction={
                  <Button size="sm" onClick={() => setModalOpen(false)} className="h-11 px-4 text-xs">
                    Salvar e Fechar
                  </Button>
                }
              >
                <div className="text-xs text-muted-foreground py-2">
                  Conteúdo do modal adaptativo renderizado com confinamento de foco e escape.
                </div>
              </AdaptiveModal>

              <CanonicalDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title="Histórico de Auditoria"
                description="Linha do tempo de eventos do ecossistema."
                footerAction={
                  <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="h-11 px-4 text-xs">
                    Fechar Painel
                  </Button>
                }
              >
                <div className="text-xs text-muted-foreground py-2">
                  Registro cronológico de alterações e decisões arquiteturais.
                </div>
              </CanonicalDrawer>

              <CanonicalConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Excluir Módulo de Produção"
                description="Esta ação é permanente e irreversível. Todos os dados vinculados serão purgados."
                confirmLabel="Excluir Definitivamente"
                onConfirm={() => setConfirmOpen(false)}
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Overlay em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
              <div className="flex flex-col gap-2 pt-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Overlays Ativos" state="empty">
            <EmptyState
              icon={Layers}
              title="Sem diálogos pendentes"
              description="Nenhuma confirmação ou tela modal aguardando resposta do operador."
              className="py-4 min-h-36"
            />
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Alerta Crítico" state="error">
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Bloqueio de Sessão</AlertTitle>
                <AlertDescription className="text-xs">
                  Ação restrita aos membros da equipe de engenharia master.
                </AlertDescription>
              </Alert>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAuthAttempts((count) => count + 1)}
                className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reautenticar operador
              </Button>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Tentativas: {authAttempts}
              </p>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
