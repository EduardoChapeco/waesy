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

export function computeCopilotSessionTelemetry(params: {
  messages?: Array<{
    createdAt?: string
    activitySteps?: Array<{ durationMs?: number; tokensUsed?: number }>
    structuredPayload?: Record<string, any>
  }>
  backgroundTasks?: Array<{ cost_wz?: number }>
  threadCreatedAt?: string
}) {
  const msgs = Array.isArray(params.messages) ? params.messages : []
  const tasks = Array.isArray(params.backgroundTasks) ? params.backgroundTasks : []

  let totalTokens = 0
  let totalDurationMs = 0
  for (const msg of msgs) {
    for (const step of msg.activitySteps || []) {
      if (typeof step.tokensUsed === 'number' && Number.isFinite(step.tokensUsed)) {
        totalTokens += step.tokensUsed
      }
      if (typeof step.durationMs === 'number' && Number.isFinite(step.durationMs)) {
        totalDurationMs += step.durationMs
      }
    }
  }

  const totalCostWz = tasks.reduce(
    (acc, t) => acc + (typeof t.cost_wz === 'number' && Number.isFinite(t.cost_wz) ? t.cost_wz : 0),
    0,
  )

  const durationSec = Math.round(totalDurationMs / 1000)
  const durationLabel =
    durationSec <= 0
      ? '—'
      : durationSec < 60
        ? `${durationSec}s`
        : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`

  const firstTs = msgs[0]?.createdAt || params.threadCreatedAt
  const createdAtLabel = firstTs
    ? new Date(firstTs).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sessão atual'

  return {
    durationLabel,
    modelLabel: 'Waesy Multi-Agent Router',
    tokensUsedLabel: `${totalTokens.toLocaleString('pt-BR')} tokens`,
    creditsUsedLabel: totalCostWz > 0 ? `${totalCostWz} $WZ` : '0 créditos',
    createdAtLabel,
    clusterNodeLabel: 'Infraestrutura Edge Waesy',
  }
}

export function ManusTaskTelemetrySheet({
  open,
  onOpenChange,
  durationLabel = '—',
  modelLabel = 'Waesy Multi-Agent Router',
  tokensUsedLabel = '0 tokens',
  creditsUsedLabel = '0 créditos',
  createdAtLabel = 'Sessão atual',
  clusterNodeLabel = 'Infraestrutura Edge Waesy',
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
                <Coins className="size-3.5 text-warning-strong" />
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
