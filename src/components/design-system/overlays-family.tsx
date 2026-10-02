import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { Layers, AlertCircle, RefreshCw, PanelRight, ShieldAlert } from "lucide-react";

export function OverlaysFamily({ mode }: ComponentStateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família de Modais e Overlays</h2>
        <p className="text-xs text-muted-foreground">
          Diálogos, gavetas laterais (sheets) e alertas nas 4 matrizes de estado operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Modais Interativos" state="ready">
            <div className="flex flex-col gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-11 sm:h-9 w-full justify-start gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    Abrir Diálogo Canônico
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Diálogo Canônico</DialogTitle>
                    <DialogDescription className="text-xs">
                      Superfície flutuante com foco preso e fechamento por Escape.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2 text-xs text-muted-foreground">
                    Exemplo de conteúdo estruturado com separação rígida de camadas e tokens DTCG.
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-11 sm:h-9">
                      Fechar
                    </Button>
                    <Button size="sm" onClick={() => setDialogOpen(false)} className="h-11 sm:h-9">
                      Confirmar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-11 sm:h-9 w-full justify-start gap-2">
                    <PanelRight className="h-3.5 w-3.5" />
                    Abrir Gaveta Lateral
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Painel Lateral</SheetTitle>
                    <SheetDescription className="text-xs">
                      Gaveta lateral adaptável com barra inferior no mobile.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4 text-xs text-muted-foreground">
                    Navegação contextual limpa sem interferência no scroll principal.
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Overlay em Preparação" state="loading">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
              <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
              <div className="flex flex-col gap-1.5 pt-2">
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
              className="py-4 min-h-[160px]"
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
                variant="outline"
                size="sm"
                className="h-11 sm:h-9 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reautenticar operador
              </Button>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
