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
  AlertCircle,
  Loader2,
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
  executionStatus?: 'idle' | 'running' | 'completed' | 'failed'
}

export function ManusComputerDrawer({
  open,
  onOpenChange,
  agentName = 'Waesy 2.0 Lite',
  taskTitle = 'Execução Autônoma Multi-Agente',
  steps = [],
  executionStatus,
}: ManusComputerDrawerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [activeToolTab, setActiveToolTab] = useState<'bash' | 'browser' | 'editor'>('editor')
  const [editorMode, setEditorMode] = useState<'diff' | 'original' | 'modified'>('diff')
  const [isLive, setIsLive] = useState(true)

  const hasSteps = Array.isArray(steps) && steps.length > 0
  const currentStep = hasSteps ? (steps[currentStepIdx] || steps[0]) : null
  const derivedStatus: 'idle' | 'running' | 'completed' | 'failed' =
    executionStatus || (!hasSteps ? 'idle' : 'completed')

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
              className={
                derivedStatus === 'failed'
                  ? 'text-xs font-semibold gap-2 bg-destructive/10 text-destructive border-destructive/30'
                  : derivedStatus === 'running'
                    ? 'text-xs font-semibold gap-2 bg-primary/10 text-primary border-primary/30'
                    : derivedStatus === 'idle'
                      ? 'text-xs font-semibold gap-2 bg-muted text-muted-foreground border-border/60'
                      : 'text-xs font-semibold gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }
            >
              {derivedStatus === 'failed' ? (
                <AlertCircle className="size-3.5" />
              ) : derivedStatus === 'running' ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {derivedStatus === 'failed'
                ? 'Execução com falha'
                : derivedStatus === 'running'
                  ? 'Execução em andamento'
                  : derivedStatus === 'idle'
                    ? 'Aguardando execução'
                    : 'Tarefa concluída'}
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

        {!hasSteps ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Monitor className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Nenhuma execução de ferramenta ativa</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Quando o Copilot executar comandos no terminal, navegações no navegador cloud ou modificações de arquivos nesta conversa, os passos detalhados aparecerão aqui em tempo real.
              </p>
            </div>
          </div>
        ) : (
          <>
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
                      {currentStep?.fileDiff?.filename || 'arquivo.json'}
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

                  <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto scroll-area-carousel">
                    {editorMode === 'original' && (
                      <pre className="text-muted-foreground whitespace-pre-wrap">
                        {currentStep?.fileDiff?.original || '// Estado original não registrado'}
                      </pre>
                    )}
                    {editorMode === 'modified' && (
                      <pre className="text-foreground whitespace-pre-wrap">
                        {currentStep?.fileDiff?.modified || '// Estado modificado não registrado'}
                      </pre>
                    )}
                    {editorMode === 'diff' && (
                      <div className="space-y-1">
                        {currentStep?.fileDiff?.modified ? (
                          <pre className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">
                            {currentStep.fileDiff.modified}
                          </pre>
                        ) : (
                          <p className="text-muted-foreground italic">Nenhuma alteração de código neste passo.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeToolTab === 'bash' && (
                <div className="rounded-xl border border-border/80 bg-neutral-950 text-neutral-100 p-4 font-mono text-xs leading-relaxed overflow-x-auto scroll-area-carousel">
                  <pre className="whitespace-pre-wrap">
                    {currentStep?.terminalOutput || 'Nenhuma saída de comando registrada para este passo.'}
                  </pre>
                </div>
              )}

              {activeToolTab === 'browser' && (
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden space-y-3 p-4">
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs font-mono">
                    <Globe className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {currentStep?.browserUrl || 'https://waesy.com.br'}
                    </span>
                    <RefreshCw className="size-3.5 ml-auto text-muted-foreground" />
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
                    {currentStep?.browserSummary || 'Navegador em espera para a próxima instrução.'}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {hasSteps && (
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
        )}
      </SheetContent>
    </Sheet>
  )
}
