import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { AlertCircle, RefreshCw, MousePointerClick } from "lucide-react";

export function ActionsFamily({ mode }: ComponentStateProps) {
  const [switchVal, setSwitchVal] = useState(true);
  const [checkVal, setCheckVal] = useState(true);

  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família de Ações</h2>
        <p className="text-xs text-muted-foreground">
          Botões, switches, checkboxes e badges nas 4 matrizes de estado operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Ações Interativas" state="ready">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-11 sm:h-9">
                  Principal
                </Button>
                <Button variant="secondary" size="sm" className="h-11 sm:h-9">
                  Secundário
                </Button>
                <Button variant="outline" size="sm" className="h-11 sm:h-9">
                  Linha
                </Button>
                <Button variant="destructive" size="sm" className="h-11 sm:h-9">
                  Excluir
                </Button>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-demo"
                    checked={switchVal}
                    onCheckedChange={setSwitchVal}
                  />
                  <Label htmlFor="switch-demo" className="text-xs cursor-pointer">
                    Notificações
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="check-demo"
                    checked={checkVal}
                    onCheckedChange={(c) => setCheckVal(Boolean(c))}
                  />
                  <Label htmlFor="check-demo" className="text-xs cursor-pointer">
                    Confirmar
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="default">Ativo</Badge>
                <Badge variant="secondary">Pendente</Badge>
                <Badge variant="outline">Neutro</Badge>
                <Badge variant="destructive">Bloqueado</Badge>
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Ações em Espera" state="loading">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-11 sm:h-9 w-20 rounded-md" />
                <Skeleton className="h-11 sm:h-9 w-24 rounded-md" />
                <Skeleton className="h-11 sm:h-9 w-16 rounded-md" />
                <Skeleton className="h-11 sm:h-9 w-18 rounded-md" />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Ações Disponíveis" state="empty">
            <EmptyState
              icon={MousePointerClick}
              title="Sem ações disponíveis"
              description="Nenhum gatilho de ação configurado para este contexto."
              action={{
                label: "Habilitar comandos",
                onClick: () => {},
              }}
              className="py-4 min-h-[160px]"
            />
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Execução" state="error">
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Acionamento</AlertTitle>
                <AlertDescription className="text-xs">
                  Ação bloqueada por restrição de permissão de segurança.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                size="sm"
                className="h-11 sm:h-9 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
