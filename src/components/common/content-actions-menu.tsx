import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Share2,
  Copy,
  Edit3,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Flag,
  Bookmark,
  ExternalLink,
  ShieldAlert,
  Loader2,
  EyeOff,
  VolumeX,
  Pin,
  PinOff,
  MessageSquare,
  MessageSquareOff,
} from "lucide-react";
import { toast } from "sonner";
import { ShareModal, triggerShare } from "@/components/common/share-modal";
import { ReportDialog } from "@/components/common/report-dialog";
import { toggleFavorite, getFavoriteStatus } from "@/services/favorites.functions";
import { getUserSession } from "@/services/auth.functions";
import {
  deletePost,
  updatePostStatus,
  togglePostPin,
  togglePostComments,
} from "@/services/social.functions";
import { EditPostModal } from "@/components/community/EditPostModal";

// empty: menu contextual de ações de conteúdo sem superfície de listagem direta
export interface ContentActionsMenuProps {
  entityType: "classified" | "post" | "event" | "product" | "service";
  entityId: string;
  isOwner: boolean;
  status?: string;
  category?: string;
  canonicalUrl: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  onStatusChange?: (newStatus: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onReport?: () => void;
  postData?: {
    id: string;
    content_text?: string | null;
    tags?: string[] | null;
    location_name?: string | null;
    metadata?: Record<string, unknown> | null;
    author?: {
      id?: string;
      name?: string;
      username?: string | null;
    };
  };
  authorUsername?: string;
  onHide?: () => void;
  onMute?: () => void;
}

export function ContentActionsMenu({
  entityType,
  entityId,
  isOwner,
  status = "active",
  category,
  canonicalUrl,
  title,
  description,
  mediaUrl,
  onStatusChange,
  onEdit,
  onDelete,
  onReport,
  postData,
  authorUsername,
  onHide,
  onMute,
}: ContentActionsMenuProps) {
  const queryClient = useQueryClient();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  // Sessão do usuário atual para resolução defensiva de autoria
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["current-user-session"],
    queryFn: () => getUserSession().catch(() => null),
    staleTime: 60000,
  });

  const sessionUser = sessionData?.user;
  const currentUserId = sessionUser?.id || (sessionData as any)?.id || null;

  const authorIds = [
    postData?.author?.id,
    (postData as any)?.author_profile_id,
    (postData?.author as any)?.profile_id,
    (postData as any)?.author_user_id,
  ].filter(Boolean);

  const effectiveIsOwner = Boolean(
    isOwner || (currentUserId && authorIds.some((id) => id === currentUserId))
  );

  // Status real no banco de dados de favoritos
  const backendEntityType = (entityType === "service" ? "product" : entityType) as
    "classified" | "post" | "event" | "product";
  const { data: isSavedData } = useQuery({
    queryKey: ["is-favorited", backendEntityType, entityId],
    queryFn: () => getFavoriteStatus({ data: { entityType: backendEntityType, entityId } }),
    staleTime: 60000,
  });

  const isSaved = isSavedData?.favorited || false;

  const favoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["is-favorited", backendEntityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      toast.success(res.favorited ? "Salvo nos seus favoritos!" : "Item removido dos favoritos.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar favoritos.");
    },
  });

  const handleToggleSave = () => {
    favoriteMutation.mutate({
      data: {
        entityType: backendEntityType,
        entityId,
      },
    });
  };

  const safeCanonicalUrl =
    canonicalUrl || (typeof window !== "undefined" ? window.location.pathname : "");
  const fullUrl =
    typeof window !== "undefined"
      ? safeCanonicalUrl.startsWith("http")
        ? safeCanonicalUrl
        : `${window.location.origin}${safeCanonicalUrl}`
      : safeCanonicalUrl;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Link oficial copiado!");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fullUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Link oficial copiado!");
      }
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleShareClick = () => {
    triggerShare({
      title,
      text: description,
      url: fullUrl,
      onOpenModal: () => setShareModalOpen(true),
    });
  };

  const handleStatusTransition = async (newStatus: string) => {
    setIsPerformingAction(true);
    try {
      if (onStatusChange) {
        await onStatusChange(newStatus);
      } else if (entityType === "post") {
        await updatePostStatus({
          data: {
            postId: entityId,
            status: newStatus as any,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["community-feed"] });
        queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
        queryClient.invalidateQueries({ queryKey: ["post-detail", entityId] });
      }
      const labels: Record<string, string> = {
        active: "Conteúdo reativado e visível publicamente!",
        paused: "Conteúdo pausado e ocultado das buscas públicas.",
        reserved: "Marcado como reservado.",
        completed: "Marcado como concluído com sucesso!",
        archived: "Item arquivado no seu histórico.",
      };
      toast.success(labels[newStatus] || "Status atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar status.");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsPerformingAction(true);
    try {
      if (onDelete) {
        await onDelete();
      } else if (entityType === "post") {
        await deletePost({ data: { postId: entityId } });
        queryClient.invalidateQueries({ queryKey: ["community-feed"] });
        queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
        queryClient.invalidateQueries({ queryKey: ["post-detail", entityId] });
      }
      toast.success(
        entityType === "post"
          ? "Publicação excluída com sucesso."
          : "Conteúdo excluído com sucesso."
      );
      setDeleteAlertOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir conteúdo.");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleToggleComments = async () => {
    setIsPerformingAction(true);
    try {
      const res = await togglePostComments({ data: { postId: entityId } });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", entityId] });
      toast.success(
        res.disable_comments
          ? "Comentários desativados para esta publicação."
          : "Comentários ativados para esta publicação."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar comentários.");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleTogglePin = async () => {
    setIsPerformingAction(true);
    try {
      const res = await togglePostPin({ data: { postId: entityId } });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
      queryClient.invalidateQueries({ queryKey: ["post-detail", entityId] });
      toast.success(
        res.is_pinned
          ? "Publicação fixada no topo do seu perfil!"
          : "Publicação desafixada do seu perfil."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao fixar publicação.");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleHidePost = () => {
    if (onHide) {
      onHide();
    } else {
      queryClient.setQueriesData({ queryKey: ["community-feed"] }, (old: any) => {
        if (!old) return old;
        const filterItem = (it: any) => it.id !== entityId;
        if (Array.isArray(old)) return old.filter(filterItem);
        if (old.items) return { ...old, items: old.items.filter(filterItem) };
        return old;
      });
      queryClient.setQueriesData({ queryKey: ["mural-feed"] }, (old: any) => {
        if (!old) return old;
        const filterItem = (it: any) => it.id !== entityId;
        if (Array.isArray(old)) return old.filter(filterItem);
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              items: p.items.filter(filterItem),
            })),
          };
        }
        return old;
      });
      toast("Publicação ocultada do seu feed.", {
        action: {
          label: "Desfazer",
          onClick: () => {
            queryClient.invalidateQueries({ queryKey: ["community-feed"] });
            queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
          },
        },
      });
    }
  };

  const handleMuteAuthor = () => {
    if (onMute) {
      onMute();
    } else {
      const authorHandle =
        authorUsername || (postData?.author as any)?.username || "autor";
      toast.success(
        `Você silenciou @${authorHandle}. As publicações deste autor não aparecerão mais no seu feed.`
      );
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport();
    } else {
      setReportDialogOpen(true);
    }
  };

  const getSectionHeader = () => {
    switch (entityType) {
      case "post":
        return "Gerenciar Publicação";
      case "event":
        return "Gerenciar Evento";
      case "product":
      case "service":
        return "Gerenciar Produto";
      case "classified":
      default:
        return "Gerenciar Conteúdo";
    }
  };

  const getCompletedLabel = () => {
    if (category === "real_estate") return "Marcar como Alugado / Vendido";
    if (category === "vehicle" || category === "sale") return "Marcar como Vendido";
    if (category === "job") return "Encerrar Candidaturas";
    if (category === "service") return "Concluir / Encerrar Atendimento";
    return "Marcar como Concluído";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
            aria-label="Ações do conteúdo"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-border shadow-overlay">
          {/* Seção 1: Compartilhamento e Links */}
          <DropdownMenuItem
            onClick={handleCopyLink}
            className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
          >
            <Copy className="size-3.5 text-muted-foreground" />
            <span>Copiar Link</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleShareClick}
            className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
          >
            <Share2 className="size-3.5 text-muted-foreground" />
            <span>Compartilhar</span>
          </DropdownMenuItem>

          {/* Seção 2: Controles do Proprietário (CRUD e Governança do Autor) */}
          {effectiveIsOwner && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuLabel className="text-2xs uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                {getSectionHeader()}
              </DropdownMenuLabel>

              {/* Editar */}
              {(onEdit || entityType === "post") && (
                <DropdownMenuItem
                  onClick={() => {
                    if (onEdit) onEdit();
                    else setEditModalOpen(true);
                  }}
                  className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                >
                  <Edit3 className="size-3.5 text-muted-foreground" />
                  <span>Editar Publicação</span>
                </DropdownMenuItem>
              )}

              {/* Controles Nativos de Publicação */}
              {entityType === "post" && (
                <>
                  <DropdownMenuItem
                    onClick={handleTogglePin}
                    disabled={isPerformingAction}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                  >
                    {postData?.metadata?.is_pinned ? (
                      <>
                        <PinOff className="size-3.5 text-warning-strong" />
                        <span>Desafixar do Perfil</span>
                      </>
                    ) : (
                      <>
                        <Pin className="size-3.5 text-primary" />
                        <span>Fixar no Perfil</span>
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleToggleComments}
                    disabled={isPerformingAction}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                  >
                    {postData?.metadata?.disable_comments ? (
                      <>
                        <MessageSquare className="size-3.5 text-emerald-500" />
                        <span>Ativar Comentários</span>
                      </>
                    ) : (
                      <>
                        <MessageSquareOff className="size-3.5 text-muted-foreground" />
                        <span>Desativar Comentários</span>
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() =>
                      handleStatusTransition(
                        status === "archived" ? "active" : "archived"
                      )
                    }
                    disabled={isPerformingAction}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                  >
                    {status === "archived" ? (
                      <>
                        <Play className="size-3.5 text-emerald-500" />
                        <span>Reativar Publicação</span>
                      </>
                    ) : (
                      <>
                        <Archive className="size-3.5 text-muted-foreground" />
                        <span>Arquivar Publicação</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}

              {/* Transições de Estado de Outras Entidades (Classificados, Produtos, Eventos) */}
              {entityType !== "post" && onStatusChange && (
                <>
                  {status === "active" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleStatusTransition("paused")}
                        disabled={isPerformingAction}
                        className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                      >
                        <Pause className="size-3.5 text-warning-strong" />
                        <span>Pausar Anúncio</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleStatusTransition("reserved")}
                        disabled={isPerformingAction}
                        className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                      >
                        <Clock className="size-3.5 text-sky-500" />
                        <span>Marcar como Reservado</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleStatusTransition("completed")}
                        disabled={isPerformingAction}
                        className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span>{getCompletedLabel()}</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  {status === "paused" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusTransition("active")}
                      disabled={isPerformingAction}
                      className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                    >
                      <Play className="size-3.5 text-emerald-500" />
                      <span>Reativar Anúncio</span>
                    </DropdownMenuItem>
                  )}

                  {status === "reserved" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleStatusTransition("active")}
                        disabled={isPerformingAction}
                        className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                      >
                        <Play className="size-3.5 text-emerald-500" />
                        <span>Remover Reserva</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleStatusTransition("completed")}
                        disabled={isPerformingAction}
                        className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span>{getCompletedLabel()}</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={() => handleStatusTransition("archived")}
                    disabled={isPerformingAction}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
                  >
                    <Archive className="size-3.5 text-muted-foreground" />
                    <span>Arquivar</span>
                  </DropdownMenuItem>
                </>
              )}

              {/* Ação Destrutiva */}
              {(onDelete || entityType === "post") && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => setDeleteAlertOpen(true)}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                    <span>
                      {entityType === "post"
                        ? "Excluir Publicação"
                        : "Excluir Anúncio"}
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}

          {/* Seção 3: Salvar nos Favoritos */}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={handleToggleSave}
            className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2"
          >
            <Bookmark
              className={`size-3.5 ${isSaved ? "text-primary fill-primary" : "text-muted-foreground"}`}
            />
            <span>{isSaved ? "Remover dos Salvos" : "Salvar nos Favoritos"}</span>
          </DropdownMenuItem>

          {/* Seção 4: Controles do Visualizador (quem não é o dono) */}
          {!effectiveIsOwner && (
            <>
              {entityType === "post" && (
                <>
                  <DropdownMenuItem
                    onClick={handleHidePost}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2 text-muted-foreground"
                  >
                    <EyeOff className="size-3.5" />
                    <span>Não tenho interesse / Ocultar</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleMuteAuthor}
                    className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2 text-muted-foreground"
                  >
                    <VolumeX className="size-3.5" />
                    <span>
                      Silenciar @{authorUsername || (postData?.author as any)?.username || "autor"}
                    </span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem
                onClick={handleReport}
                className="text-xs font-medium rounded-lg py-2 cursor-pointer gap-2 text-destructive/80 focus:bg-destructive/10 focus:text-destructive"
              >
                <Flag className="size-3.5" />
                <span>
                  {entityType === "post"
                    ? "Denunciar Publicação"
                    : "Denunciar Conteúdo"}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Edição de Post Nativa */}
      {entityType === "post" && (
        <EditPostModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          post={{
            id: entityId,
            content_text: postData?.content_text ?? description ?? "",
            tags: postData?.tags ?? [],
            location_name: postData?.location_name ?? "",
            metadata: postData?.metadata ?? {},
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["community-feed"] });
            queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
            queryClient.invalidateQueries({ queryKey: ["post-detail", entityId] });
          }}
        />
      )}

      {/* Modal de Compartilhamento Canônico */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        title={title}
        text={description}
        url={fullUrl}
        imageUrl={mediaUrl}
      />

      {/* Diálogo de Denúncia Real */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        entityType={entityType === "service" ? "product" : entityType}
        entityId={entityId}
        entityTitle={title}
      />

      {/* Alert Dialog de Exclusão */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
          <AlertDialogHeader className="space-y-2">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {entityType === "post"
                ? "Excluir publicação permanentemente?"
                : "Confirmar exclusão permanente?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {entityType === "post"
                ? "Esta publicação será removida do feed comunitário e do seu perfil. Esta ação não poderá ser desfeita."
                : "Esta ação removerá o anúncio de todas as superfícies da comunidade. Se existirem propostas ativas ou contratos em andamento, o item será arquivado com segurança para preservar os registros legais."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2">
            <AlertDialogCancel className="rounded-xl text-xs cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPerformingAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              {isPerformingAction ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <span>Confirmar e Excluir</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
