import { useEffect, useState } from 'react'
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
  ExternalLink,
  Pause,
} from 'lucide-react'
import type { ExecutionPlanStep, WorkspaceVfsFileEntry } from '@/types/chat'
import { ManusExecutionPlanBar } from './manus-execution-plan-bar'

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
  screenshotUrl?: string
  liveViewerUrl?: string
  driver?: string
  toolLogs?: Array<Record<string, unknown>>
  fileDiff?: {
    filename: string
    original: string
    modified: string
  }
}

export interface LiveBrowserFrameState {
  stepId?: string
  url: string
  screenshotUrl?: string
  liveViewerUrl?: string
  sessionId?: string
  driver?: string
  status?: string
  title?: string
}

interface ManusComputerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName?: string
  taskTitle?: string
  steps?: ManusComputerStep[]
  plan?: ExecutionPlanStep[]
  vfsFiles?: WorkspaceVfsFileEntry[]
  executionStatus?: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  liveBrowserFrame?: LiveBrowserFrameState | null
  onCancelExecution?: () => void
  onPauseExecution?: () => void
  onResumeExecution?: (guidance?: string) => void
  onTakeControl?: (url: string) => void
}

function formatDriverLabel(driver?: string): string | null {
  if (!driver) return null
  const normalized = driver.toLowerCase()
  if (normalized.includes('playwright') || normalized.includes('vps')) return 'VPS Playwright'
  if (normalized.includes('steel')) return 'Steel Cloud'
  if (normalized.includes('http') || normalized.includes('scrape') || normalized.includes('fetch')) {
    return 'Extração Web'
  }
  return driver
}

function isSafePreviewSrc(value?: string): boolean {
  if (!value) return false
  return value.startsWith('https://') || value.startsWith('http://') || value.startsWith('data:image/')
}

export function ManusComputerDrawer({
  open,
  onOpenChange,
  agentName = 'Waesy Copilot',
  taskTitle = 'Execução Autônoma Multi-Agente',
  steps = [],
  plan = [],
  vfsFiles = [],
  executionStatus,
  liveBrowserFrame,
  onCancelExecution,
  onPauseExecution,
  onResumeExecution,
  onTakeControl,
}: ManusComputerDrawerProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [activeToolTab, setActiveToolTab] = useState<'bash' | 'browser' | 'editor'>('editor')
  const [editorMode, setEditorMode] = useState<'diff' | 'original' | 'modified'>('diff')
  const [selectedVfsPath, setSelectedVfsPath] = useState<string>('')
  const [isLive, setIsLive] = useState(true)

  const hasSteps = Array.isArray(steps) && steps.length > 0
  const hasVfs = Array.isArray(vfsFiles) && vfsFiles.length > 0
  const hasContent = hasSteps || hasVfs || Boolean(liveBrowserFrame) || (Array.isArray(plan) && plan.length > 0)
  const currentStep = hasSteps ? (steps[Math.min(currentStepIdx, steps.length - 1)] || steps[0]) : null
  const derivedStatus: 'idle' | 'running' | 'paused' | 'completed' | 'failed' =
    executionStatus || (!hasContent ? 'idle' : 'completed')

  useEffect(() => {
    if (hasVfs && (!selectedVfsPath || !vfsFiles.some((f) => f.path === selectedVfsPath))) {
      setSelectedVfsPath(vfsFiles[0].path)
    }
  }, [hasVfs, selectedVfsPath, vfsFiles])

  const selectedVfsFile = hasVfs
    ? vfsFiles.find((f) => f.path === selectedVfsPath) || vfsFiles[0]
    : null

  useEffect(() => {
    if (isLive && steps.length > 0) {
      setCurrentStepIdx(steps.length - 1)
    }
  }, [steps.length, isLive])

  useEffect(() => {
    if (liveBrowserFrame && isLive) {
      setActiveToolTab('browser')
    }
  }, [liveBrowserFrame, isLive])

  const effectiveBrowserUrl =
    (isLive && liveBrowserFrame?.url) || currentStep?.browserUrl || ''
  const effectiveScreenshotUrl =
    (isLive && liveBrowserFrame?.screenshotUrl) || currentStep?.screenshotUrl || ''
  const effectiveDriver = formatDriverLabel(
    (isLive && liveBrowserFrame?.driver) || currentStep?.driver,
  )

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

            <div className="flex items-center gap-2 shrink-0">
              {derivedStatus === 'running' && (onPauseExecution || onCancelExecution) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onPauseExecution || onCancelExecution}
                  className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Pause className="size-3.5" />
                  <span>Pausar agente</span>
                </Button>
              )}
              {derivedStatus === 'paused' && onResumeExecution && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => onResumeExecution()}
                  className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Play className="size-3.5" />
                  <span>Retomar</span>
                </Button>
              )}
              <Badge
                variant="outline"
                className={
                  derivedStatus === 'failed'
                    ? 'text-xs font-semibold gap-2 bg-destructive/10 text-destructive border-destructive/30'
                    : derivedStatus === 'running'
                      ? 'text-xs font-semibold gap-2 bg-primary/10 text-primary border-primary/30'
                      : derivedStatus === 'paused'
                        ? 'text-xs font-semibold gap-2 bg-warning/10 text-warning-strong border-warning/30'
                        : derivedStatus === 'idle'
                          ? 'text-xs font-semibold gap-2 bg-muted text-muted-foreground border-border/60'
                          : 'text-xs font-semibold gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                }
              >
                {derivedStatus === 'failed' ? (
                  <AlertCircle className="size-3.5" />
                ) : derivedStatus === 'running' ? (
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : derivedStatus === 'paused' ? (
                  <Pause className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                {derivedStatus === 'failed'
                  ? 'Execução com falha'
                  : derivedStatus === 'running'
                    ? 'Execução em andamento'
                    : derivedStatus === 'paused'
                      ? 'Aguardando usuário'
                      : derivedStatus === 'idle'
                        ? 'Aguardando execução'
                        : 'Tarefa concluída'}
              </Badge>
            </div>
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
              Console & Logs
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

        {!hasContent ? (
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
                {currentStep?.title || liveBrowserFrame?.title || 'Sessão ao vivo'}
              </span>
              <span className="font-mono text-muted-foreground shrink-0 truncate max-w-48">
                {currentStep?.target || effectiveBrowserUrl || 'sandbox'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/10 space-y-3">
              {Array.isArray(plan) && plan.length > 0 && (
                <ManusExecutionPlanBar
                  plan={plan}
                  isRunning={derivedStatus === 'running'}
                  isPaused={derivedStatus === 'paused'}
                  onPause={onPauseExecution || onCancelExecution}
                  onResume={onResumeExecution}
                />
              )}
              {activeToolTab === 'editor' && (
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
                  {hasVfs && (
                    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border/60 bg-muted/20">
                      {vfsFiles.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedVfsPath(file.path)}
                          className={`h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 rounded-md text-xs font-mono transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            selectedVfsFile?.path === file.path
                              ? 'bg-background text-foreground font-semibold border border-border/60'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {file.path}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/30">
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {currentStep?.fileDiff?.filename || selectedVfsFile?.path || 'workspace-vfs'}
                    </span>
                    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                      {(['diff', 'original', 'modified'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setEditorMode(mode)}
                          className={`h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
                        {currentStep?.fileDiff?.modified || selectedVfsFile?.content || '// Estado modificado não registrado'}
                      </pre>
                    )}
                    {editorMode === 'diff' && (
                      <div className="space-y-1">
                        {currentStep?.fileDiff?.modified || selectedVfsFile?.content ? (
                          <pre className="text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">
                            {currentStep?.fileDiff?.modified || selectedVfsFile?.content}
                          </pre>
                        ) : (
                          <p className="text-muted-foreground italic">Nenhuma alteração de arquivo registrada neste passo.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeToolTab === 'bash' && (
                <div className="rounded-xl border border-border/80 bg-neutral-950 text-neutral-100 p-4 font-mono text-xs leading-relaxed overflow-x-auto scroll-area-carousel space-y-3">
                  <pre className="whitespace-pre-wrap">
                    {currentStep?.terminalOutput || 'Nenhuma saída de comando registrada para este passo.'}
                  </pre>
                  {Array.isArray(currentStep?.toolLogs) && currentStep.toolLogs.length > 0 && (
                    <div className="border-t border-neutral-800 pt-3 space-y-2">
                      <span className="text-2xs uppercase tracking-wider text-neutral-400 block">
                        Logs estruturados ({currentStep.toolLogs.length})
                      </span>
                      <pre className="text-2xs text-neutral-300 whitespace-pre-wrap">
                        {JSON.stringify(currentStep.toolLogs, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeToolTab === 'browser' && (
                <div className="rounded-xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60">
                  <div className="flex flex-wrap items-center gap-2 bg-muted/30 px-4 py-2 text-xs font-mono">
                    <Globe className="size-3.5 text-primary shrink-0" />
                    <span className="truncate flex-1 min-w-0 text-foreground">
                      {effectiveBrowserUrl || 'Nenhuma URL ativa'}
                    </span>
                    {effectiveDriver && (
                      <Badge variant="outline" className="text-2xs shrink-0">
                        {effectiveDriver}
                      </Badge>
                    )}
                    {derivedStatus === 'running' && (
                      <RefreshCw className="size-3.5 text-primary animate-spin motion-reduce:animate-none shrink-0" />
                    )}
                  </div>

                  {isSafePreviewSrc(effectiveScreenshotUrl) ? (
                    <div className="bg-muted/20 p-3">
                      <img
                        src={effectiveScreenshotUrl}
                        alt={`Captura ao vivo de ${effectiveBrowserUrl || 'navegador cloud'}`}
                        className="w-full max-h-96 object-contain rounded-lg border border-border/50 bg-background"
                      />
                    </div>
                  ) : null}

                  <div className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {currentStep?.browserSummary ||
                        liveBrowserFrame?.status ||
                        'Navegador em espera para a próxima instrução.'}
                    </p>

                    {(effectiveBrowserUrl.startsWith('http') || liveBrowserFrame?.liveViewerUrl) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {(liveBrowserFrame?.liveViewerUrl || currentStep?.liveViewerUrl) && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const targetTakeUrl = liveBrowserFrame?.liveViewerUrl || currentStep?.liveViewerUrl || effectiveBrowserUrl;
                              if (onTakeControl) {
                                onTakeControl(targetTakeUrl);
                              } else {
                                window.open(targetTakeUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="h-11 min-h-11 sm:h-9 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ExternalLink className="size-3.5" />
                            <span>Assumir controle</span>
                          </Button>
                        )}
                        {effectiveBrowserUrl.startsWith('http') && (
                          <a
                            href={effectiveBrowserUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 min-h-11 sm:h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ExternalLink className="size-3.5" />
                            <span>Abrir URL externa</span>
                          </a>
                        )}
                        {!liveBrowserFrame?.liveViewerUrl && !currentStep?.liveViewerUrl && onTakeControl && effectiveBrowserUrl.startsWith('http') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onTakeControl(effectiveBrowserUrl)}
                            className="h-11 min-h-11 sm:h-9 px-3 text-xs font-medium gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span>Assumir controle</span>
                          </Button>
                        )}
                      </div>
                    )}
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
