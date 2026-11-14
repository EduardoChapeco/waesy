import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AIChatShell } from "@/components/chat/ai-chat-shell";
import {
  listAiConversationThreads,
  createAiConversationThread,
} from "@/services/ai-conversations.functions";
import { listUserDurableAiTasks } from "@/services/ai-tasks-durability.functions";
import { getUserSession } from "@/services/auth.functions";
import { useCopilotSession } from "@/hooks/use-copilot-session";
import { ManusComputerDrawer } from "@/components/chat/manus-computer-drawer";
import { ManusTaskTelemetrySheet } from "@/components/chat/manus-task-telemetry-sheet";
import {
  CopilotBackgroundTasksDrawer,
  type BackgroundTaskItem,
} from "@/components/chat/copilot-background-tasks-drawer";
import { Button } from "@/components/ui/button";
import { Share2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_GUEST_THREAD_ID = "00000000-0000-0000-0000-000000000001";

export const Route = createFileRoute("/_store/copilot")({
  head: () => ({
    meta: [
      { title: "Assessor Local | Waesy" },
      {
        name: "description",
        content:
          "Assessor executivo local para descobertas da cidade, planejamento de viagens, compras e criação de propostas comerciais.",
      },
    ],
  }),
  loader: async () => {
    try {
      let threadLoadError = false;
      const [session, threads, initialTasks] = await Promise.all([
        getUserSession().catch(() => null),
        listAiConversationThreads().catch(() => {
          threadLoadError = true;
          return [];
        }),
        listUserDurableAiTasks({ data: { status: "all", limit: 30 } }).catch(() => []),
      ]);

      let resolvedThreads = threads || [];
      const effectiveUserId = session?.id || session?.user?.id || null;

      // Se o usuário está logado e não possui nenhuma thread, cria a primeira thread oficial no Supabase
      if (effectiveUserId && resolvedThreads.length === 0) {
        try {
          const newThread = await createAiConversationThread({
            data: {
              type: "ai_assistant",
              title: "Assessor Local",
              metadata: {},
              workingMemory: {},
            },
          });
          if (newThread?.id) {
            resolvedThreads = [newThread as any];
          }
        } catch (e) {
          threadLoadError = true;
          console.warn("[_store.copilot] Falha ao criar thread inicial:", e);
        }
      }

      return {
        session,
        initialThreads: resolvedThreads,
        initialTasks: (initialTasks || []) as BackgroundTaskItem[],
        initialLoadError: threadLoadError && Boolean(effectiveUserId),
      };
    } catch {
      return { session: null, initialThreads: [], initialTasks: [], initialLoadError: false };
    }
  },
  component: CopilotPage,
});

function CopilotPage() {
  const { session, initialThreads, initialTasks } = Route.useLoaderData();
  const effectiveUserId = session?.id || session?.user?.id || null;
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isComputerOpen, setIsComputerOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isBackgroundTasksOpen, setIsBackgroundTasksOpen] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
      );
    }
  }, []);

  const copilot = useCopilotSession({
    mode: "concierge",
    initialThreads: (initialThreads || []) as any,
    initialTasks: initialTasks || [],
    defaultFallbackThreadId: DEFAULT_GUEST_THREAD_ID,
    defaultFallbackTitle: "Assessor Local",
    senderName: "Waesy Copilot",
    welcomeText:
      "Olá! Sou o seu assessor consultivo da nossa região no Waesy. Posso te ajudar a descobrir estabelecimentos, planejar viagens, encontrar ofertas ou criar documentos e sites.",
    userId: effectiveUserId,
    isAuthenticated: Boolean(effectiveUserId),
    userCoords,
    navigate: ({ to, search }) => navigate({ to: to as any, search: search as any }),
  });

  const extraHeaderActions = (
    <div className="flex items-center gap-1">
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Voltar ao Início"
        aria-label="Voltar ao Início"
      >
        <Link to="/">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link da sessão copiado.");
          }
        }}
        className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Compartilhar sessão"
        aria-label="Compartilhar sessão"
      >
        <Share2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="h-dvh w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <AIChatShell
        mode="concierge"
        threads={copilot.threads}
        activeThreadId={copilot.activeThreadId}
        messages={copilot.messages}
        mobileTitle="Copilot"
        mobileSubtitle="Assistente Local"
        mobileFallbackHref="/"
        onSelectThread={copilot.handleSelectThread}
        onSendMessage={copilot.handleSendMessage}
        onUploadAttachment={copilot.handleUploadAttachment}
        onRetryMessage={copilot.handleRetryMessage}
        onCancelActiveRun={copilot.handleCancelActiveRun}
        onCreateThread={copilot.handleCreateThread}
        onRenameThread={copilot.handleRenameThread}
        onDeleteThread={copilot.handleDeleteThread}
        onTogglePinThread={copilot.handleTogglePinThread}
        onToggleArchiveThread={copilot.handleToggleArchiveThread}
        onStructuredAction={copilot.handleStructuredAction}
        sources={copilot.aggregatedSources}
        backgroundTasks={copilot.backgroundTasks}
        onCancelBackgroundTask={copilot.handleCancelBackgroundTask}
        onRefreshBackgroundTasks={copilot.refreshBackgroundTasks}
        quickToolMode={copilot.quickToolMode}
        onQuickToolModeChange={copilot.setQuickToolMode}
        onOpenComputer={() => setIsComputerOpen(true)}
        computerStepsCount={copilot.computerSteps.length}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        extraHeaderActions={extraHeaderActions}
        contextAccessLabel="Concierge Local"
        isSending={copilot.isSending}
        isStreaming={copilot.isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full min-h-0 border-none rounded-none"
      />

      <ManusComputerDrawer
        open={isComputerOpen}
        onOpenChange={setIsComputerOpen}
        taskTitle={copilot.activeThread?.title || "Sessão Ativa"}
        steps={copilot.computerSteps}
      />

      <ManusTaskTelemetrySheet
        open={isTelemetryOpen}
        onOpenChange={setIsTelemetryOpen}
        {...copilot.telemetrySummary}
      />

      <CopilotBackgroundTasksDrawer
        open={isBackgroundTasksOpen}
        onOpenChange={setIsBackgroundTasksOpen}
        tasks={copilot.backgroundTasks}
        onCancelTask={copilot.handleCancelBackgroundTask}
        onRefresh={copilot.refreshBackgroundTasks}
      />
    </div>
  );
}
