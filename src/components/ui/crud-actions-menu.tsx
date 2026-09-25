import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MoreVertical,
  Edit3,
  Eye,
  Copy,
  Archive,
  Trash2,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface CustomActionItem {
  id?: string;
  label: string;
  icon?: React.ElementType;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "destructive" | "primary";
  disabled?: boolean;
  isExternal?: boolean;
}

export interface CrudActionsMenuProps {
  /** Nome amigável da entidade (ex: "Produto", "Matéria", "Serviço") */
  entityName?: string;
  /** Ação de Edição (callback ou URL de rota) */
  onEdit?: () => void;
  editUrl?: string;
  /** Ação de Visualização pública */
  onView?: () => void;
  viewUrl?: string;
  /** Ação de Duplicação */
  onDuplicate?: () => void;
  /** Ação de Alternância de Status (Ativar/Pausar/Publicar/Ocultar) */
  onToggleStatus?: () => void;
  statusLabel?: string;
  statusIcon?: React.ElementType;
  /** Ação de Arquivamento */
  onArchive?: () => void;
  archiveLabel?: string;
  archiveTitle?: string;
  archiveDescription?: string;
  /** Ação de Exclusão (com confirmação segura integrada) */
  onDelete?: () => void | Promise<void>;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  /** Ações customizadas adicionais no menu */
  customActions?: CustomActionItem[];
  /** Alinhamento do Dropdown */
  align?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
  triggerVariant?: string;
  triggerIcon?: React.ElementType;
  triggerAriaLabel?: string;
}

/**
 * CrudActionsMenu — Padronização Universal de Ações CRUD (Apple HIG / Paradigma Clean)
 * Agrupa todas as ações de gestão em um menu silencioso e refinado, eliminando
 * a poluição visual de múltiplos botões coloridos na tabela ou lista.
 */
export function CrudActionsMenu({
  entityName = "Item",
  onEdit,
  editUrl,
  onView,
  viewUrl,
  onDuplicate,
  onToggleStatus,
  statusLabel,
  statusIcon: StatusIcon,
  onArchive,
  archiveLabel,
  onDelete,
  deleteConfirmTitle,
  deleteConfirmDescription,
  customActions = [],
  align = "end",
  className,
  triggerClassName,
  triggerIcon: TriggerIcon = MoreVertical,
  triggerAriaLabel,
  deleteTitle,
  deleteDescription,
  triggerVariant,
}: CrudActionsMenuProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasPrimaryActions = Boolean(onEdit || editUrl || onView || viewUrl || onDuplicate);
  const hasCustomActions = customActions.length > 0;
  const hasStatusActions = Boolean(onToggleStatus || onArchive);
  const hasDestructiveAction = Boolean(onDelete);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={triggerAriaLabel || `Ações de ${entityName}`}
            className={cn(
              "size-9 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors",
              triggerClassName
            )}
          >
            <TriggerIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className={cn("w-52 p-1.5 rounded-2xl bg-card border border-border/60 shadow-2xs", className)}
        >
          {entityName && (
            <DropdownMenuLabel className="text-[11px] font-mono uppercase text-muted-foreground px-2 py-1 tracking-wider">
              {entityName}
            </DropdownMenuLabel>
          )}

          {/* 1. Ações Principais: Editar & Ver */}
          {editUrl ? (
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium">
              <Link to={editUrl as never}>
                <Edit3 className="size-3.5 mr-2 text-primary" />
                Editar {entityName}
              </Link>
            </DropdownMenuItem>
          ) : onEdit ? (
            <DropdownMenuItem onClick={onEdit} className="rounded-xl cursor-pointer text-xs font-medium">
              <Edit3 className="size-3.5 mr-2 text-primary" />
              Editar {entityName}
            </DropdownMenuItem>
          ) : null}

          {viewUrl ? (
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium">
              <Link to={viewUrl as never} target="_blank" rel="noopener noreferrer">
                <Eye className="size-3.5 mr-2 text-muted-foreground" />
                Ver na Vitrine
              </Link>
            </DropdownMenuItem>
          ) : onView ? (
            <DropdownMenuItem onClick={onView} className="rounded-xl cursor-pointer text-xs font-medium">
              <Eye className="size-3.5 mr-2 text-muted-foreground" />
              Ver na Vitrine
            </DropdownMenuItem>
          ) : null}

          {onDuplicate && (
            <DropdownMenuItem onClick={onDuplicate} className="rounded-xl cursor-pointer text-xs font-medium">
              <Copy className="size-3.5 mr-2 text-muted-foreground" />
              Duplicar {entityName}
            </DropdownMenuItem>
          )}

          {/* 2. Ações Customizadas */}
          {hasCustomActions && (
            <>
              {hasPrimaryActions && <DropdownMenuSeparator className="my-1 bg-border/50" />}
              {customActions.map((action, idx) => {
                const IconComponent = action.icon;
                if (action.href) {
                  return (
                    <DropdownMenuItem
                      key={action.id || idx}
                      asChild
                      disabled={action.disabled}
                      className={cn(
                        "rounded-xl cursor-pointer text-xs font-medium",
                        action.variant === "destructive" && "text-destructive hover:bg-destructive/10"
                      )}
                    >
                      <Link
                        to={action.href as never}
                        target={action.isExternal ? "_blank" : undefined}
                      >
                        {IconComponent && <IconComponent className="size-3.5 mr-2" />}
                        {action.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={action.id || idx}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      "rounded-xl cursor-pointer text-xs font-medium",
                      action.variant === "destructive" && "text-destructive hover:bg-destructive/10"
                    )}
                  >
                    {IconComponent && <IconComponent className="size-3.5 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

          {/* 3. Ações de Ciclo de Vida: Status & Arquivo */}
          {hasStatusActions && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              {onToggleStatus && (
                <DropdownMenuItem onClick={onToggleStatus} className="rounded-xl cursor-pointer text-xs font-medium">
                  {StatusIcon ? (
                    <StatusIcon className="size-3.5 mr-2 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-2 text-emerald-500" />
                  )}
                  {statusLabel || "Alternar Visibilidade"}
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive} className="rounded-xl cursor-pointer text-xs font-medium">
                  <Archive className="size-3.5 mr-2 text-muted-foreground" />
                  {archiveLabel || `Arquivar ${entityName}`}
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* 4. Ação Destrutiva Final: Excluir */}
          {hasDestructiveAction && (
            <>
              <DropdownMenuSeparator className="my-1 bg-border/50" />
              <DropdownMenuItem
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-xl cursor-pointer text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" />
                Excluir {entityName}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo Canônico de Confirmação de Exclusão */}
      {hasDestructiveAction && (
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/60">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {deleteConfirmTitle || `Excluir ${entityName}?`}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {deleteConfirmDescription || deleteDescription ||
                  `Tem certeza de que deseja excluir este ${entityName.toLowerCase()}? Esta ação removerá o item da vitrine e não poderá ser desfeita.`}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl text-xs h-9 font-semibold gap-1.5 cursor-pointer shadow-2xs"
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
