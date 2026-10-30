import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Clock, Cpu, Activity, Coins, CheckCircle2, Server } from 'lucide-react'

interface ManusTaskTelemetrySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  durationLabel?: string
  modelLabel?: string
  tokensUsedLabel?: string
  creditsUsedLabel?: string
  createdAtLabel?: string
  clusterNodeLabel?: string
}

export function ManusTaskTelemetrySheet({
  open,
  onOpenChange,
  durationLabel = '5m 36s',
  modelLabel = 'Waesy 2.0 Lite (Multi-Agent Router)',
  tokensUsedLabel = '14.820 tokens',
  creditsUsedLabel = '95 créditos (Free Tier Pool)',
  createdAtLabel = 'Hoje, 14:20',
  clusterNodeLabel = 'Oracle Cloud VPS · 147.15.61.45',
}: ManusTaskTelemetrySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md pt-safe-modal pb-safe">
        <SheetHeader className="pb-4 border-b border-border/60">
          <SheetTitle className="text-base font-bold">
            Informações da tarefa
          </SheetTitle>
          <SheetDescription className="text-xs">
            Telemetria de execução, consumo de modelo e infraestrutura ativa.
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>Duração da tarefa</span>
              </div>
              <p className="text-sm font-bold font-mono text-foreground">
                {durationLabel}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coins className="size-3.5 text-amber-500" />
                <span>Créditos usados</span>
              </div>
              <p className="text-sm font-bold font-mono text-foreground">
                {creditsUsedLabel}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cpu className="size-3.5 text-emerald-500" />
                <span>Agente Base</span>
              </div>
              <p className="text-xs font-bold text-foreground truncate">
                {modelLabel}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                <span>Volume processado</span>
              </div>
              <p className="text-xs font-bold font-mono text-foreground">
                {tokensUsedLabel}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Início da sessão</span>
              <span className="font-medium text-foreground">{createdAtLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cluster de execução</span>
              <span className="font-mono font-medium text-foreground flex items-center gap-2">
                <Server className="size-3.5 text-emerald-500" />
                {clusterNodeLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status de auditoria</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                Verificado
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
