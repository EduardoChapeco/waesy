import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  ArrowRight,
  FileText,
  User,
  AlertCircle,
  Building2,
  Receipt,
} from "lucide-react";
import type { PayrollCalculationResult } from "@/lib/payroll-calculator";

export type KanbanPayrollStage =
  | "apuracao"
  | "conferencia"
  | "aprovado_rh"
  | "enviado_financeiro"
  | "quitado";

export interface KanbanPayrollItem {
  employeeId: string;
  name: string;
  role: string;
  department?: string;
  employmentType: string;
  baseSalaryCents: number;
  netSalaryCents: number;
  stage: KanbanPayrollStage;
  hasPayslip: boolean;
}

interface PayrollKanbanBoardProps {
  items: KanbanPayrollItem[];
  calculations: Record<string, PayrollCalculationResult>;
  onAdvanceStage: (employeeId: string, nextStage: KanbanPayrollStage) => void;
  onOpenPayslip: (employeeId: string) => void;
}

const STAGES: Array<{
  id: KanbanPayrollStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    id: "apuracao",
    label: "1. Apuração & Ponto",
    description: "Espelho de ponto, horas extras, faltas e atestados",
    icon: Clock,
    color: "text-warning-strong border-warning/20 bg-warning/5",
  },
  {
    id: "conferencia",
    label: "2. Conferência",
    description: "Cálculo de encargos INSS, IRRF, FGTS e vales",
    icon: ShieldCheck,
    color: "text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/5",
  },
  {
    id: "aprovado_rh",
    label: "3. Aprovado pelo RH",
    description: "Holerites emitidos e liberados para colaboradores",
    icon: FileText,
    color: "text-purple-600 dark:text-purple-400 border-purple-500/20 bg-purple-500/5",
  },
  {
    id: "enviado_financeiro",
    label: "4. Na Tesouraria",
    description: "Obrigação em Contas a Pagar para liquidação",
    icon: Receipt,
    color: "text-orange-600 dark:text-orange-400 border-orange-500/20 bg-orange-500/5",
  },
  {
    id: "quitado",
    label: "5. Pago & Quitado",
    description: "Transferência bancária realizada com comprovante",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  },
];

export function PayrollKanbanBoard({
  items,
  calculations,
  onAdvanceStage,
  onOpenPayslip,
}: PayrollKanbanBoardProps) {
  const getNextStage = (current: KanbanPayrollStage): KanbanPayrollStage | null => {
    switch (current) {
      case "apuracao":
        return "conferencia";
      case "conferencia":
        return "aprovado_rh";
      case "aprovado_rh":
        return "enviado_financeiro";
      case "enviado_financeiro":
        return "quitado";
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto scroll-area pb-2">
      {STAGES.map((stage) => {
        const stageItems = items.filter((item) => item.stage === stage.id);
        const stageTotalNetCents = stageItems.reduce((acc, cur) => acc + cur.netSalaryCents, 0);
        const Icon = stage.icon;

        return (
          <div
            key={stage.id}
            className="flex flex-col rounded-lg border border-border bg-card p-3 space-y-3 min-w-60"
          >
            {/* Cabeçalho da Coluna Kanban */}
            <div className="space-y-1 pb-2 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground">{stage.label}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {stageItems.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {stage.description}
              </p>
              <div className="text-xs font-mono font-bold text-foreground pt-1">
                {formatMoney(stageTotalNetCents)}
              </div>
            </div>

            {/* Lista de Cartões da Coluna */}
            <div className="space-y-2 flex-1 min-h-40">
              {stageItems.length === 0 ? (
                <div className="h-28 rounded-lg border border-dashed border-border/60 flex flex-col items-center justify-center text-center p-3 text-muted-foreground text-xs">
                  <span>Nenhum colaborador nesta etapa</span>
                </div>
              ) : (
                stageItems.map((item) => {
                  const calc = calculations[item.employeeId];
                  const next = getNextStage(item.stage);

                  return (
                    <div
                      key={item.employeeId}
                      className="p-3 rounded-lg border border-border bg-background space-y-2 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      tabIndex={0}
                    >
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-foreground line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{item.role}</p>
                        </div>
                        <Badge variant="outline" className="text-xs uppercase font-bold shrink-0">
                          {item.employmentType}
                        </Badge>
                      </div>

                      {/* Dados Financeiros */}
                      <div className="pt-1 border-t border-border/50 grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-xs">Bruto</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatMoney(calc?.grossSalaryCents ?? item.baseSalaryCents)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-xs">Líquido</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(calc?.netSalaryCents ?? item.netSalaryCents)}
                          </span>
                        </div>
                      </div>

                      {/* Ações do Card */}
                      <div className="pt-1 flex items-center justify-between gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenPayslip(item.employeeId)}
                          className="h-11 min-h-11 sm:h-9 text-xs px-2 font-bold text-primary hover:text-primary gap-1"
                        >
                          <FileText className="size-3" />
                          <span>Holerite</span>
                        </Button>

                        {next && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAdvanceStage(item.employeeId, next)}
                            className="h-11 min-h-11 sm:h-9 text-xs px-2 font-bold gap-1 ml-auto"
                            title="Avançar para a próxima etapa"
                          >
                            <span>Avançar</span>
                            <ArrowRight className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
