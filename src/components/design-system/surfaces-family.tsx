import {
  CanonicalSurface,
  CanonicalKpiTile,
  CanonicalLedgerRow,
  CanonicalDataTable,
  type DataTableColumn,
} from "@/components/ui/canonical";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StateCard } from "./state-card";
import type { ComponentStateProps } from "./design-system-types";
import { DollarSign, Plus } from "lucide-react";

interface TransactionItem {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: string;
  type: "credit" | "debit";
  status: string;
}

const sampleTransactions: TransactionItem[] = [
  {
    id: "tx-1",
    date: "02/10 09:30",
    title: "Pacote Serra Gaúcha",
    category: "Turismo",
    amount: "+R$ 1.850,00",
    type: "credit",
    status: "Aprovado",
  },
  {
    id: "tx-2",
    date: "02/10 09:12",
    title: "Comissão Plataforma",
    category: "Taxa",
    amount: "-R$ 92,50",
    type: "debit",
    status: "Liquidado",
  },
];

const tableColumns: DataTableColumn<TransactionItem>[] = [
  {
    key: "title",
    header: "Item",
    render: (item) => (
      <div>
        <p className="font-semibold text-foreground">{item.title}</p>
        <p className="text-muted-foreground">{item.category}</p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Valor",
    isNumeric: true,
    render: (item) => (
      <span className={item.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
        {item.amount}
      </span>
    ),
  },
];

export function SurfacesFamily({ mode }: ComponentStateProps) {
  const showReady = mode === "all" || mode === "ready";
  const showLoading = mode === "all" || mode === "loading";
  const showEmpty = mode === "all" || mode === "empty";
  const showError = mode === "all" || mode === "error";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Família Superfície e Dados</h2>
        <p className="text-xs text-muted-foreground">
          CanonicalSurface, CanonicalKpiTile, CanonicalLedgerRow e CanonicalDataTable nas 4 matrizes de estado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ESTADO 1: PRONTO */}
        {showReady && (
          <StateCard title="Superfície e Métricas" state="ready">
            <div className="flex flex-col gap-3">
              <CanonicalKpiTile
                label="Receita do Dia"
                value="R$ 14.850,00"
                trend={{ value: "+12.4%", isPositive: true }}
                description="vs. ontem"
                icon={<DollarSign className="h-4 w-4 text-primary" />}
              />

              <CanonicalSurface variant="default" padding="sm" className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground px-2 pt-1">
                  Extrato Contábil Recente
                </p>
                {sampleTransactions.map((tx) => (
                  <CanonicalLedgerRow
                    key={tx.id}
                    id={tx.id}
                    date={tx.date}
                    title={tx.title}
                    category={tx.category}
                    amount={tx.amount}
                    type={tx.type}
                    status={
                      <Badge variant="outline" className="text-xs font-normal">
                        {tx.status}
                      </Badge>
                    }
                  />
                ))}
              </CanonicalSurface>
            </div>
          </StateCard>
        )}

        {/* ESTADO 2: CARREGAMENTO (SKELETON ESPELHADO) */}
        {showLoading && (
          <StateCard title="Superfície em Carga" state="loading">
            <div className="flex flex-col gap-3">
              <CanonicalKpiTile
                label="Receita do Dia"
                isLoading={true}
                icon={<DollarSign className="h-4 w-4" />}
              />

              <CanonicalDataTable
                data={[]}
                columns={tableColumns}
                keyExtractor={(item) => item.id}
                isLoading={true}
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 3: VAZIO */}
        {showEmpty && (
          <StateCard title="Sem Movimentação" state="empty">
            <div className="flex flex-col gap-3">
              <CanonicalKpiTile
                label="Receita do Dia"
                value=""
                icon={<DollarSign className="h-4 w-4" />}
              />

              <CanonicalDataTable
                data={[]}
                columns={tableColumns}
                keyExtractor={(item) => item.id}
                emptyTitle="Nenhum lançamento no período"
                emptyDescription="Nenhuma transação contábil ou venda foi registrada nesta data."
                emptyAction={
                  <Button type="button" size="sm" className="h-11 gap-1 text-xs focus-visible:ring-2" onClick={() => {}}>
                    <Plus className="h-3.5 w-3.5" />
                    Registrar Lançamento
                  </Button>
                }
              />
            </div>
          </StateCard>
        )}

        {/* ESTADO 4: ERRO */}
        {showError && (
          <StateCard title="Falha de Leitura" state="error">
            <div className="flex flex-col gap-3">
              <CanonicalKpiTile
                label="Receita do Dia"
                errorMessage="Cluster de leitura fora do ar."
                onRetry={() => {}}
              />

              <CanonicalDataTable
                data={[]}
                columns={tableColumns}
                keyExtractor={(item) => item.id}
                errorMessage="Tempo limite de resposta excedido ao consultar o ledger."
                onRetry={() => {}}
              />
            </div>
          </StateCard>
        )}
      </div>
    </div>
  );
}
