import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  FileText,
  Copy,
  ExternalLink,
  LayoutTemplate,
  MoreHorizontal,
  Link as LinkIcon,
  Scale,
  Utensils,
  Compass,
  Camera,
  Building2,
  HeartPulse,
  Square,
  Globe,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Label } from "@/components/ui/label";
import { listAdminPages, deletePage } from "@/services/cms.functions";
import { createExperienceDocument, duplicateExperienceDocument } from "@/services/builder.functions";
import { NICHE_TEMPLATE_MATRIX } from "@/components/builder/templates";

export const Route = createFileRoute("/workspace/cms/paginas/")({
  head: () => ({ meta: [{ title: "Páginas | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await listAdminPages();
      return res || [];
    } catch (err) {
      console.error("[loader:workspace.cms.paginas.index] Unhandled loader error:", err);
      return [];
    }
  },
  component: CmsPagesPage,
});

const TEMPLATE_OPTIONS = [
  {
    id: "blank",
    name: "Em Branco",
    badge: "Livre",
    icon: Square,
    description: "Inicie sem blocos pré-definidos.",
  },
  ...NICHE_TEMPLATE_MATRIX.map((t) => {
    let icon = LayoutTemplate;
    if (t.niche === "legal") icon = Scale;
    if (t.niche === "gastronomy") icon = Utensils;
    if (t.niche === "tourism") icon = Compass;
    if (t.niche === "creators") icon = Camera;
    if (t.niche === "real_estate") icon = Building2;
    if (t.niche === "services") icon = HeartPulse;
    return {
      id: t.id,
      name: t.name,
      badge: t.badge,
      icon,
      description: t.description,
    };
  }),
];

function CmsPagesPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const pages = Route.useLoaderData() || [];
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("blank");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages;
    const term = search.toLowerCase();
    return pages.filter(
      (p: any) =>
        p.title?.toLowerCase().includes(term) ||
        p.slug?.toLowerCase().includes(term)
    );
  }, [pages, search]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setSlug(generatedSlug);
  };

  const handleCreate = async (templateId: string) => {
    const finalTitle = title.trim() || "Nova Página";
    const finalSlug = slug.trim() || `pagina-${Date.now().toString(36)}`;

    setIsSubmitting(true);
    try {
      const res = await createExperienceDocument({
        data: {
          title: finalTitle,
          slug: finalSlug,
          document_type: "campaign",
          template_id: templateId,
        },
      });

      toast.success("Página criada.");
      setIsCreateModalOpen(false);
      setTitle("");
      setSlug("");
      router.invalidate();

      if (res?.data?.document?.id) {
        navigate({
          to: "/workspace/builder/$documentId/editor",
          params: { documentId: res.data.document.id },
        });
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar página.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id);
    try {
      const res = await duplicateExperienceDocument({ data: { id } });
      toast.success("Página duplicada.");
      router.invalidate();
      if (res?.documentId) {
        navigate({
          to: "/workspace/builder/$documentId/editor",
          params: { documentId: res.documentId },
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao duplicar página.");
    } finally {
      setIsDuplicating(null);
    }
  };

  const confirmDelete = async () => {
    if (!pageToDelete) return;
    setIsDeleting(true);
    try {
      await deletePage({ data: { id: pageToDelete.id } });
      toast.success("Página excluída.");
      setPageToDelete(null);
      router.invalidate();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao excluir página.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (pageSlug: string) => {
    const url = `${window.location.origin}/paginas/${pageSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── HEADER SILENCIOSO ── */}
      <PageHeader
        eyebrow="CMS"
        title="Páginas"
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 rounded-lg font-semibold text-xs gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nova Página</span>
          </Button>
        }
      />

      {/* ── BARRA DE PESQUISA COMPACTA ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8.5 h-9 rounded-lg text-xs bg-background border-border/80"
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {filteredPages.length} {filteredPages.length === 1 ? "projeto" : "projetos"}
        </span>
      </div>

      {/* ── EMPTY STATE SILENCIOSO (ZERO TEXTÕES) ── */}
      {filteredPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/80 rounded-lg bg-card/40 text-center p-6">
          <FileText className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-xs font-semibold text-foreground mb-4">
            {search ? "Nenhum resultado." : "Nenhuma página criada."}
          </p>
          {!search && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium"
            >
              <Plus className="size-3.5 mr-1" />
              Nova Página
            </Button>
          )}
        </div>
      ) : (
        /* ── GRID DE PROJETOS SOFTWARE PRO (ESTILO FRAMER / LINEAR) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPages.map((page: any) => {
            const isPublished = page.status === "published";

            return (
              <div
                key={page.id}
                className="group relative flex flex-col bg-card border border-border/80 rounded-lg overflow-hidden shadow-xs hover:border-foreground/30 hover:shadow-md transition-all"
              >
                {/* Viewport Preview / Thumbnail Mock */}
                <div
                  onClick={() =>
                    navigate({
                      to: "/workspace/builder/$documentId/editor",
                      params: { documentId: page.id },
                    })
                  }
                  className="relative aspect-video w-full bg-muted/20 border-b border-border/60 overflow-hidden cursor-pointer flex flex-col justify-between p-3 group-hover:bg-muted/30 transition-colors"
                >
                  {/* Browser Bar Minimalista */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 opacity-40">
                      <div className="size-1.5 rounded-full bg-foreground" />
                      <div className="size-1.5 rounded-full bg-foreground" />
                      <div className="size-1.5 rounded-full bg-foreground" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs font-mono font-medium px-2 py-0 rounded-md border ${
                        isPublished
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border/80"
                      }`}
                    >
                      {isPublished ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>

                  {/* Wireframe Miniatura da Página */}
                  <div className="space-y-2 px-2 opacity-50 group-hover:opacity-75 transition-opacity">
                    <div className="h-2 w-3/4 bg-foreground/20 rounded-sm" />
                    <div className="h-1.5 w-1/2 bg-foreground/15 rounded-sm" />
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <div className="h-4 rounded bg-foreground/10" />
                      <div className="h-4 rounded bg-foreground/10" />
                      <div className="h-4 rounded bg-foreground/10" />
                    </div>
                  </div>

                  {/* Overlay Flutuante com Ação Direta */}
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-xs font-semibold px-3 py-2 rounded-lg bg-foreground text-background shadow-xs flex items-center gap-2">
                      <Edit3 className="size-3.5" />
                      Editar
                    </span>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-2">
                  <div className="min-w-0">
                    <h3
                      onClick={() =>
                        navigate({
                          to: "/workspace/builder/$documentId/editor",
                          params: { documentId: page.id },
                        })
                      }
                      className="text-xs font-bold text-foreground truncate cursor-pointer hover:underline"
                      title={page.title}
                    >
                      {page.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      /{page.slug}
                    </p>
                  </div>

                  {/* Rodapé: Ações e Menu Contextual */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Link
                      to="/paginas/$slug"
                      params={{ slug: page.slug }}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                      title="Abrir página pública"
                    >
                      <Globe className="size-3" />
                      <span>Ver</span>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                          aria-label="Opções"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-lg">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate({
                              to: "/workspace/builder/$documentId/editor",
                              params: { documentId: page.id },
                            })
                          }
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <Edit3 className="size-3.5" />
                          <span>Editar</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleCopyLink(page.slug)}
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <LinkIcon className="size-3.5" />
                          <span>Copiar Link</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDuplicate(page.id)}
                          disabled={isDuplicating === page.id}
                          className="text-xs gap-2 cursor-pointer"
                        >
                          <Copy className="size-3.5" />
                          <span>Duplicar</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setPageToDelete({ id: page.id, title: page.title })}
                          className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CRIAÇÃO VISUAL DE PROJETOS (FASE 3 - DESKTOP MODAL VS MOBILE BOTTOM SHEET) ── */}
      {isMobile ? (
        <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-lg p-5 flex flex-col">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-sm font-bold tracking-tight">Nova Página</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Nome do projeto</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Lançamento de Verão"
                  className="h-10 rounded-lg text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Toque num modelo para criar
                </Label>
                <div className="space-y-2">
                  {TEMPLATE_OPTIONS.map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleCreate(tpl.id)}
                        className="p-4 rounded-lg border border-border/80 bg-card active:bg-muted/60 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-foreground truncate">{tpl.name}</h4>
                              <span className="text-xs font-medium px-2 py-0.2 rounded bg-muted/80 text-muted-foreground">
                                {tpl.badge}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {tpl.description}
                            </p>
                          </div>
                        </div>
                        <Plus className="size-4 text-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-xl rounded-lg p-5 border-border/80">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-sm font-bold tracking-tight">Nova Página</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Nome do projeto</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Lançamento de Verão"
                  className="h-9 rounded-lg text-xs mt-1"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Escolha o modelo inicial
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1">
                  {TEMPLATE_OPTIONS.map((tpl) => {
                    const Icon = tpl.icon;
                    const isSelected = selectedTemplateId === tpl.id;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-foreground bg-muted/40 shadow-xs"
                            : "border-border/80 bg-card hover:border-foreground/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="size-7 rounded-lg bg-muted flex items-center justify-center">
                              <Icon className="size-3.5 text-foreground" />
                            </div>
                            <span className="text-xs font-medium px-2 py-1 rounded bg-muted/80 text-muted-foreground">
                              {tpl.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{tpl.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-3 rounded-lg text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleCreate(selectedTemplateId)}
                  className="h-9 px-4 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    "Criar Página"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIÁLOGO DE EXCLUSÃO SILENCIOSO ── */}
      <AlertDialog open={Boolean(pageToDelete)} onOpenChange={(open) => { if (!open) setPageToDelete(null); }}>
        <AlertDialogContent className="max-w-sm rounded-lg p-5 border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              Excluir página?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              A página <strong className="text-foreground">"{pageToDelete?.title}"</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-3 gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-9 px-3 rounded-lg text-xs font-medium"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="h-9 px-3 rounded-lg text-xs font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
