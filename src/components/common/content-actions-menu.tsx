import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Share2, Copy, Edit3, Pause, Play, CheckCircle2, Clock, Archive, Trash2, Flag, Bookmark, ExternalLink, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ShareModal, triggerShare } from "@/components/common/share-modal";
import { ReportDialog } from "@/components/common/report-dialog";
import { toggleFavorite, getFavoriteStatus } from "@/services/favorites.functions";

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
}: ContentActionsMenuProps) {
 const queryClient = useQueryClient();
 const [shareModalOpen, setShareModalOpen] = useState(false);
 const [reportDialogOpen, setReportDialogOpen] = useState(false);
 const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
 const [isPerformingAction, setIsPerformingAction] = useState(false);

 // Status real no banco de dados de favoritos
 const backendEntityType = (entityType === "service" ? "product" : entityType) as "classified" | "post" | "event" | "product";
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

 const safeCanonicalUrl = canonicalUrl || (typeof window !== "undefined" ? window.location.pathname : "");
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
 if (!onStatusChange) return;
 setIsPerformingAction(true);
 try {
 await onStatusChange(newStatus);
 const labels: Record<string, string> = {
 active: "Conteúdo reativado e visível publicamente!",
 paused: "Conteúdo pausado e ocultado das buscas públicas.",
 reserved: "Marcado como reservado.",
 completed: "Marcado como concluído/vendido com sucesso!",
 archived: "Item arquivado no seu histórico.",
 };
 toast.success(labels[newStatus] || "Status atualizado com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar status do anúncio.");
 } finally {
 setIsPerformingAction(false);
 }
 };

 const handleConfirmDelete = async () => {
 if (!onDelete) return;
 setIsPerformingAction(true);
 try {
 await onDelete();
 toast.success("Conteúdo excluído com sucesso.");
 setDeleteAlertOpen(false);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao excluir conteúdo.");
 } finally {
 setIsPerformingAction(false);
 }
 };

 const handleReport = () => {
 if (onReport) {
 onReport();
 } else {
 setReportDialogOpen(true);
 }
 };

 // Label contextual de conclusão por nicho
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
 className="size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
 aria-label="Ações do conteúdo"
 >
 <MoreHorizontal className="size-4" />
 </Button>
 </DropdownMenuTrigger>

 <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 border-border">
 {/* Seção 1: Compartilhamento e Links */}
 <DropdownMenuItem
 onClick={handleCopyLink}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Copy className="size-3.5 text-muted-foreground" />
 <span>Copiar Link</span>
 </DropdownMenuItem>

 <DropdownMenuItem
 onClick={handleShareClick}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Share2 className="size-3.5 text-muted-foreground" />
 <span>Compartilhar</span>
 </DropdownMenuItem>

 {/* Seção 2: Controles do Proprietário */}
 {isOwner && (
 <>
 <DropdownMenuSeparator className="my-1" />
 <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
 Gerenciar Anúncio
 </DropdownMenuLabel>

 {onEdit && (
 <DropdownMenuItem
 onClick={onEdit}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Edit3 className="size-3.5 text-muted-foreground" />
 <span>Editar Publicação</span>
 </DropdownMenuItem>
 )}

 {/* Transições de Estado */}
 {onStatusChange && (
 <>
 {status === "active" && (
 <>
 <DropdownMenuItem
 onClick={() => handleStatusTransition("paused")}
 disabled={isPerformingAction}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Pause className="size-3.5 text-amber-500" />
 <span>Pausar Anúncio</span>
 </DropdownMenuItem>

 <DropdownMenuItem
 onClick={() => handleStatusTransition("reserved")}
 disabled={isPerformingAction}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Clock className="size-3.5 text-sky-500" />
 <span>Marcar como Reservado</span>
 </DropdownMenuItem>

 <DropdownMenuItem
 onClick={() => handleStatusTransition("completed")}
 disabled={isPerformingAction}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
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
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
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
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Play className="size-3.5 text-emerald-500" />
 <span>Remover Reserva</span>
 </DropdownMenuItem>

 <DropdownMenuItem
 onClick={() => handleStatusTransition("completed")}
 disabled={isPerformingAction}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <CheckCircle2 className="size-3.5 text-emerald-500" />
 <span>{getCompletedLabel()}</span>
 </DropdownMenuItem>
 </>
 )}

 <DropdownMenuItem
 onClick={() => handleStatusTransition("archived")}
 disabled={isPerformingAction}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
 >
 <Archive className="size-3.5 text-muted-foreground" />
 <span>Arquivar</span>
 </DropdownMenuItem>
 </>
 )}

 {/* Ação Destrutiva */}
 {onDelete && (
 <>
 <DropdownMenuSeparator className="my-1" />
 <DropdownMenuItem
 onClick={() => setDeleteAlertOpen(true)}
 className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
 >
 <Trash2 className="size-3.5 text-destructive" />
 <span>Excluir Anúncio</span>
 </DropdownMenuItem>
 </>
 )}
 </>
 )}

          {/* Seção 3: Salvar nos Favoritos (Disponível para todos os usuários) */}
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={handleToggleSave}
            className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2"
          >
            <Bookmark
              className={`size-3.5 ${isSaved ? "text-primary fill-primary" : "text-muted-foreground"}`}
            />
            <span>{isSaved ? "Remover dos Salvos" : "Salvar nos Favoritos"}</span>
          </DropdownMenuItem>

          {/* Seção 4: Denúncia (Visitantes apenas) */}
          {!isOwner && (
            <DropdownMenuItem
              onClick={handleReport}
              className="text-xs font-medium rounded-xl py-2 cursor-pointer gap-2 text-destructive/80 focus:bg-destructive/10 focus:text-destructive"
            >
              <Flag className="size-3.5" />
              <span>Denunciar Publicação</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
 </DropdownMenu>

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
 entityType={entityType}
 entityId={entityId}
 entityTitle={title}
 />

 {/* Alert Dialog de Exclusão com Explicação de Dependências */}
 <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
 <AlertDialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
 <AlertDialogHeader className="space-y-2">
 <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
 <Trash2 className="size-5" />
 </div>
 <AlertDialogTitle className="text-base font-bold text-foreground">
 Confirmar exclusão permanente?
 </AlertDialogTitle>
 <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
 Esta ação removerá o anúncio de todas as superfícies da comunidade. Se existirem
 propostas ativas ou contratos em andamento, o item será arquivado com segurança para
 preservar os registros legais.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter className="pt-2 gap-2">
 <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
 <AlertDialogAction
 onClick={handleConfirmDelete}
 disabled={isPerformingAction}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold gap-1.5"
 >
 {isPerformingAction ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
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
