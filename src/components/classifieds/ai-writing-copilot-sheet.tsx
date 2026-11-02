import * as React from 'react'
import {
  Check,
  RotateCcw,
  Undo2,
  Redo2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Send,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Tag,
  Plus,
  X,
  Scissors,
  Wand2,
  Eye,
  Loader2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useWindowSizeClass } from '@/hooks/use-mobile'
import { refineClassifiedWithAI } from '@/services/classifieds.functions'
import {
  extractAdCopilotContext,
  computeSourceFingerprint,
  computeEditorialQualityHints,
  validateCopilotOutputFacts,
  applySelectionReplacement,
  buildSelectivePatch,
  normalizeTagList,
  type CopilotScope,
  type CopilotOperation,
  type CopilotTone,
  type CopilotLength,
  type CopilotGoal,
  type CopilotWorkingDraft,
  type CopilotVariant,
  type CopilotHistoryEntry,
  type EditorialFieldKey,
} from '@/lib/classifieds/ai-writing-copilot'
import { toast } from 'sonner'

export interface AiWritingCopilotSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialScope?: CopilotScope
  entityId?: string
  storeId?: string
  niche: string
  categoryName?: string
  title: string
  description: string
  summary?: string
  tags?: string[]
  price?: string | number
  city?: string
  neighborhood?: string
  attributes?: Record<string, unknown>
  onApplyDraft: (
    patched: CopilotWorkingDraft,
    appliedFields: EditorialFieldKey[],
  ) => void
}

const QUICK_OPERATIONS: Array<{
  operation: CopilotOperation
  label: string
  tone?: CopilotTone
}> = [
  { operation: 'improve', label: 'Melhorar texto' },
  { operation: 'fix_grammar', label: 'Corrigir gramática' },
  { operation: 'shorten', label: 'Mais curto' },
  { operation: 'expand', label: 'Expandir detalhes' },
  { operation: 'clarify', label: 'Mais direto', tone: 'direto' },
  { operation: 'persuasive', label: 'Mais comercial', tone: 'comercial' },
  { operation: 'rewrite', label: 'Tom premium', tone: 'premium' },
  { operation: 'improve_cta', label: 'Melhorar CTA' },
  { operation: 'generate_tags', label: 'Gerar tags' },
]

const TONE_OPTIONS: Array<{ value: CopilotTone; label: string }> = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'direto', label: 'Direto' },
  { value: 'profissional', label: 'Profissional' },
  { value: 'elegante', label: 'Elegante' },
  { value: 'premium', label: 'Premium' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'inspirador', label: 'Inspirador' },
  { value: 'amigavel', label: 'Amigável' },
  { value: 'informativo', label: 'Informativo' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'minimalista', label: 'Minimalista' },
]

const LENGTH_OPTIONS: Array<{ value: CopilotLength; label: string }> = [
  { value: 'short', label: 'Curto' },
  { value: 'medium', label: 'Médio' },
  { value: 'complete', label: 'Completo' },
]

const GOAL_OPTIONS: Array<{ value: CopilotGoal; label: string }> = [
  { value: 'conversion', label: 'Mais conversão' },
  { value: 'clarity', label: 'Mais clareza' },
  { value: 'discovery', label: 'Mais descoberta' },
  { value: 'trust', label: 'Mais confiança' },
  { value: 'storytelling', label: 'Mais narrativa' },
]

const SCOPE_OPTIONS: Array<{ value: CopilotScope; label: string }> = [
  { value: 'all_editorial_fields', label: 'Anúncio completo' },
  { value: 'title', label: 'Apenas título' },
  { value: 'description', label: 'Apenas descrição' },
  { value: 'summary', label: 'Apenas síntese' },
  { value: 'tags', label: 'Apenas tags' },
]

export function AiWritingCopilotSheet({
  open,
  onOpenChange,
  initialScope = 'all_editorial_fields',
  entityId,
  storeId,
  niche,
  categoryName,
  title,
  description,
  summary = '',
  tags = [],
  price,
  city,
  neighborhood,
  attributes = {},
  onApplyDraft,
}: AiWritingCopilotSheetProps) {
  const { isCompact } = useWindowSizeClass()

  const structuredContext = React.useMemo(
    () =>
      extractAdCopilotContext({
        entityId,
        storeId,
        niche,
        categoryName,
        title,
        description,
        summary,
        tags,
        price,
        city,
        neighborhood,
        attributes,
      }),
    [
      entityId,
      storeId,
      niche,
      categoryName,
      title,
      description,
      summary,
      tags,
      price,
      city,
      neighborhood,
      attributes,
    ],
  )

  const [openedSourceVersion, setOpenedSourceVersion] = React.useState<string>(
    structuredContext.sourceFingerprint,
  )
  const [originalSnapshot, setOriginalSnapshot] =
    React.useState<CopilotWorkingDraft>(structuredContext.currentDraft)

  const [workingDraft, setWorkingDraft] = React.useState<CopilotWorkingDraft>(
    structuredContext.currentDraft,
  )
  const [variants, setVariants] = React.useState<CopilotVariant[]>([])
  const [activeTab, setActiveTab] = React.useState<
    'working' | 'version1' | 'version2' | 'version3'
  >('working')

  const [scope, setScope] = React.useState<CopilotScope>(initialScope)
  const [tone, setTone] = React.useState<CopilotTone>(
    structuredContext.nicheRecommendedTone,
  )
  const [length, setLength] = React.useState<CopilotLength>('medium')
  const [goal, setGoal] = React.useState<CopilotGoal>('conversion')
  const [controlsExpanded, setControlsExpanded] = React.useState(false)
  const [showDiffComparison, setShowDiffComparison] = React.useState(false)

  const [userInstruction, setUserInstruction] = React.useState('')
  const [newTagInput, setNewTagInput] = React.useState('')

  const [selectionRange, setSelectionRange] = React.useState<{
    start: number
    end: number
    selectedText: string
  } | null>(null)

  const [history, setHistory] = React.useState<CopilotHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1)

  const [selectedFieldsToApply, setSelectedFieldsToApply] = React.useState<
    Record<EditorialFieldKey, boolean>
  >({
    title: true,
    description: true,
    summary: true,
    tags: true,
  })

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [statusPhase, setStatusPhase] = React.useState<string>('Pronto')
  const [changeExplanations, setChangeExplanations] = React.useState<string[]>(
    [],
  )
  const [warnings, setWarnings] = React.useState<string[]>([])

  const latestRequestIdRef = React.useRef(0)
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    if (open) {
      const initialDraft = structuredContext.currentDraft
      setOriginalSnapshot(initialDraft)
      setWorkingDraft(initialDraft)
      setOpenedSourceVersion(structuredContext.sourceFingerprint)
      setScope(initialScope)
      setTone(structuredContext.nicheRecommendedTone)
      setSelectionRange(null)
      setWarnings([])
      setChangeExplanations([])
      setHistory([
        {
          id: 'init',
          timestamp: Date.now(),
          label: 'Original do formulário',
          operation: 'improve',
          scope: 'all_editorial_fields',
          draft: initialDraft,
        },
      ])
      setHistoryIndex(0)

      if (initialScope === 'title') {
        setSelectedFieldsToApply({
          title: true,
          description: false,
          summary: false,
          tags: false,
        })
      } else if (initialScope === 'description') {
        setSelectedFieldsToApply({
          title: false,
          description: true,
          summary: false,
          tags: false,
        })
      } else if (initialScope === 'tags') {
        setSelectedFieldsToApply({
          title: false,
          description: false,
          summary: false,
          tags: true,
        })
      } else if (initialScope === 'summary') {
        setSelectedFieldsToApply({
          title: false,
          description: false,
          summary: true,
          tags: false,
        })
      } else {
        setSelectedFieldsToApply({
          title: true,
          description: true,
          summary: true,
          tags: true,
        })
      }
    }
  }, [open, initialScope])

  React.useEffect(() => {
    const el = descriptionTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const nextHeight = Math.max(180, Math.min(el.scrollHeight, 560))
    el.style.height = `${nextHeight}px`
  }, [workingDraft.description, open, activeTab])

  const currentExternalFingerprint = computeSourceFingerprint({
    title,
    description,
    summary,
    tags,
  })
  const hasExternalConflict =
    open && currentExternalFingerprint !== openedSourceVersion

  const liveValidation = React.useMemo(
    () =>
      validateCopilotOutputFacts({
        originalDraft: originalSnapshot,
        suggestedDraft: workingDraft,
        lockedFacts: structuredContext.lockedFacts,
        niche: structuredContext.niche,
        scope,
      }),
    [originalSnapshot, workingDraft, structuredContext, scope],
  )

  const qualityHints = React.useMemo(
    () => computeEditorialQualityHints(workingDraft, structuredContext),
    [workingDraft, structuredContext],
  )

  const pushHistorySnapshot = React.useCallback(
    (
      nextDraft: CopilotWorkingDraft,
      label: string,
      op: CopilotOperation,
      targetScope: CopilotScope,
    ) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1)
        const nextEntry: CopilotHistoryEntry = {
          id: `hist_${Date.now()}_${sliced.length}`,
          timestamp: Date.now(),
          label,
          operation: op,
          scope: targetScope,
          draft: nextDraft,
        }
        return [...sliced, nextEntry]
      })
      setHistoryIndex((prev) => prev + 1)
    },
    [historyIndex],
  )

  const handleUndo = () => {
    if (historyIndex <= 0) return
    const prevIdx = historyIndex - 1
    const entry = history[prevIdx]
    if (entry) {
      setHistoryIndex(prevIdx)
      setWorkingDraft(entry.draft)
      setActiveTab('working')
    }
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    const nextIdx = historyIndex + 1
    const entry = history[nextIdx]
    if (entry) {
      setHistoryIndex(nextIdx)
      setWorkingDraft(entry.draft)
      setActiveTab('working')
    }
  }

  const handleRestoreOriginal = () => {
    setWorkingDraft(originalSnapshot)
    setActiveTab('working')
    setWarnings([])
    setChangeExplanations(['Texto restaurado para a versão original do anúncio.'])
    pushHistorySnapshot(
      originalSnapshot,
      'Restaurado ao original',
      'improve',
      'all_editorial_fields',
    )
  }

  const handleCancelGeneration = () => {
    latestRequestIdRef.current += 1
    setIsGenerating(false)
    setStatusPhase('Cancelado pelo usuário')
  }

  const executeCopilotGeneration = async (params: {
    operation: CopilotOperation
    targetScope?: CopilotScope
    targetTone?: CopilotTone
    customPrompt?: string
    useSelection?: boolean
  }) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    const effectiveScope: CopilotScope = params.useSelection
      ? 'selection'
      : params.targetScope || scope
    const effectiveTone: CopilotTone = params.targetTone || tone
    const instructionText =
      params.customPrompt !== undefined ? params.customPrompt : userInstruction

    setIsGenerating(true)
    setStatusPhase('Lendo contexto do anúncio...')

    const phaseTimer = setTimeout(() => {
      if (latestRequestIdRef.current === requestId) {
        setStatusPhase('Reescrevendo e validando fatos...')
      }
    }, 450)

    try {
      const response = await refineClassifiedWithAI({
        data: {
          entityId,
          storeId,
          niche: structuredContext.niche,
          title: workingDraft.title || originalSnapshot.title,
          description: workingDraft.description || originalSnapshot.description,
          summary: workingDraft.summary || originalSnapshot.summary,
          tags: workingDraft.tags.length
            ? workingDraft.tags
            : originalSnapshot.tags,
          attributes: {
            ...attributes,
            city,
            neighborhood,
            price,
          },
          scope: effectiveScope,
          operation: params.operation,
          tone: effectiveTone,
          length,
          goal,
          userInstruction: instructionText,
          selectedText:
            effectiveScope === 'selection' && selectionRange
              ? selectionRange.selectedText
              : '',
          selectionRange:
            effectiveScope === 'selection' && selectionRange
              ? { start: selectionRange.start, end: selectionRange.end }
              : undefined,
          sourceVersion: openedSourceVersion,
        },
      })

      clearTimeout(phaseTimer)

      if (latestRequestIdRef.current !== requestId) {
        return
      }

      if (response.blockedFieldAttempt && response.blockedFieldReason) {
        setWarnings([response.blockedFieldReason])
        setStatusPhase('Bloqueado por proteção de campo')
        setIsGenerating(false)
        toast.warning(response.blockedFieldReason)
        return
      }

      if (
        effectiveScope === 'selection' &&
        selectionRange &&
        response.selectionReplacement
      ) {
        const replaced = applySelectionReplacement(
          workingDraft.description,
          selectionRange,
          response.selectionReplacement,
        )
        const nextDraft: CopilotWorkingDraft = {
          ...workingDraft,
          description: replaced.updatedText,
        }
        setWorkingDraft(nextDraft)
        setSelectionRange(null)
        setChangeExplanations([
          `Trecho selecionado reescrito (${params.operation}) preservando o restante da descrição.`,
        ])
        setWarnings(response.warnings || [])
        pushHistorySnapshot(
          nextDraft,
          `Trecho refinado (${params.operation})`,
          params.operation,
          'selection',
        )
        setStatusPhase('Trecho atualizado')
        setIsGenerating(false)
        return
      }

      const nextVariants = Array.isArray(response.variants)
        ? response.variants
        : []
      setVariants(nextVariants)

      const primarySuggestion: CopilotWorkingDraft = {
        title:
          effectiveScope === 'description' ||
          effectiveScope === 'tags' ||
          effectiveScope === 'summary'
            ? workingDraft.title
            : response.version1?.title || workingDraft.title,
        description:
          effectiveScope === 'title' ||
          effectiveScope === 'tags' ||
          effectiveScope === 'summary'
            ? workingDraft.description
            : response.version1?.description || workingDraft.description,
        summary:
          effectiveScope === 'title' ||
          effectiveScope === 'description' ||
          effectiveScope === 'tags'
            ? workingDraft.summary
            : response.version1?.summary || workingDraft.summary,
        tags:
          effectiveScope === 'title' ||
          effectiveScope === 'description' ||
          effectiveScope === 'summary'
            ? workingDraft.tags
            : normalizeTagList(
                response.suggestedTags?.length
                  ? response.suggestedTags
                  : response.version1?.tags || workingDraft.tags,
              ),
      }

      setWorkingDraft(primarySuggestion)
      setActiveTab('working')
      setChangeExplanations(
        Array.isArray(response.changeExplanations)
          ? response.changeExplanations
          : ['Conteúdo refinado com base nos dados factuais do anúncio.'],
      )
      setWarnings(Array.isArray(response.warnings) ? response.warnings : [])

      pushHistorySnapshot(
        primarySuggestion,
        `Refinamento: ${params.operation}`,
        params.operation,
        effectiveScope,
      )

      if (params.customPrompt) {
        setUserInstruction('')
      }
      setStatusPhase('Sugestão pronta para revisão')
    } catch (err: unknown) {
      clearTimeout(phaseTimer)
      if (latestRequestIdRef.current !== requestId) return
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o refinamento.'
      toast.error(msg)
      setStatusPhase('Erro ao processar')
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsGenerating(false)
      }
    }
  }

  const handleSelectVariantTab = (
    tabId: 'working' | 'version1' | 'version2' | 'version3',
  ) => {
    setActiveTab(tabId)
    if (tabId === 'working') return
    const found = variants.find((v) => v.id === tabId)
    if (found) {
      const nextDraft: CopilotWorkingDraft = {
        title: found.title,
        description: found.description,
        summary: found.summary,
        tags: normalizeTagList(found.tags),
      }
      setWorkingDraft(nextDraft)
      setChangeExplanations(found.changeExplanations || [])
      pushHistorySnapshot(nextDraft, found.label, 'rewrite', scope)
    }
  }

  const handleDescriptionSelect = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
  ) => {
    const target = e.currentTarget
    const start = target.selectionStart ?? 0
    const end = target.selectionEnd ?? 0
    if (end - start >= 8) {
      const sub = target.value.slice(start, end)
      setSelectionRange({
        start,
        end,
        selectedText: sub,
      })
    } else {
      setSelectionRange(null)
    }
  }

  const handleAddTag = () => {
    if (!newTagInput.trim()) return
    const nextTags = normalizeTagList([...workingDraft.tags, newTagInput])
    setWorkingDraft((prev) => ({ ...prev, tags: nextTags }))
    setNewTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setWorkingDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  const handleApplyFieldOnly = (field: EditorialFieldKey) => {
    const { patchedDraft, appliedFields } = buildSelectivePatch({
      originalDraft: {
        title,
        description,
        summary,
        tags: normalizeTagList(tags),
      },
      workingDraft,
      selectedFields: {
        title: field === 'title',
        description: field === 'description',
        summary: field === 'summary',
        tags: field === 'tags',
      },
    })

    if (appliedFields.length === 0) {
      toast.info('O campo já está idêntico ao formulário atual.')
      return
    }

    onApplyDraft(patchedDraft, appliedFields)
    setOriginalSnapshot((prev) => ({
      ...prev,
      [field]: patchedDraft[field],
    }))
    toast.success(`Campo "${field}" aplicado ao anúncio.`)
  }

  const handleApplySelected = () => {
    const { patchedDraft, appliedFields } = buildSelectivePatch({
      originalDraft: {
        title,
        description,
        summary,
        tags: normalizeTagList(tags),
      },
      workingDraft,
      selectedFields: selectedFieldsToApply,
    })

    if (appliedFields.length === 0) {
      onApplyDraft(workingDraft, ['title', 'description', 'summary', 'tags'])
      onOpenChange(false)
      return
    }

    onApplyDraft(patchedDraft, appliedFields)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isCompact ? 'bottom' : 'right'}
        size="xl"
        windowVariant={isCompact ? 'compact' : 'expanded'}
        className={
          isCompact
            ? 'flex h-dvh max-h-dvh w-full flex-col rounded-none border-0 p-0'
            : 'flex h-dvh max-h-dvh w-full max-w-2xl flex-col p-0'
        }
      >
        {/* 1. CABEÇALHO FIXO CONTEXTUAL */}
        <SheetHeader className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                  Copilot de Conteúdo
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Melhorando anúncio de {structuredContext.nicheLabel}
                </SheetDescription>
              </div>
            </div>

            {/* Controles de Histórico (Undo / Redo / Restaurar) */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0 || isGenerating}
                title="Desfazer alteração anterior"
                aria-label="Desfazer alteração anterior"
                className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1 || isGenerating}
                title="Refazer alteração"
                aria-label="Refazer alteração"
                className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Redo2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRestoreOriginal}
                disabled={isGenerating}
                title="Restaurar texto original"
                className="h-11 min-h-11 gap-1 px-3 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">Original</span>
              </Button>
            </div>
          </div>

          {/* Barra de Status Viva (aria-live) & Fact Lock */}
          <div
            aria-live="polite"
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2 text-foreground">
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none motion-reduce:transition-none" />
              ) : (
                <ShieldCheck className="size-4 text-primary" />
              )}
              <span className="font-medium">{statusPhase}</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {structuredContext.lockedFacts.length} fatos protegidos
              </Badge>
              <button
                type="button"
                onClick={() => setShowDiffComparison((prev) => !prev)}
                className="inline-flex h-11 min-h-11 items-center gap-1 rounded-md px-3 text-xs font-semibold text-primary transition-colors motion-reduce:transition-none hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Eye className="size-4" />
                {showDiffComparison ? 'Ocultar comparação' : 'Comparar original'}
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* 2. CORPO EDITORIAL COM SCROLL ÚNICO PRINCIPAL */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Alerta de Conflito se o formulário mudou fora do Copilot */}
          {hasExternalConflict && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/60 p-3 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-1 size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">
                    O anúncio foi alterado no formulário principal
                  </p>
                  <p className="text-muted-foreground">
                    Você pode sincronizar o rascunho atual antes de aplicar.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOriginalSnapshot(structuredContext.currentDraft)
                  setWorkingDraft(structuredContext.currentDraft)
                  setOpenedSourceVersion(structuredContext.sourceFingerprint)
                }}
                className="h-11 min-h-11 shrink-0 text-xs"
              >
                Recarregar
              </Button>
            </div>
          )}

          {/* Ações Rápidas (1 Clique) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ações Rápidas
              </span>
              <button
                type="button"
                onClick={() => setControlsExpanded((prev) => !prev)}
                className="inline-flex h-11 min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-foreground transition-colors motion-reduce:transition-none hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <SlidersHorizontal className="size-4 text-primary" />
                Controles de Escrita
                {controlsExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {QUICK_OPERATIONS.map((item) => (
                <button
                  key={item.operation + item.label}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    if (item.tone) setTone(item.tone)
                    void executeCopilotGeneration({
                      operation: item.operation,
                      targetTone: item.tone,
                      targetScope:
                        item.operation === 'generate_tags' ? 'tags' : scope,
                    })
                  }}
                  className="inline-flex h-11 min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-foreground transition-colors motion-reduce:transition-none hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Wand2 className="size-4 text-primary" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Progressive Disclosure: Controles de Tom, Tamanho, Objetivo e Escopo */}
            {controlsExpanded && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Escopo da Operação
                  </Label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as CopilotScope)}
                    className="h-11 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Tom de Voz
                  </Label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as CopilotTone)}
                    className="h-11 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {TONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Extensão do Texto
                  </Label>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLength(opt.value)}
                        className={`h-11 min-h-11 rounded-lg border text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          length === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Objetivo Editorial
                  </Label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as CopilotGoal)}
                    className="h-11 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {GOAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Régua de Variantes (Sem 2 colunas estreitas lado a lado) */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alternativas Geradas
              </span>
              <div
                role="tablist"
                aria-label="Variantes de texto do Copilot"
                className="flex flex-wrap gap-2 pb-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'working'}
                  onClick={() => handleSelectVariantTab('working')}
                  className={`h-11 min-h-11 shrink-0 rounded-lg border px-4 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    activeTab === 'working'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Rascunho Editável
                </button>
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === v.id}
                    onClick={() => handleSelectVariantTab(v.id)}
                    className={`h-11 min-h-11 shrink-0 rounded-lg border px-4 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      activeTab === v.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumo de Mudanças ("O que mudou?") e Avisos do Fact Lock */}
          {(changeExplanations.length > 0 ||
            warnings.length > 0 ||
            !liveValidation.lockedFactsPreserved) && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              {changeExplanations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">
                    O que mudou nesta versão:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {changeExplanations.map((exp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <span className="break-words text-wrap leading-relaxed">
                          {exp}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(warnings.length > 0 ||
                liveValidation.warnings.length > 0) && (
                <div className="space-y-1 border-t border-border pt-2">
                  <p className="text-xs font-bold text-foreground">
                    Verificação de Fatos (Fact Lock):
                  </p>
                  {Array.from(
                    new Set([...warnings, ...liveValidation.warnings]),
                  ).map((warn, idx) => (
                    <p
                      key={idx}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <AlertTriangle className="mt-1 size-4 shrink-0 text-primary" />
                      <span className="break-words text-wrap leading-relaxed">
                        {warn}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. EDITOR DE TRABALHO (WORKING DRAFT) — TÍTULO */}
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="copilot-working-title"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedFieldsToApply.title}
                  onChange={(e) =>
                    setSelectedFieldsToApply((prev) => ({
                      ...prev,
                      title: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                Título do Anúncio
                <span className="font-normal text-muted-foreground">
                  ({workingDraft.title.length}/90)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() =>
                    void executeCopilotGeneration({
                      operation: 'improve',
                      targetScope: 'title',
                    })
                  }
                  className="h-11 min-h-11 px-3 text-xs font-semibold text-primary"
                >
                  Refinar título
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyFieldOnly('title')}
                  className="h-11 min-h-11 px-3 text-xs font-semibold"
                >
                  Aplicar título
                </Button>
              </div>
            </div>

            {showDiffComparison &&
              originalSnapshot.title.trim() !== workingDraft.title.trim() && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Original:{' '}
                  </span>
                  <span className="text-foreground break-words text-wrap">
                    {originalSnapshot.title || 'Vazio'}
                  </span>
                </div>
              )}

            <Input
              id="copilot-working-title"
              value={workingDraft.title}
              onChange={(e) =>
                setWorkingDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Título claro e específico do anúncio"
              className="h-11 min-h-11 text-sm font-semibold text-foreground"
            />
          </div>

          {/* 4. EDITOR DE TRABALHO — DESCRIÇÃO + ESCOPO DE TRECHO SELECIONADO */}
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="copilot-working-description"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedFieldsToApply.description}
                  onChange={(e) =>
                    setSelectedFieldsToApply((prev) => ({
                      ...prev,
                      description: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                Descrição Editorial Completa
                <span className="font-normal text-muted-foreground">
                  ({workingDraft.description.length} caracteres)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() =>
                    void executeCopilotGeneration({
                      operation: 'improve',
                      targetScope: 'description',
                    })
                  }
                  className="h-11 min-h-11 px-3 text-xs font-semibold text-primary"
                >
                  Refinar descrição
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyFieldOnly('description')}
                  className="h-11 min-h-11 px-3 text-xs font-semibold"
                >
                  Aplicar descrição
                </Button>
              </div>
            </div>

            {/* Barra Contextual de Seleção de Trecho (Selection-Scoped AI) */}
            {selectionRange && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Scissors className="size-4 text-primary" />
                  <span>
                    Trecho selecionado ({selectionRange.selectedText.length}{' '}
                    caracteres)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    onClick={() =>
                      void executeCopilotGeneration({
                        operation: 'improve',
                        useSelection: true,
                      })
                    }
                    className="h-11 min-h-11 px-3 text-xs font-semibold"
                  >
                    Melhorar trecho
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    onClick={() =>
                      void executeCopilotGeneration({
                        operation: 'shorten',
                        useSelection: true,
                      })
                    }
                    className="h-11 min-h-11 px-3 text-xs font-semibold"
                  >
                    Encurtar trecho
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    onClick={() =>
                      void executeCopilotGeneration({
                        operation: 'expand',
                        useSelection: true,
                      })
                    }
                    className="h-11 min-h-11 px-3 text-xs font-semibold"
                  >
                    Expandir trecho
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    onClick={() =>
                      void executeCopilotGeneration({
                        operation: 'fix_grammar',
                        useSelection: true,
                      })
                    }
                    className="h-11 min-h-11 px-3 text-xs font-semibold"
                  >
                    Corrigir gramática
                  </Button>
                </div>
              </div>
            )}

            {showDiffComparison &&
              originalSnapshot.description.trim() !==
                workingDraft.description.trim() && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <p className="mb-1 font-semibold text-muted-foreground">
                    Descrição Original:
                  </p>
                  <p className="whitespace-pre-line break-words text-wrap leading-relaxed text-foreground">
                    {originalSnapshot.description || 'Vazia'}
                  </p>
                </div>
              )}

            <Textarea
              id="copilot-working-description"
              ref={descriptionTextareaRef}
              value={workingDraft.description}
              onChange={(e) =>
                setWorkingDraft((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              onSelect={handleDescriptionSelect}
              rows={8}
              placeholder="Escreva ou refine a descrição completa do anúncio. Selecione qualquer parágrafo para reescrever apenas o trecho desejado."
              className="w-full resize-y whitespace-pre-line break-words text-wrap text-sm leading-relaxed text-foreground"
            />
          </div>

          {/* 5. EDITOR DE TRABALHO — SÍNTESE / DESTAQUES RÁPIDOS */}
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="copilot-working-summary"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedFieldsToApply.summary}
                  onChange={(e) =>
                    setSelectedFieldsToApply((prev) => ({
                      ...prev,
                      summary: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <FileText className="size-4 text-primary" />
                Síntese de Destaques (1 por linha)
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyFieldOnly('summary')}
                className="h-11 min-h-11 px-3 text-xs font-semibold"
              >
                Aplicar síntese
              </Button>
            </div>

            <Textarea
              id="copilot-working-summary"
              value={workingDraft.summary}
              onChange={(e) =>
                setWorkingDraft((prev) => ({
                  ...prev,
                  summary: e.target.value,
                }))
              }
              rows={3}
              placeholder="Destaques curtos exibidos no topo da ficha do anúncio"
              className="w-full whitespace-pre-line break-words text-wrap text-xs leading-relaxed text-foreground"
            />
          </div>

          {/* 6. EDITOR DE TRABALHO — TAGS DE DESCOBERTA */}
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <input
                  type="checkbox"
                  checked={selectedFieldsToApply.tags}
                  onChange={(e) =>
                    setSelectedFieldsToApply((prev) => ({
                      ...prev,
                      tags: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <Tag className="size-4 text-primary" />
                Tags de Descoberta ({workingDraft.tags.length}/12)
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() =>
                    void executeCopilotGeneration({
                      operation: 'generate_tags',
                      targetScope: 'tags',
                    })
                  }
                  className="h-11 min-h-11 px-3 text-xs font-semibold text-primary"
                >
                  Sugerir tags
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyFieldOnly('tags')}
                  className="h-11 min-h-11 px-3 text-xs font-semibold"
                >
                  Aplicar tags
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {workingDraft.tags.map((tagItem) => (
                <span
                  key={tagItem}
                  className="inline-flex h-11 min-h-11 items-center gap-2 rounded-lg border border-border bg-muted/50 pl-3 pr-1 text-xs font-medium text-foreground"
                >
                  #{tagItem}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tagItem)}
                    aria-label={`Remover tag ${tagItem}`}
                    className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="Adicionar palavra-chave de busca..."
                className="h-11 min-h-11 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                className="h-11 min-h-11 shrink-0 gap-1 px-3 text-xs font-semibold"
              >
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* 7. DICAS DE QUALIDADE EDITORIAL E FATOS PROTEGIDOS */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diagnóstico de Conversão e Fatos Bloqueados
            </p>
            <div className="space-y-2">
              {qualityHints.map((hint) => (
                <div
                  key={hint.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <span className="break-words text-wrap leading-relaxed text-foreground">
                    {hint.message}
                  </span>
                  {hint.suggestedOperation && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isGenerating}
                      onClick={() =>
                        void executeCopilotGeneration({
                          operation: hint.suggestedOperation!,
                          targetScope: hint.suggestedScope || scope,
                        })
                      }
                      className="h-11 min-h-11 shrink-0 px-3 text-xs font-semibold text-primary"
                    >
                      Ajustar
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {structuredContext.lockedFacts.length > 0 && (
              <div className="pt-1">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Fatos preservados automaticamente (Fact Lock):
                </p>
                <div className="flex flex-wrap gap-2">
                  {structuredContext.lockedFacts.slice(0, 10).map((fact) => (
                    <Badge
                      key={`${fact.key}_${fact.value}`}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {fact.label}: {fact.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8. RODAPÉ STICKY COM COMPOSER DE IA E APLICAÇÃO SELETIVA */}
        <div className="shrink-0 space-y-3 border-t border-border bg-surface px-4 py-3 pb-safe sm:px-6">
          {/* AI Command Composer */}
          <div className="flex items-center gap-2">
            <Input
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (userInstruction.trim() && !isGenerating) {
                    void executeCopilotGeneration({
                      operation: 'custom_instruction',
                      customPrompt: userInstruction,
                    })
                  }
                }
              }}
              placeholder="Peça ao Copilot: ex. 'Destaque a localização', 'Deixe mais direto'..."
              disabled={isGenerating}
              className="h-11 min-h-11 flex-1 text-xs"
            />
            {isGenerating ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelGeneration}
                className="h-11 min-h-11 shrink-0 px-4 text-xs font-semibold"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={!userInstruction.trim() && isGenerating}
                onClick={() =>
                  void executeCopilotGeneration({
                    operation: userInstruction.trim()
                      ? 'custom_instruction'
                      : 'improve',
                    customPrompt: userInstruction,
                  })
                }
                className="h-11 min-h-11 shrink-0 gap-2 px-4 text-xs font-semibold"
              >
                <Send className="size-4" />
                Refinar
              </Button>
            )}
          </div>

          {/* Barra de Aplicação Seletiva Final */}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Descartar
            </Button>

            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleApplySelected}
              className="h-11 min-h-11 flex-1 gap-2 px-6 text-xs font-bold sm:flex-initial"
            >
              <Check className="size-4" />
              Aplicar Campos Selecionados
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
