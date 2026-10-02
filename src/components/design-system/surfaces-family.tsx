import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { Table as TableIcon, AlertCircle, RefreshCw } from "lucide-react";

export function SurfacesFamily({ mode }: ComponentStateProps) {
  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família de Superfícies e Dados</h2>
        <p className="text-xs text-muted-foreground">
          Cards, contêineres e tabelas de dados nas 4 matrizes de estado operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Tabela com Dados" state="ready">
            <div className="flex flex-col gap-3">
              <Card className="border border-border shadow-none">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Faturamento do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold font-mono">R$ 14.850,00</div>
                </CardContent>
              </Card>

              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="text-[11px] p-2">Item</TableHead>
                      <TableHead className="text-[11px] p-2 text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="h-9">
                      <TableCell className="text-xs p-2 font-medium">Pacote Serra</TableCell>
                      <TableCell className="text-xs p-2 text-right font-mono">12</TableCell>
                    </TableRow>
                    <TableRow className="h-9">
                      <TableCell className="text-xs p-2 font-medium">Reserva Hotel</TableCell>
                      <TableCell className="text-xs p-2 text-right font-mono">08</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Superfície em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <Card className="border border-border shadow-none">
                <CardHeader className="p-3 pb-1">
                  <Skeleton className="h-3 w-28" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Skeleton className="h-6 w-32" />
                </CardContent>
              </Card>

              <div className="rounded-md border border-border p-2 flex flex-col gap-2">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              </div>
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Registros" state="empty">
            <EmptyState
              icon={TableIcon}
              title="Sem dados na listagem"
              description="Nenhuma transação foi registrada no período consultado."
              action={{
                label: "Cadastrar primeiro item",
                onClick: () => {},
              }}
              className="py-4 min-h-[190px]"
            />
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Leitura" state="error">
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Sincronização</AlertTitle>
                <AlertDescription className="text-xs">
                  Tempo limite de consulta excedido no cluster de persistência.
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                size="sm"
                className="h-11 sm:h-9 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recarregar tabela
              </Button>
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
