import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AIChatShell } from "@/components/chat/ai-chat-shell";
import {
  listAiConversationThreads,
  createAiConversationThread,
} from "@/services/ai-conversations.functions";
import { listUserDurableAiTasks } from "@/services/ai-tasks-durability.functions";
import { listCopilotHierarchy } from "@/services/copilot-projects.functions";
import { getUserSession } from "@/services/auth.functions";
import { useCopilotSession } from "@/hooks/use-copilot-session";
import { ManusComputerDrawer } from "@/components/chat/manus-computer-drawer";
import { ManusTaskTelemetrySheet } from "@/components/chat/manus-task-telemetry-sheet";
import {
  CopilotBackgroundTasksDrawer,
  type BackgroundTaskItem,
} from "@/components/chat/copilot-background-tasks-drawer";
import { Button } from "@/components/ui/button";
import { Maximize2, ArrowLeft } from "lucide-react";

const DEFAULT_WORKSPACE_THREAD_ID = "00000000-0000-0000-0000-000000000002";

export const Route = createFileRoute("/workspace/copilot")({
  head: () => ({
    meta: [
      { title: "Assessor de Negócios | Painel Waesy" },
      {
        name: "description",
        content: "Assessor executivo para apoio à gestão comercial, pedidos, estoque, campanhas e finanças da loja.",
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
      const activeStoreId = session?.store_id || session?.memberships?.[0]?.store_id || null;
      const initialHierarchy = effectiveUserId
        ? await listCopilotHierarchy({
            data: activeStoreId ? { storeId: activeStoreId } : undefined,
          }).catch(() => ({ folders: [], projects: [] }))
        : { folders: [], projects: [] };

      // Se o usuário corporativo não possui threads de workspace, cria a primeira thread de projeto
      if (effectiveUserId && resolvedThreads.length === 0) {
        try {
          const newThread = await createAiConversationThread({
            data: {
              type: "project",
              title: "Gestão Operacional",
              storeId: activeStoreId || undefined,
              metadata: { workspaceContext: true, storeId: activeStoreId },
              workingMemory: {},
            },
          });
          if (newThread?.id) {
            resolvedThreads = [newThread as any];
          }
        } catch (e) {
          threadLoadError = true;
          console.warn("[workspace.copilot] Falha ao criar thread inicial:", e);
        }
      }

      return {
        session,
        activeStoreId,
        initialThreads: resolvedThreads,
        initialFolders: initialHierarchy.folders || [],
        initialProjects: initialHierarchy.projects || [],
        initialTasks: (initialTasks || []) as BackgroundTaskItem[],
        initialLoadError: threadLoadError && Boolean(effectiveUserId),
      };
    } catch {
      return {
        session: null,
        activeStoreId: null,
        initialThreads: [],
        initialFolders: [],
        initialProjects: [],
        initialTasks: [],
        initialLoadError: false,
      };
    }
  },
  component: WorkspaceCopilotPage,
});

function WorkspaceCopilotPage() {
  const {
    session,
    activeStoreId,
    initialThreads,
    initialFolders,
    initialProjects,
    initialTasks,
  } = Route.useLoaderData();
  const effectiveUserId = session?.id || session?.user?.id || null;
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [computerDrawerOpen, setComputerDrawerOpen] = useState(false);
  const [telemetrySheetOpen, setTelemetrySheetOpen] = useState(false);
  const [backgroundTasksOpen, setBackgroundTasksOpen] = useState(false);

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
    mode: "workspace",
    initialThreads: (initialThreads || []) as any,
    initialFolders: initialFolders || [],
    initialProjects: initialProjects || [],
    initialTasks: initialTasks || [],
    defaultFallbackThreadId: DEFAULT_WORKSPACE_THREAD_ID,
    defaultFallbackTitle: "Assessor de Negócios",
    senderName: "Copilot Operacional",
    welcomeText:
      "Olá! Sou o seu assessor executivo de negócios no Waesy. Posso acompanhar faturamento, estoque, gerar propostas comerciais, landing pages, mapas interativos e organizar projetos. O que deseja executar agora?",
    storeId: activeStoreId,
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
        title="Voltar ao Workspace"
        aria-label="Voltar ao Workspace"
      >
        <Link to="/workspace">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          if (typeof window !== "undefined") {
            const isEmbedded = new URLSearchParams(window.location.search).get("view") === "embedded";
            const url = new URL(window.location.href);
            if (isEmbedded) {
              url.searchParams.delete("view");
            } else {
              url.searchParams.set("view", "embedded");
            }
            window.location.href = url.toString();
          }
        }}
        className="size-11 min-h-11 min-w-11 rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Alternar modo Tela Cheia / Painel"
        aria-label="Alternar modo tela cheia"
      >
        <Maximize2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="size-full flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      <AIChatShell
        mode="workspace"
        threads={copilot.threads}
        activeThreadId={copilot.activeThreadId}
        messages={copilot.messages}
        mobileTitle="Copilot"
        mobileSubtitle="Workspace Waesy"
        mobileFallbackHref="/workspace"
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
        folders={copilot.folders}
        projects={copilot.projects}
        selectedFolderId={copilot.selectedFolderId}
        selectedProjectId={copilot.selectedProjectId}
        onSelectFolder={copilot.setSelectedFolderId}
        onSelectProject={copilot.setSelectedProjectId}
        onCreateFolder={copilot.handleCreateFolder}
        onCreateProject={copilot.handleCreateProject}
        onAssignThreadHierarchy={copilot.handleAssignThreadHierarchy}
        projectFiles={copilot.projectFiles}
        isLoadingProjectFiles={copilot.isLoadingProjectFiles}
        onUploadProjectFile={copilot.handleUploadProjectFile}
        onDeleteProjectFile={copilot.handleDeleteProjectFile}
        onUpdateProjectInstructions={copilot.handleUpdateProjectInstructions}
        sources={copilot.aggregatedSources}
        backgroundTasks={copilot.backgroundTasks}
        onCancelBackgroundTask={copilot.handleCancelBackgroundTask}
        onRefreshBackgroundTasks={copilot.refreshBackgroundTasks}
        quickToolMode={copilot.quickToolMode}
        onQuickToolModeChange={copilot.setQuickToolMode}
        onOpenComputer={() => setComputerDrawerOpen(true)}
        computerStepsCount={copilot.computerSteps.length}
        onOpenTelemetry={() => setTelemetrySheetOpen(true)}
        extraHeaderActions={extraHeaderActions}
        contextAccessLabel={activeStoreId ? "Workspace conectado" : "Acesso completo"}
        isSending={copilot.isSending}
        isStreaming={copilot.isSending}
        currentUserProfileId={effectiveUserId || undefined}
        className="h-full min-h-0 border-none rounded-none"
      />
      <ManusComputerDrawer
        open={computerDrawerOpen}
        onOpenChange={setComputerDrawerOpen}
        taskTitle={copilot.activeThread?.title || "Sessão Ativa"}
        steps={copilot.computerSteps}
      />
      <ManusTaskTelemetrySheet
        open={telemetrySheetOpen}
        onOpenChange={setTelemetrySheetOpen}
        {...copilot.telemetrySummary}
      />
      <CopilotBackgroundTasksDrawer
        open={backgroundTasksOpen}
        onOpenChange={setBackgroundTasksOpen}
        tasks={copilot.backgroundTasks}
        onCancelTask={copilot.handleCancelBackgroundTask}
        onRefresh={copilot.refreshBackgroundTasks}
      />
    </div>
  );
}
