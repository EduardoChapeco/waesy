import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Terminal,
  Globe,
  FileCode2,
  Play,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Monitor,
  RefreshCw,
} from 'lucide-react'

export interface ManusComputerStep {
  id: string
  index: number
  title: string
  tool: 'bash' | 'browser' | 'editor'
  target: string
  timestamp: string
  terminalOutput?: string
  browserUrl?: string
  browserSummary?: string
  fileDiff?: {
    filename: string
    original: string
    modified: string
  }
}

interface ManusComputerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName?: string
  taskTitle?: string
  steps?: ManusComputerStep[]
}

const DEFAULT_STEPS: ManusComputerStep[] = [
  {
    id: 'step-1',
    index: 1,
    title: 'Inspecionando estado do cluster Waesy Cloud e instâncias WhatsApp',
    tool: 'bash',
    target: 'ubuntu@147.15.61.45:~/waesy-services',
    timestamp: '14:20:08',
    terminalOutput: `$ docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
NAMES                STATUS                   PORTS
waesy-whatsapp-api   Up 2 hours               0.0.0.0:8080->8080/tcp
waesy-postgres       Up 2 hours (healthy)     0.0.0.0:5432->5432/tcp
waesy-redis          Up 2 hours               127.0.0.1:6379->6379/tcp
$ curl -s http://localhost:8080 | jq .
{
  "status": 200,
  "message": "Welcome to the Evolution API, it is working!",
  "version": "2.3.7"
}`,
  },
  {
    id: 'step-2',
    index: 2,
    title: 'Navegando para auditoria de vitrine e catálogo de ofertas',
    tool: 'browser',
    target: 'https://waesy.app/workspace/atendimento',
    timestamp: '14:20:24',
    browserUrl: 'https://waesy.app/workspace/atendimento',
    browserSummary:
      'Playwright Chromium Headless (Sessão Isolada #WAE-09) — DOM hidratado em 340ms. Verificados 3 canais ativos (Vendas, Mobilidade, Corporativo) e fila de atendimento sem gargalos.',
  },
  {
    id: 'step-3',
    index: 3,
    title: 'Atualizando regras de roteamento de IA SDR e despacho de corridas',
    tool: 'editor',
    target: 'config/whatsapp-governance.json',
    timestamp: '14:20:49',
    fileDiff: {
      filename: 'config/whatsapp-governance.json',
      original: `{
  "routingMode": "manual_queue",
  "enableMobilityBookingBot": false,
  "enableCorporateTravelBot": false
}`,
      modified: `{
  "routingMode": "ai_sdr_first",
  "enableMobilityBookingBot": true,
  "enableCorporateTravelBot": true,
  "autoVerifyProfilePhone": true
}`,
    },
  },
]

export function ManusComputerDrawer({
  open,
  onOpenChange,
  agentName = 'Waesy 2.0 Lite',
  taskTitle = 'Execução Autônoma Multi-Agente',
  steps = DEFAULT_STEPS,
}: ManusComputerDrawerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(steps.length - 1)
  const [activeToolTab, setActiveToolTab] = useState<'bash' | 'browser' | 'editor'>('editor')
  const [editorMode, setEditorMode] = useState<'diff' | 'original' | 'modified'>('diff')
  const [isLive, setIsLive] = useState(true)

  const currentStep = steps[currentStepIdx] || steps[0]

  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx)
    const targetStep = steps[idx]
    if (targetStep) {
      setActiveToolTab(targetStep.tool)
    }
    setIsLive(idx === steps.length - 1)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0 overflow-hidden pt-safe-modal">
        <SheetHeader className="px-4 py-4 border-b border-border/70 bg-card/80 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Monitor className="size-4" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-sm font-bold truncate">
                  Computador do Waesy
                </SheetTitle>
                <SheetDescription className="text-xs truncate">
                  {agentName} · {taskTitle}
                </SheetDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-xs font-semibold gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            >
              <CheckCircle2 className="size-3.5" />
              O Waesy concluiu a tarefa
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl bg-muted/60 p-1 mt-2">
            <button
              type="button"
              onClick={() => setActiveToolTab('editor')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeToolTab === 'editor'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode2 className="size-3.5" />
              Editor Inline
            </button>
            <button
              type="button"
              onClick={() => setActiveToolTab('bash')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeToolTab === 'bash'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="size-3.5" />
              Terminal VPS
            </button>
            <button
              type="button"
              onClick={() => setActiveToolTab('browser')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeToolTab === 'browser'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="size-3.5" />
              Navegador Cloud
            </button>
          </div>
        </SheetHeader>

        <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 text-xs shrink-0">
          <span className="font-medium text-foreground truncate">
            {currentStep?.title}
          </span>
          <span className="font-mono text-muted-foreground shrink-0">
            {currentStep?.target}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
          {activeToolTab === 'editor' && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30">
                <span className="text-xs font-mono font-semibold text-foreground">
                  {currentStep?.fileDiff?.filename || 'config/whatsapp-governance.json'}
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  {(['diff', 'original', 'modified'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditorMode(mode)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                        editorMode === mode
                          ? 'bg-background text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'diff'
                        ? 'Diferença'
                        : mode === 'original'
                        ? 'Original'
                        : 'Modificado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* design-lint-ignore DL-30 reason:"Área de código de editor inline requer rolagem horizontal para diffs extensos" expiry:"2027-10-30" */}
              <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                {editorMode === 'original' && (
                  <pre className="text-muted-foreground whitespace-pre-wrap">
                    {currentStep?.fileDiff?.original || DEFAULT_STEPS[2].fileDiff?.original}
                  </pre>
                )}
                {editorMode === 'modified' && (
                  <pre className="text-foreground whitespace-pre-wrap">
                    {currentStep?.fileDiff?.modified || DEFAULT_STEPS[2].fileDiff?.modified}
                  </pre>
                )}
                {editorMode === 'diff' && (
                  <div className="space-y-1">
                    <div className="rounded bg-destructive/10 px-2 py-1 text-destructive">
                      - &quot;routingMode&quot;: &quot;manual_queue&quot;,
                    </div>
                    <div className="rounded bg-destructive/10 px-2 py-1 text-destructive">
                      - &quot;enableMobilityBookingBot&quot;: false,
                    </div>
                    <div className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                      + &quot;routingMode&quot;: &quot;ai_sdr_first&quot;,
                    </div>
                    <div className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                      + &quot;enableMobilityBookingBot&quot;: true,
                    </div>
                    <div className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                      + &quot;enableCorporateTravelBot&quot;: true,
                    </div>
                    <div className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                      + &quot;autoVerifyProfilePhone&quot;: true
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeToolTab === 'bash' && (
            /* design-lint-ignore DL-30 reason:"Terminal bash VPS requer rolagem horizontal para comandos longos" expiry:"2027-10-30" */
            <div className="rounded-xl border border-border/80 bg-neutral-950 text-neutral-100 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                {currentStep?.terminalOutput || DEFAULT_STEPS[0].terminalOutput}
              </pre>
            </div>
          )}

          {activeToolTab === 'browser' && (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden space-y-3 p-4">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs font-mono">
                <Globe className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {currentStep?.browserUrl || DEFAULT_STEPS[1].browserUrl}
                </span>
                <RefreshCw className="size-3.5 ml-auto text-muted-foreground" />
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
                {currentStep?.browserSummary || DEFAULT_STEPS[1].browserSummary}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/80 bg-card flex items-center justify-between gap-3 shrink-0 pb-safe">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleSelectStep(Math.max(0, currentStepIdx - 1))}
              disabled={currentStepIdx === 0}
              className="size-11 focus-visible:ring-2"
              aria-label="Passo anterior"
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleSelectStep(Math.min(steps.length - 1, currentStepIdx + 1))}
              disabled={currentStepIdx === steps.length - 1}
              className="size-11 focus-visible:ring-2"
              aria-label="Próximo passo"
            >
              <SkipForward className="size-4" />
            </Button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, steps.length - 1)}
              value={currentStepIdx}
              onChange={(e) => handleSelectStep(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
              aria-label="Linha do tempo de execução do computador"
            />
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {currentStepIdx + 1}/{steps.length}
            </span>
          </div>

          <Button
            type="button"
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelectStep(steps.length - 1)}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 focus-visible:ring-2"
          >
            <Play className="size-3.5" />
            Ao vivo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
